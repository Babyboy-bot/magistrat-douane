"""
Notification models for real-time notifications.
"""
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

User = get_user_model()

class Notification(models.Model):
    """Real-time notification model."""
    
    TYPE_CHOICES = [
        ('info', 'Information'),
        ('success', 'Succès'),
        ('warning', 'Avertissement'),
        ('error', 'Erreur'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Basse'),
        ('medium', 'Moyenne'),
        ('high', 'Haute'),
        ('urgent', 'Urgente'),
    ]
    
    title = models.CharField("Titre", max_length=200)
    message = models.TextField("Message")
    type = models.CharField("Type", max_length=20, choices=TYPE_CHOICES, default='info')
    priority = models.CharField("Priorité", max_length=20, choices=PRIORITY_CHOICES, default='medium')
    
    # Relations
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='notifications',
        verbose_name="Utilisateur"
    )
    
    # Metadata
    created_at = models.DateTimeField("Créé le", auto_now_add=True)
    read_at = models.DateTimeField("Lu le", null=True, blank=True)
    expires_at = models.DateTimeField("Expire le", null=True, blank=True)
    
    # Additional data (JSON field for extra info)
    data = models.JSONField("Données supplémentaires", default=dict, blank=True)
    
    class Meta:
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['read_at']),
            models.Index(fields=['type']),
            models.Index(fields=['priority']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.user}"
    
    @property
    def is_read(self):
        return self.read_at is not None
    
    @property
    def is_expired(self):
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False
    
    def mark_as_read(self):
        """Mark notification as read."""
        self.read_at = timezone.now()
        self.save(update_fields=['read_at'])
    
    @classmethod
    def create_notification(cls, user_id, title, message, type='info', priority='medium', data=None, expires_in=None):
        """Create a notification for a user."""
        notification = cls.objects.create(
            user_id=user_id,
            title=title,
            message=message,
            type=type,
            priority=priority,
            data=data or {}
        )
        
        if expires_in:
            notification.expires_at = timezone.now() + timedelta(minutes=expires_in)
            notification.save()
        
        return notification
    
    @classmethod
    def create_bulk_notifications(cls, users, title, message, type='info', priority='medium', data=None, expires_in=None):
        """Create notifications for multiple users."""
        expires_at = None
        if expires_in:
            expires_at = timezone.now() + timedelta(minutes=expires_in)
        notifications = []
        for user in users:
            notifications.append(cls(
                user=user,
                title=title,
                message=message,
                type=type,
                priority=priority,
                data=data or {},
                expires_at=expires_at,
            ))
        return cls.objects.bulk_create(notifications)
    
    @classmethod
    def get_unread_count(cls, user):
        """Get unread notifications count for a user."""
        return cls.objects.filter(user=user, read_at__isnull=True).count()
    
    @classmethod
    def get_recent_notifications(cls, user, limit=10):
        """Get recent notifications for a user."""
        return cls.objects.filter(
            user=user
        ).order_by('-created_at')[:limit]
