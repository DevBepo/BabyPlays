from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework import serializers

from .models import Cliente


MENSAGEM_LOGIN_INVALIDO = "E-mail ou senha invalidos."


def normalizar_email(email):
    email = str(email or "").strip()
    return get_user_model().objects.normalize_email(email).lower()


class ClienteResumoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = ("id", "nome", "telefone", "ativo")
        read_only_fields = fields


class UserResumoSerializer(serializers.ModelSerializer):
    class Meta:
        model = get_user_model()
        fields = ("id", "email")
        read_only_fields = fields


class AuthClienteSerializer(serializers.Serializer):
    authenticated = serializers.BooleanField(read_only=True)
    user = UserResumoSerializer(read_only=True)
    cliente = ClienteResumoSerializer(read_only=True, allow_null=True)


class AtualizarAuthClienteSerializer(serializers.Serializer):
    nome = serializers.CharField(max_length=200, trim_whitespace=True, required=False)
    telefone = serializers.CharField(max_length=30, trim_whitespace=True, required=False)
    email = serializers.EmailField(max_length=150, required=False)

    def validate_email(self, value):
        email = normalizar_email(value)
        user = self.context["request"].user
        User = get_user_model()

        email_em_uso = User.objects.filter(email__iexact=email).exclude(pk=user.pk).exists()
        username_em_uso = (
            User.objects.filter(username__iexact=email).exclude(pk=user.pk).exists()
        )

        if email_em_uso or username_em_uso:
            raise serializers.ValidationError("E-mail ja cadastrado.")

        return email

    def validate(self, attrs):
        attrs = super().validate(attrs)
        user = self.context["request"].user

        if not hasattr(user, "cliente"):
            dados_pessoais_enviados = {"nome", "telefone"}.intersection(attrs)
            campos_ausentes = {"nome", "telefone"}.difference(attrs)

            if dados_pessoais_enviados and campos_ausentes:
                raise serializers.ValidationError(
                    {
                        campo: "Informe nome e telefone para completar seu cadastro."
                        for campo in campos_ausentes
                    }
                )

        return attrs

    @transaction.atomic
    def save(self):
        user = self.context["request"].user
        validated_data = self.validated_data

        email = validated_data.get("email")
        if email:
            user.email = email
            user.username = email
            user.save(update_fields=["email", "username"])

        cliente = getattr(user, "cliente", None)
        if cliente is None and {"nome", "telefone"}.issubset(validated_data):
            cliente = Cliente.objects.create(
                user=user,
                nome=validated_data["nome"],
                telefone=validated_data["telefone"],
            )
            user.cliente = cliente
        elif cliente:
            update_fields = []

            if "nome" in validated_data:
                cliente.nome = validated_data["nome"]
                update_fields.append("nome")

            if "telefone" in validated_data:
                cliente.telefone = validated_data["telefone"]
                update_fields.append("telefone")

            if update_fields:
                update_fields.append("atualizado_em")
                cliente.save(update_fields=update_fields)

        return user


class AlterarSenhaSerializer(serializers.Serializer):
    senha_atual = serializers.CharField(write_only=True, trim_whitespace=False)
    nova_senha = serializers.CharField(write_only=True, trim_whitespace=False)
    confirmacao_nova_senha = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    def validate_senha_atual(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("A senha atual esta incorreta.")
        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        nova_senha = attrs["nova_senha"]

        if nova_senha != attrs["confirmacao_nova_senha"]:
            raise serializers.ValidationError(
                {"confirmacao_nova_senha": "A confirmacao da nova senha nao confere."}
            )

        try:
            validate_password(nova_senha, user=self.context["request"].user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"nova_senha": exc.messages}) from exc

        return attrs

    def save(self):
        user = self.context["request"].user
        user.set_password(self.validated_data["nova_senha"])
        user.save(update_fields=["password"])
        return user


class SolicitarRecuperacaoSenhaSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=150)

    def validate_email(self, value):
        return normalizar_email(value)


class RedefinirSenhaSerializer(serializers.Serializer):
    uid = serializers.CharField(max_length=256, trim_whitespace=True)
    token = serializers.CharField(max_length=256, trim_whitespace=True)
    nova_senha = serializers.CharField(write_only=True, trim_whitespace=False)
    confirmacao_nova_senha = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    default_error_messages = {
        "invalid_link": "O link de recuperacao e invalido ou expirou.",
    }

    def _obter_usuario(self, uid):
        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            return get_user_model().objects.get(pk=user_id, is_active=True)
        except (TypeError, ValueError, OverflowError, get_user_model().DoesNotExist):
            self.fail("invalid_link")

    def validate(self, attrs):
        attrs = super().validate(attrs)
        user = self._obter_usuario(attrs["uid"])

        if not default_token_generator.check_token(user, attrs["token"]):
            self.fail("invalid_link")

        if attrs["nova_senha"] != attrs["confirmacao_nova_senha"]:
            raise serializers.ValidationError(
                {"confirmacao_nova_senha": "A confirmacao da nova senha nao confere."}
            )

        try:
            validate_password(attrs["nova_senha"], user=user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"nova_senha": exc.messages}) from exc

        attrs["user"] = user
        return attrs

    @transaction.atomic
    def save(self):
        user = (
            get_user_model()
            .objects.select_for_update()
            .get(pk=self.validated_data["user"].pk)
        )

        if not default_token_generator.check_token(user, self.validated_data["token"]):
            self.fail("invalid_link")

        user.set_password(self.validated_data["nova_senha"])
        user.save(update_fields=["password"])
        return user


class AdminMeSerializer(serializers.ModelSerializer):
    nome = serializers.SerializerMethodField()

    class Meta:
        model = get_user_model()
        fields = ("id", "email", "nome", "is_staff", "is_superuser")
        read_only_fields = fields

    def get_nome(self, user):
        nome = user.get_full_name().strip()
        return nome or None


class CadastroClienteSerializer(serializers.Serializer):
    nome = serializers.CharField(max_length=200, trim_whitespace=True)
    email = serializers.EmailField(max_length=150)
    telefone = serializers.CharField(max_length=30, trim_whitespace=True)
    senha = serializers.CharField(write_only=True, trim_whitespace=False)
    confirmacao_senha = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_email(self, value):
        email = normalizar_email(value)
        User = get_user_model()
        if User.objects.filter(username__iexact=email).exists():
            raise serializers.ValidationError("E-mail ja cadastrado.")
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("E-mail ja cadastrado.")
        return email

    def validate(self, attrs):
        attrs = super().validate(attrs)
        senha = attrs.get("senha")
        confirmacao_senha = attrs.get("confirmacao_senha")

        if senha != confirmacao_senha:
            raise serializers.ValidationError(
                {"confirmacao_senha": "A confirmacao de senha nao confere."}
            )

        try:
            validate_password(senha)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"senha": exc.messages}) from exc
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        User = get_user_model()
        user = User.objects.create_user(
            username=validated_data["email"],
            email=validated_data["email"],
            password=validated_data["senha"],
        )
        Cliente.objects.create(
            user=user,
            nome=validated_data["nome"],
            telefone=validated_data["telefone"],
        )
        return user


class LoginClienteSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=150)
    senha = serializers.CharField(write_only=True, trim_whitespace=False)

    default_error_messages = {
        "invalid_credentials": MENSAGEM_LOGIN_INVALIDO,
    }

    def validate_email(self, value):
        return normalizar_email(value)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        request = self.context.get("request")
        email = attrs["email"]
        senha = attrs["senha"]
        User = get_user_model()

        user = User.objects.filter(username__iexact=email).first()
        if user is None:
            user = User.objects.filter(email__iexact=email).first()

        if user is None:
            self.fail("invalid_credentials")

        authenticated_user = authenticate(
            request=request,
            username=user.get_username(),
            password=senha,
        )
        if authenticated_user is None:
            self.fail("invalid_credentials")
        if (
            not authenticated_user.is_staff
            and not authenticated_user.is_superuser
            and not hasattr(authenticated_user, "cliente")
        ):
            self.fail("invalid_credentials")

        attrs["user"] = authenticated_user
        return attrs
