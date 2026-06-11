"""
Audit Logging Service
Centralizes all audit log creation to ensure consistent logging across the app
"""

from typing import Optional, Dict, Any
from tickets.models import AuditLog, Ticket
from accounts.models import User
from django.http import HttpRequest


class AuditService:
    """Service for creating and managing audit logs"""

    @staticmethod
    def log_action(
        action_type: str,
        performed_by: Optional[User] = None,
        description: str = "",
        ticket: Optional[Ticket] = None,
        user: Optional[User] = None,
        old_value: Optional[str] = None,
        new_value: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        request: Optional[HttpRequest] = None,
    ) -> AuditLog:
        """
        Log an audit action.

        Args:
            action_type: Type of action (e.g., 'TICKET_CREATED', 'STATUS_CHANGED')
            performed_by: User who performed the action
            description: Description of what happened
            ticket: Related ticket (if any)
            user: Related user (if any)
            old_value: Previous value (for updates)
            new_value: New value (for updates)
            metadata: Additional metadata as dict
            request: Django request object (to extract IP)
        """
        ip_address = None
        if request:
            # Try to get client IP from request
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip_address = x_forwarded_for.split(',')[0].strip()
            else:
                ip_address = request.META.get('REMOTE_ADDR')

        audit_log = AuditLog.objects.create(
            action_type=action_type,
            performed_by=performed_by,
            description=description,
            ticket=ticket,
            user=user,
            old_value=old_value,
            new_value=new_value,
            metadata=metadata or {},
            ip_address=ip_address,
        )

        # 📡 Broadcast real-time update so all clients refresh their audit logs
        from tickets.realtime_service import realtime_service
        realtime_service.broadcast_audit_log_created(audit_log)
        return audit_log

    @staticmethod
    def log_ticket_created(ticket: Ticket, performed_by: User, request: Optional[HttpRequest] = None):
        """Log ticket creation"""
        AuditService.log_action(
            action_type='TICKET_CREATED',
            performed_by=performed_by,
            description=f"Ticket #{ticket.id} created: {ticket.title}",
            ticket=ticket,
            metadata={
                'title': ticket.title,
                'priority': ticket.priority,
                'category_id': ticket.category_id,
            },
            request=request,
        )

    @staticmethod
    def log_status_changed(ticket: Ticket, old_status: str, new_status: str, performed_by: User, request: Optional[HttpRequest] = None):
        """Log ticket status change"""
        AuditService.log_action(
            action_type='STATUS_CHANGED',
            performed_by=performed_by,
            description=f"Ticket #{ticket.id} status changed: {old_status} → {new_status}",
            ticket=ticket,
            old_value=old_status,
            new_value=new_status,
            metadata={'ticket_id': ticket.id},
            request=request,
        )

    @staticmethod
    def log_ticket_assigned(ticket: Ticket, assigned_to: User, performed_by: User, request: Optional[HttpRequest] = None):
        """Log ticket assignment"""
        AuditService.log_action(
            action_type='TICKET_ASSIGNED',
            performed_by=performed_by,
            description=f"Ticket #{ticket.id} assigned to {assigned_to.username}",
            ticket=ticket,
            old_value=str(ticket.assigned_to) if ticket.assigned_to else "Unassigned",
            new_value=assigned_to.username,
            metadata={'assignee_id': assigned_to.id},
            request=request,
        )

    @staticmethod
    def log_comment_added(ticket: Ticket, performed_by: User, request: Optional[HttpRequest] = None):
        """Log comment creation"""
        AuditService.log_action(
            action_type='COMMENT_ADDED',
            performed_by=performed_by,
            description=f"Comment added to ticket #{ticket.id}",
            ticket=ticket,
            request=request,
        )

    @staticmethod
    def log_attachment_added(ticket: Ticket, performed_by: User, request: Optional[HttpRequest] = None):
        """Log attachment upload"""
        AuditService.log_action(
            action_type='ATTACHMENT_ADDED',
            performed_by=performed_by,
            description=f"Attachment added to ticket #{ticket.id}",
            ticket=ticket,
            request=request,
        )

    @staticmethod
    def log_ticket_updated(ticket: Ticket, performed_by: User, request: Optional[HttpRequest] = None):
        """Log ticket update"""
        AuditService.log_action(
            action_type='TICKET_UPDATED',
            performed_by=performed_by,
            description=f"Ticket #{ticket.id} updated: {ticket.title}",
            ticket=ticket,
            metadata={
                'title': ticket.title,
                'priority': ticket.priority,
                'category_id': ticket.category_id,
            },
            request=request,
        )

    @staticmethod
    def log_ticket_deleted(ticket_id: int, ticket_title: str, performed_by: User, request: Optional[HttpRequest] = None):
        """Log ticket deletion"""
        AuditService.log_action(
            action_type='TICKET_DELETED',
            performed_by=performed_by,
            description=f"Ticket #{ticket_id} deleted: {ticket_title}",
            metadata={
                'ticket_id': ticket_id,
                'title': ticket_title,
            },
            request=request,
        )

    @staticmethod
    def log_user_created(user: User, performed_by: User, request: Optional[HttpRequest] = None):
        """Log user creation"""
        AuditService.log_action(
            action_type='USER_CREATED',
            performed_by=performed_by,
            description=f"User created: {user.username} ({user.role})",
            user=user,
            metadata={
                'username': user.username,
                'email': user.email,
                'role': user.role,
            },
            request=request,
        )

    @staticmethod
    def log_user_role_changed(user: User, old_role: str, new_role: str, performed_by: User, request: Optional[HttpRequest] = None):
        """Log user role change"""
        AuditService.log_action(
            action_type='USER_ROLE_CHANGED',
            performed_by=performed_by,
            description=f"User {user.username} role changed: {old_role} → {new_role}",
            user=user,
            old_value=old_role,
            new_value=new_role,
            request=request,
        )

    @staticmethod
    def log_attachment_deleted(ticket, filename: str, performed_by: User, request: Optional[HttpRequest] = None):
        """Log attachment deletion"""
        AuditService.log_action(
            action_type='ATTACHMENT_DELETED',
            performed_by=performed_by,
            description=f"Attachment '{filename}' deleted from ticket #{ticket.id}",
            ticket=ticket,
            old_value=filename,
            metadata={'filename': filename, 'ticket_id': ticket.id},
            request=request,
        )

    @staticmethod
    def log_category_created(category, performed_by: User, request: Optional[HttpRequest] = None):
        """Log category creation"""
        AuditService.log_action(
            action_type='CATEGORY_CREATED',
            performed_by=performed_by,
            description=f"Category '{category.name}' created",
            metadata={'category_id': category.id, 'name': category.name},
            request=request,
        )

    @staticmethod
    def log_category_updated(category, changed_fields: Dict[str, Any], performed_by: User, request: Optional[HttpRequest] = None):
        """Log category update"""
        AuditService.log_action(
            action_type='CATEGORY_UPDATED',
            performed_by=performed_by,
            description=f"Category '{category.name}' updated",
            metadata={'category_id': category.id, 'changed_fields': changed_fields},
            request=request,
        )

    @staticmethod
    def log_category_deleted(category_id: int, category_name: str, performed_by: User, request: Optional[HttpRequest] = None):
        """Log category deletion"""
        AuditService.log_action(
            action_type='CATEGORY_DELETED',
            performed_by=performed_by,
            description=f"Category '{category_name}' deleted",
            metadata={'category_id': category_id, 'name': category_name},
            request=request,
        )

    @staticmethod
    def log_tag_created(tag, performed_by: User, request: Optional[HttpRequest] = None):
        """Log tag creation"""
        AuditService.log_action(
            action_type='TAG_CREATED',
            performed_by=performed_by,
            description=f"Tag '#{tag.name}' created",
            metadata={'tag_id': tag.id, 'name': tag.name},
            request=request,
        )

    @staticmethod
    def log_tag_updated(tag, changed_fields: Dict[str, Any], performed_by: User, request: Optional[HttpRequest] = None):
        """Log tag update"""
        AuditService.log_action(
            action_type='TAG_UPDATED',
            performed_by=performed_by,
            description=f"Tag '#{tag.name}' updated",
            metadata={'tag_id': tag.id, 'changed_fields': changed_fields},
            request=request,
        )

    @staticmethod
    def log_tag_deleted(tag_id: int, tag_name: str, performed_by: User, request: Optional[HttpRequest] = None):
        """Log tag deletion"""
        AuditService.log_action(
            action_type='TAG_DELETED',
            performed_by=performed_by,
            description=f"Tag '#{tag_name}' deleted",
            metadata={'tag_id': tag_id, 'name': tag_name},
            request=request,
        )

    @staticmethod
    def log_user_profile_updated(user: User, changed_fields: Dict[str, Any], performed_by: User, request: Optional[HttpRequest] = None):
        """Log user profile update"""
        AuditService.log_action(
            action_type='USER_PROFILE_UPDATED',
            performed_by=performed_by,
            description=f"User {user.username} profile updated",
            user=user,
            metadata={'changed_fields': changed_fields},
            request=request,
        )

    @staticmethod
    def log_user_password_changed(user: User, request: Optional[HttpRequest] = None):
        """Log password change (no old/new values for security)"""
        AuditService.log_action(
            action_type='USER_PASSWORD_CHANGED',
            performed_by=user,
            description=f"User {user.username} changed their password",
            user=user,
            request=request,
        )

    @staticmethod
    def log_user_deactivated(user: User, performed_by: User, request: Optional[HttpRequest] = None):
        """Log user deactivation"""
        AuditService.log_action(
            action_type='USER_DEACTIVATED',
            performed_by=performed_by,
            description=f"User {user.username} deactivated",
            user=user,
            metadata={'username': user.username, 'email': user.email},
            request=request,
        )


# Export singleton instance
audit_service = AuditService()
