from django.urls import path
from .views import NotificationListView, NotificationMarkReadView, NotificationMarkAllReadView, OnlineUsersView

urlpatterns = [
    path("notifications/", NotificationListView.as_view(), name="notifications-list"),
    path("notifications/<int:pk>/read/", NotificationMarkReadView.as_view(), name="notifications-read"),
    path("notifications/read-all/", NotificationMarkAllReadView.as_view(), name="notifications-read-all"),
    path("online-users/", OnlineUsersView.as_view(), name="online-users"),
]
