from django.conf import settings as conf
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.cache import cache
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Q
from rest_framework import generics, permissions, status, serializers as drf_serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
import json
import re

from core.permissions import IsAgentOrAdmin
from notifications.emails import send_welcome_email
from .serializers import (
    UserSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
    UserProfileSerializer,
    VerifyUserSerializer,
    ChangePasswordSerializer,
    PasswordResetConfirmSerializer,
    AgentCreateClientSerializer,
    AdminCreateAgentSerializer,
    UserAuditLogSerializer,
)
from .throttles import LoginRateThrottle
from .audit import (
    log_login_success,
    log_login_failed,
    log_logout,
    log_register,
    log_verify,
    log_password_change,
    log_user_action,
    get_client_ip,
)

from .models import UserAuditLog

User = get_user_model()


# ── Helpers ──

def _set_auth_cookies(response, access: str, refresh: str):
    """Set httpOnly cookies for both tokens."""
    response.set_cookie(
        conf.ACCESS_TOKEN_COOKIE,
        access,
        max_age=conf.ACCESS_COOKIE_MAX_AGE,
        httponly=conf.COOKIE_HTTPONLY,
        secure=conf.COOKIE_SECURE,
        samesite=conf.COOKIE_SAMESITE,
        path=conf.COOKIE_PATH,
    )
    response.set_cookie(
        conf.REFRESH_TOKEN_COOKIE,
        refresh,
        max_age=conf.REFRESH_COOKIE_MAX_AGE,
        httponly=conf.COOKIE_HTTPONLY,
        secure=conf.COOKIE_SECURE,
        samesite=conf.COOKIE_SAMESITE,
        path=conf.COOKIE_PATH,
    )
    return response


def _clear_auth_cookies(response):
    """Delete both auth cookies."""
    response.delete_cookie(conf.ACCESS_TOKEN_COOKIE, path=conf.COOKIE_PATH, samesite=conf.COOKIE_SAMESITE)
    response.delete_cookie(conf.REFRESH_TOKEN_COOKIE, path=conf.COOKIE_PATH, samesite=conf.COOKIE_SAMESITE)
    return response


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "admin"


# ── Auth views ──

@method_decorator(csrf_exempt, name='dispatch')
class CookieLoginView(APIView):
    """Authenticate and set JWT tokens as httpOnly cookies."""
    permission_classes = [permissions.AllowAny]
    throttle_classes = [LoginRateThrottle]

    class InputSerializer(drf_serializers.Serializer):
        identifier = drf_serializers.CharField()
        password = drf_serializers.CharField()

    def post(self, request):
        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ip = get_client_ip(request)
        identifier = serializer.validated_data["identifier"].strip()

        # Lookup par email ou numéro de téléphone
        if "@" in identifier:
            user = User.objects.filter(email__iexact=identifier).first()
        else:
            # Normaliser le numéro (supprimer espaces, tirets, points, parenthèses)
            phone = re.sub(r'[\s\-\.\(\)\+]', '', identifier)
            user = User.objects.filter(telephone=phone).first()
            if not user:
                user = User.objects.filter(telephone2=phone).first()
        
        if not user or not user.check_password(serializer.validated_data["password"]):
            log_login_failed(identifier, ip)
            raise AuthenticationFailed("Identifiants incorrects")
        
        if not user.is_active:
            log_login_failed(identifier, ip)
            return Response(
                {"detail": "Ce compte a été désactivé"},
                status=status.HTTP_403_FORBIDDEN,
            )

        refresh = RefreshToken.for_user(user)
        user.last_login = timezone.now()
        user.save(update_fields=["last_login"])
        log_login_success(user, ip)

        user_data = UserSerializer(user).data
        
        response = Response(user_data)
        return _set_auth_cookies(response, str(refresh.access_token), str(refresh))


@method_decorator(csrf_exempt, name='dispatch')
class CookieRefreshView(APIView):
    """Read refresh token from cookie, rotate it, set new cookies."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        # Le refresh token doit venir uniquement du cookie httpOnly
        raw_refresh = request.COOKIES.get(conf.REFRESH_TOKEN_COOKIE)
        
        if not raw_refresh:
            return Response(
                {"detail": "Refresh token manquant"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        try:
            old_token = RefreshToken(raw_refresh)
            old_token.blacklist()
            user = User.objects.get(id=old_token["user_id"])
            new_refresh = RefreshToken.for_user(user)
            response = Response({
                "detail": "Token rafraîchi",
            })
            return _set_auth_cookies(response, str(new_refresh.access_token), str(new_refresh))
        except (TokenError, User.DoesNotExist):
            response = Response(
                {"detail": "Session expirée"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            return _clear_auth_cookies(response)


@method_decorator(csrf_exempt, name='dispatch')
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserCreateSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [LoginRateThrottle]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        log_register(user, get_client_ip(request))
        log_user_action(user, user, "creation", {"role": user.role}, ip=get_client_ip(request))
        send_welcome_email(user)
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


@method_decorator(csrf_exempt, name='dispatch')
class LogoutView(APIView):
    """Blacklist refresh token and clear cookies."""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        raw_refresh = request.COOKIES.get(conf.REFRESH_TOKEN_COOKIE)
        if raw_refresh:
            try:
                token = RefreshToken(raw_refresh)
                user_id = token.get("user_id")
                token.blacklist()
                if user_id:
                    user_obj = User.objects.filter(pk=user_id).first()
                    if user_obj:
                        log_logout(user_obj, get_client_ip(request))
            except TokenError:
                pass
        response = Response({"detail": "Déconnecté"}, status=status.HTTP_200_OK)
        return _clear_auth_cookies(response)


# ── Profile views ──

class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return UserProfileSerializer
        return UserSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", request.method == "PATCH")
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(UserSerializer(instance, context={"request": request}).data)

    def perform_update(self, serializer):
        instance = serializer.save()
        _ip = get_client_ip(self.request)

        if serializer.validated_data.get("password"):
            log_user_action(self.request.user, instance, "password_reset", {}, ip=_ip)


class ChangePasswordView(generics.GenericAPIView):
    serializer_class = ChangePasswordSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save()
        log_password_change(request.user, get_client_ip(request))
        log_user_action(request.user, request.user, "password_reset", {"self": True}, ip=get_client_ip(request))
        return Response({"detail": "Mot de passe modifié avec succès"})


# ── Agent/Admin views ──

class UserListView(generics.ListAPIView):
    """Only agents and admins can list users."""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAgentOrAdmin]

    def list(self, request, *args, **kwargs):
        params = request.query_params.urlencode()
        cache_key = f"user_list_{request.user.id}_{params}"
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)
        response = super().list(request, *args, **kwargs)
        cache.set(cache_key, response.data, timeout=30)
        return response

    def get_queryset(self):
        user = self.request.user
        qs = User.objects.all()
        role = self.request.query_params.get("role")
        if role:
            qs = qs.filter(role=role)
        profession_type = self.request.query_params.get("profession_type")
        if profession_type:
            qs = qs.filter(profession_type=profession_type)
        exclude_profession_type = self.request.query_params.get("exclude_profession_type")
        if exclude_profession_type:
            qs = qs.exclude(profession_type=exclude_profession_type)
        risk_level = self.request.query_params.get("risk_level")
        if risk_level:
            qs = qs.filter(risk_level=risk_level)
        account_status = self.request.query_params.get("account_status")
        if account_status:
            qs = qs.filter(account_status=account_status)
        search = self.request.query_params.get("search")
        if search:
            search = search.strip()
            if search:
                qs = qs.filter(
                    Q(nom__icontains=search)
                    | Q(prenoms__icontains=search)
                    | Q(email__icontains=search)
                    | Q(telephone__icontains=search)
                )
        if user.role == "agent":
            qs = qs.filter(role__in=["client", "prospect"])
        return qs.order_by("-date_joined")


class AgentDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_queryset(self):
        return User.objects.filter(role="agent")

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return UserUpdateSerializer
        return UserSerializer

    def perform_update(self, serializer):
        old_is_active = serializer.instance.is_active
        instance = serializer.save()
        _ip = get_client_ip(self.request)

        if "is_active" in serializer.validated_data and instance.is_active != old_is_active:
            action = "activation" if instance.is_active else "deactivation"
            log_user_action(self.request.user, instance, action, {
                "from": old_is_active,
                "to": instance.is_active,
            }, ip=_ip)

        if serializer.validated_data.get("password"):
            log_user_action(self.request.user, instance, "password_reset", {}, ip=_ip)


class AuditLogListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    serializer_class = UserAuditLogSerializer

    def get_queryset(self):
        qs = UserAuditLog.objects.select_related("performed_by", "target_user").order_by("-created_at")
        user_id = self.request.query_params.get("user_id")
        if user_id:
            qs = qs.filter(target_user_id=user_id)
        action = self.request.query_params.get("action")
        if action:
            qs = qs.filter(action=action)
        return qs


class AuditLogCsvExportView(APIView):
    """Export all audit logs as CSV (admin only)."""
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get(self, request):
        import csv
        from django.http import HttpResponse
        qs = UserAuditLog.objects.select_related("performed_by", "target_user").order_by("-created_at")
        action = request.query_params.get("action")
        if action:
            qs = qs.filter(action=action)

        response = HttpResponse(content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = 'attachment; filename="audit_logs.csv"'
        response.write("\ufeff")  # BOM pour Excel
        writer = csv.writer(response)
        writer.writerow(["Date", "Action", "Effectué par", "Cible", "IP", "Détails"])
        for entry in qs:
            writer.writerow([
                entry.created_at.strftime("%d/%m/%Y %H:%M"),
                entry.get_action_display(),
                entry.performed_by.full_name if entry.performed_by else "Système",
                entry.target_user.full_name if entry.target_user_id else "—",
                entry.ip_address or "—",
                json.dumps(entry.metadata, ensure_ascii=False) if entry.metadata else "",
            ])
        return response


@method_decorator(csrf_exempt, name='dispatch')
class ResetPasswordView(APIView):
    """Reset password for a user by email. Generates a temp password."""
    permission_classes = [permissions.AllowAny]
    throttle_classes = [LoginRateThrottle]

    class InputSerializer(drf_serializers.Serializer):
        identifier = drf_serializers.CharField()

    def post(self, request):
        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        identifier = serializer.validated_data["identifier"].strip()
        user = User.objects.filter(email__iexact=identifier, is_active=True).first()
        if not user:
            normalized = re.sub(r'[\s\-\.\(\)\+]', '', identifier)
            user = User.objects.filter(telephone=normalized, is_active=True).first()
        if user and user.email:
            # Le mot de passe n'est PAS modifié ici : un lien signé à usage unique
            # est envoyé par email. Sans ça, n'importe qui pouvait forcer la
            # réinitialisation (et donc verrouiller) n'importe quel compte.
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            reset_url = f"{conf.FRONTEND_URL}/reset-password?uid={uid}&token={token}"
            try:
                from notifications.emails import send_password_reset_email
                send_password_reset_email(user, reset_url)
            except Exception:
                import logging
                logging.getLogger("accounts").exception("Failed to send password reset email to user %s", user.pk)
        return Response(
            {"detail": "Si un compte correspond à cet identifiant, un lien de réinitialisation a été envoyé par email."},
            status=status.HTTP_200_OK,
        )


@method_decorator(csrf_exempt, name='dispatch')
class ResetPasswordConfirmView(APIView):
    """Confirme la réinitialisation : uid + token signé (usage unique) + nouveau mot de passe."""
    permission_classes = [permissions.AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user = User.objects.get(pk=force_str(urlsafe_base64_decode(serializer.validated_data["uid"])))
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            user = None
        if not user or not default_token_generator.check_token(user, serializer.validated_data["token"]):
            return Response({"detail": "Lien de réinitialisation invalide ou expiré."}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])
        log_password_change(user, get_client_ip(request))
        return Response({"detail": "Mot de passe réinitialisé avec succès."})


class AgentCreateClientView(generics.CreateAPIView):
    """Agent creates a pre-verified client."""
    serializer_class = AgentCreateClientSerializer
    permission_classes = [permissions.IsAuthenticated, IsAgentOrAdmin]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        user.verified_by = request.user
        user.verified_at = timezone.now()
        user.save(update_fields=["verified_by", "verified_at"])
        log_register(user, get_client_ip(request))
        log_user_action(request.user, user, "creation", {"role": user.role})
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class AdminCreateAgentView(generics.CreateAPIView):
    """Admin creates an agent account."""
    serializer_class = AdminCreateAgentSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        log_register(user, get_client_ip(request))
        log_user_action(request.user, user, "creation", {"role": user.role})
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


@api_view(["DELETE", "PATCH"])
@permission_classes([permissions.IsAuthenticated])
def admin_delete_user_view(request, pk):
    if request.user.role != "admin":
        return Response({"detail": "Permission refus\u00e9e"}, status=status.HTTP_403_FORBIDDEN)
    try:
        target = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({"detail": "Utilisateur introuvable"}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == "DELETE":
        if target.role == "admin":
            return Response({"detail": "Impossible de supprimer un administrateur"}, status=status.HTTP_400_BAD_REQUEST)
        name = target.full_name
        target.is_active = False
        target.save(update_fields=["is_active"])
        log_user_action(request.user, target, "deactivation", {"reason": "admin_delete"}, ip=get_client_ip(request))
        return Response({"detail": f"Compte de {name} désactivé"})
    
    elif request.method == "PATCH":
        # Update user fields
        serializer = UserUpdateSerializer(target, data=request.data, partial=True)
        if serializer.is_valid():
            old_is_active = target.is_active
            old_role = target.role
            serializer.save()
            _ip = get_client_ip(request)
            if "is_active" in serializer.validated_data and target.is_active != old_is_active:
                action = "activation" if target.is_active else "deactivation"
                log_user_action(request.user, target, action, {
                    "from": old_is_active,
                    "to": target.is_active,
                }, ip=_ip)
            if "role" in serializer.validated_data and target.role != old_role:
                log_user_action(request.user, target, "role_change", {
                    "from": old_role,
                    "to": target.role,
                }, ip=_ip)
            return Response(UserSerializer(target).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def remind_user_view(request):
    """Agent sends a reminder to a prospect (logs the action)."""
    if request.user.role not in ("agent", "admin"):
        return Response({"detail": "Permission refus\u00e9e"}, status=status.HTTP_403_FORBIDDEN)
    user_id = request.data.get("user_id")
    try:
        target = User.objects.get(pk=user_id)
    except (User.DoesNotExist, ValueError, TypeError):
        return Response({"detail": "Utilisateur introuvable"}, status=status.HTTP_404_NOT_FOUND)
    logger_name = __import__("logging").getLogger("audit")
    logger_name.info(f"REMIND | agent={request.user.email} target={target.email}")
    return Response({"detail": f"Relance envoy\u00e9e \u00e0 {target.full_name}"})


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def verify_user_view(request):
    if request.user.role not in ("agent", "admin"):
        return Response(
            {"detail": "Permission refusée"}, status=status.HTTP_403_FORBIDDEN
        )
    serializer = VerifyUserSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    try:
        target = User.objects.get(id=serializer.validated_data["user_id"])
    except User.DoesNotExist:
        return Response(
            {"detail": "Utilisateur introuvable"}, status=status.HTTP_404_NOT_FOUND
        )

    action = serializer.validated_data["action"]
    try:
        if action == "verify":
            from .services import verify_prospect
            verify_prospect(target, request.user)
            return Response({"detail": f"Compte de {target.full_name} vérifié"})
        else:
            from .services import reject_prospect
            reject_prospect(target, request.user)
            return Response({"detail": "Compte refusé et désactivé"})
    except ValueError as e:
        return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
