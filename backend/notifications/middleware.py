"""
JWT WebSocket middleware — reads access_token cookie from WS handshake headers
and populates scope["user"] so NotificationConsumer can authenticate.
"""
from http.cookies import SimpleCookie

from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

User = get_user_model()


@database_sync_to_async
def get_user_from_token(token_key: str):
    try:
        token = AccessToken(token_key)
        user_id = token["user_id"]
        return User.objects.get(pk=user_id, is_active=True)
    except (InvalidToken, TokenError, User.DoesNotExist, KeyError):
        return AnonymousUser()


class JWTCookieMiddleware:
    """
    ASGI middleware that authenticates WebSocket connections via the
    access_token httpOnly cookie set by CookieJWTAuthentication.
    """

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        if scope["type"] == "websocket":
            headers = dict(scope.get("headers", []))
            cookie_header = headers.get(b"cookie", b"").decode("latin1")
            cookie = SimpleCookie()
            cookie.load(cookie_header)

            token_key = cookie.get("access_token")
            if token_key:
                scope["user"] = await get_user_from_token(token_key.value)
            else:
                scope["user"] = AnonymousUser()

        return await self.inner(scope, receive, send)
