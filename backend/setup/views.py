from rest_framework import status
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView


class CookieTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        if response.status_code != status.HTTP_200_OK:
            return response

        access_token = response.data.get("access")
        refresh_token = response.data.get("refresh")

        clean_response = Response(
            {"message": "Login realizado"},
            status=status.HTTP_200_OK,
        )

        if access_token:
            clean_response.set_cookie(
                key="access_token",
                value=access_token,
                httponly=True,
                samesite="Lax",
                secure=False,
            )

        if refresh_token:
            clean_response.set_cookie(
                key="refresh_token",
                value=refresh_token,
                httponly=True,
                samesite="Lax",
                secure=False,
            )

        return clean_response
