from django.urls import path
from . import views

urlpatterns = [
    path("register/", views.RegisterView.as_view(), name="register"),
    path("reset-password/", views.ResetPasswordView.as_view(), name="reset_password"),
    path("reset-password/confirm/", views.ResetPasswordConfirmView.as_view(), name="reset_password_confirm"),
    path("login/", views.CookieLoginView.as_view(), name="login"),
    path("token/refresh/", views.CookieRefreshView.as_view(), name="token_refresh"),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path("me/", views.MeView.as_view(), name="me"),
    path("me/password/", views.ChangePasswordView.as_view(), name="change_password"),
    path("users/", views.UserListView.as_view(), name="user_list"),
    path("users/verify/", views.verify_user_view, name="verify_user"),
    path("users/create/", views.AgentCreateClientView.as_view(), name="agent_create_client"),
    path("users/remind/", views.remind_user_view, name="remind_user"),
    path("users/<int:pk>/", views.admin_delete_user_view, name="admin_delete_user"),
    path("agents/create/", views.AdminCreateAgentView.as_view(), name="admin_create_agent"),
    path("agents/<int:pk>/", views.AgentDetailView.as_view(), name="agent_detail"),
    path("audit-logs/", views.AuditLogListView.as_view(), name="audit_logs"),
    path("audit-logs/export/", views.AuditLogCsvExportView.as_view(), name="audit_logs_export"),
]
