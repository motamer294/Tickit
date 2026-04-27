from django.db import models
from django.conf import settings
from django.utils import timezone

# ==========================================
# Category Model
# ==========================================
class Category(models.Model):
    """Ticket categories (e.g., Hardware, Software, Network)"""
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=7, default="#007bff")  # Hex color for UI
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name


# ==========================================
# Tag Model
# ==========================================
class Tag(models.Model):
    """Tags for tickets (e.g., #urgent, #frontend, #database)"""
    name = models.CharField(max_length=50, unique=True)
    color = models.CharField(max_length=7, default="#6c757d")  # Hex color for UI
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"#{self.name}"


# ==========================================
# Ticket Model (Updated)
# ==========================================
class Ticket(models.Model):
    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        PENDING = "PENDING", "Pending"
        IN_PROGRESS = "IN_PROGRESS", "In Progress"
        RESOLVED = "RESOLVED", "Resolved"
        CLOSED = "CLOSED", "Closed"

    # Valid state transitions (from_status -> [allowed_to_status])
    VALID_TRANSITIONS = {
        Status.OPEN: [Status.PENDING, Status.IN_PROGRESS, Status.CLOSED],
        Status.PENDING: [Status.OPEN, Status.IN_PROGRESS, Status.CLOSED],
        Status.IN_PROGRESS: [Status.PENDING, Status.RESOLVED, Status.CLOSED],
        Status.RESOLVED: [Status.PENDING, Status.CLOSED],
        Status.CLOSED: [Status.OPEN, Status.PENDING],  # Reopen if needed
    }

    class Priority(models.TextChoices):
        LOW = "LOW", "Low"
        MEDIUM = "MEDIUM", "Medium"
        HIGH = "HIGH", "High"
        URGENT = "URGENT", "Urgent"

    title = models.CharField(max_length=255)
    description = models.TextField()

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN,
        db_index=True
    )

    # Priority (now with choices instead of free-text)
    priority = models.CharField(
        max_length=10,
        choices=Priority.choices,
        default=Priority.MEDIUM,
        db_index=True
    )

    # Category (ForeignKey to Category model)
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tickets",
        db_index=True
    )

    # Tags (Many-to-Many)
    tags = models.ManyToManyField(
        Tag,
        blank=True,
        related_name="tickets"
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="created_tickets"
    )

    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_tickets"
    )

    # ==========================================
    # 🤖 AI Fields (Indexed for Dashboard Analytics)
    # ==========================================
    sentiment = models.CharField(max_length=50, blank=True, null=True)
    ai_suggested_solution = models.TextField(blank=True, null=True)

    # ==========================================
    # ⏱️ Timestamps for SLA & Dashboard
    # ==========================================
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"#{self.id} - {self.title}"

    def can_transition_to(self, new_status):
        """Check if transition from current status to new_status is allowed"""
        if self.status not in self.VALID_TRANSITIONS:
            return False
        return new_status in self.VALID_TRANSITIONS[self.status]

    def get_available_transitions(self):
        """Get list of statuses this ticket can transition to"""
        if self.status not in self.VALID_TRANSITIONS:
            return []
        return self.VALID_TRANSITIONS[self.status]

    def get_available_transitions_display(self):
        """Get display labels for available transitions"""
        available = self.get_available_transitions()
        return [{'status': s, 'label': self.Status(s).label} for s in available]

class Comment(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    text = models.TextField()

    # New: Allows IT agents to leave hidden notes for each other
    is_internal = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        note_type = "Internal Note" if self.is_internal else "Comment"
        return f"{note_type} by {self.author.username} on #{self.ticket.id}"

class TicketHistory(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name="history")
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    old_status = models.CharField(max_length=20)
    new_status = models.CharField(max_length=20)
    changed_at = models.DateTimeField(auto_now_add=True)


class ChatMessage(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name="chat_messages")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    message = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.sender.username}: {self.message[:20]}"


# ==========================================
# Attachment Model
# ==========================================
class Attachment(models.Model):
    """File attachments for tickets"""
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name="attachments"
    )
    file = models.FileField(
        upload_to='tickets/%Y/%m/%d/',
        max_length=255
    )
    filename = models.CharField(max_length=255)
    file_size = models.BigIntegerField()  # In bytes

    # Who uploaded it
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="uploaded_attachments"
    )
    uploaded_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-uploaded_at']
        verbose_name_plural = "Attachments"

    def __str__(self):
        return f"{self.filename} (#{self.ticket.id})"


# ==========================================
# SLA Model (Service Level Agreement)
# ==========================================
class SLA(models.Model):
    """Service Level Agreements define response and resolution times"""
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    # SLA applies to tickets with this priority
    priority = models.CharField(
        max_length=20,
        choices=[
            ('HIGH', 'High'),
            ('MEDIUM', 'Medium'),
            ('LOW', 'Low'),
        ]
    )

    # Optional: SLA applies to specific category
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    # Response time (in hours) - time to first response
    response_time_hours = models.IntegerField(default=4)

    # Resolution time (in hours) - time to resolve ticket
    resolution_time_hours = models.IntegerField(default=24)

    # Is this SLA active?
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['priority', 'response_time_hours']
        unique_together = [['priority', 'category']]
        verbose_name = "SLA"
        verbose_name_plural = "SLAs"

    def __str__(self):
        cat_str = f" - {self.category.name}" if self.category else ""
        return f"{self.name} ({self.priority}){cat_str}"


# ==========================================
# AuditLog Model (Activity Tracking)
# ==========================================
class AuditLog(models.Model):
    """Comprehensive audit log for all ticket and user actions"""
    ACTION_TYPES = [
        ('TICKET_CREATED', 'Ticket Created'),
        ('TICKET_UPDATED', 'Ticket Updated'),
        ('TICKET_ASSIGNED', 'Ticket Assigned'),
        ('STATUS_CHANGED', 'Status Changed'),
        ('COMMENT_ADDED', 'Comment Added'),
        ('ATTACHMENT_ADDED', 'Attachment Added'),
        ('ATTACHMENT_DELETED', 'Attachment Deleted'),
        ('USER_CREATED', 'User Created'),
        ('USER_UPDATED', 'User Updated'),
        ('USER_ROLE_CHANGED', 'User Role Changed'),
        ('OTHER', 'Other'),
    ]

    # What happened
    action_type = models.CharField(max_length=30, choices=ACTION_TYPES)

    # Who did it
    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="audit_logs"
    )

    # What ticket (optional - not all actions are ticket-related)
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="audit_logs"
    )

    # What user (optional - for user management actions)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="user_audit_logs"
    )

    # Description of what changed
    description = models.TextField()

    # Old value (for updates)
    old_value = models.TextField(blank=True, null=True)

    # New value (for updates)
    new_value = models.TextField(blank=True, null=True)

    # Metadata (JSON for flexible data)
    metadata = models.JSONField(default=dict, blank=True)

    # When it happened
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    # IP Address of the user (for security)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['-created_at']),
            models.Index(fields=['action_type', '-created_at']),
            models.Index(fields=['ticket', '-created_at']),
        ]
        verbose_name = "Audit Log"
        verbose_name_plural = "Audit Logs"

    def __str__(self):
        return f"{self.get_action_type_display()} - {self.performed_by} - {self.created_at}"

    @property
    def performed_by_username(self):
        return self.performed_by.username if self.performed_by else None

    @property
    def user_username(self):
        return self.user.username if self.user else None
