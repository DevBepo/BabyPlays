from django.contrib.auth import authenticate, get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
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
