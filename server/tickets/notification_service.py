"""
Notification service for sending real-time notifications via channels layer.
Handles broadcasting to managers and specific users.
"""
import json
from asgiref.sync import async_to_sync
from django.conf import settings
from channels.layers import get_channel_layer
from datetime import datetime


class NotificationService:
    """Service for sending real-time notifications"""

    def __init__(self):
        self.channel_layer = get_channel_layer()

    def send_to_managers(self, notification_type, title, message, ticket_id=None, data=None):
        """
        Send notification to all connected managers (global notification).
        Used for monitoring all employee activities.
        """
        payload = {
            'type': notification_type,
            'title': title,
            'message': message,
            'ticket_id': ticket_id,
            'timestamp': datetime.now().isoformat(),
            'data': data or {},
            'is_global': True,
        }

        async_to_sync(self.channel_layer.group_send)(
            'managers_notifications',
            {
                **payload,
                'type': notification_type.lower(),  # channels requires lowercase function names
            }
        )
        print(f"📢 Broadcast to managers: {title}")

    def send_to_user(self, user_id, notification_type, title, message, ticket_id=None, data=None):
        """
        Send notification to a specific user.
        Used for personal notifications (assigned tickets, mentions, etc).
        """
        payload = {
            'type': notification_type,
            'title': title,
            'message': message,
            'ticket_id': ticket_id,
            'timestamp': datetime.now().isoformat(),
            'data': data or {},
            'is_global': False,
        }

        async_to_sync(self.channel_layer.group_send)(
            f'user_notifications_{user_id}',
            {
                **payload,
                'type': notification_type.lower(),  # channels requires lowercase function names
            }
        )
        print(f"📨 Notification to user {user_id}: {title}")

    def send_to_all_users(self, notification_type, title, message, ticket_id=None, data=None):
        """
        Send notification to all connected users (managers + employees).
        """
        self.send_to_managers(notification_type, title, message, ticket_id, data)
        # Note: Employees only get personal notifications, not global ones by default

    # ============ SPECIFIC NOTIFICATION METHODS ============

    def ticket_created(self, ticket, created_by):
        """Notify managers when a new ticket is created"""
        self.send_to_managers(
            'ticket_created',
            'New Ticket Created',
            f"{created_by.first_name} created ticket: {ticket.title}",
            ticket_id=ticket.id,
            data={
                'ticket_id': ticket.id,
                'ticket_title': ticket.title,
                'created_by_id': created_by.id,
                'created_by_name': created_by.get_full_name() or created_by.username,
                'created_at': ticket.created_at.isoformat(),
                'priority': ticket.priority,
                'category': ticket.category,
            }
        )

    def ticket_updated(self, ticket, changed_by, old_status=None, new_status=None):
        """Notify managers and assignee when ticket is updated"""
        # Notify all managers (global monitoring)
        self.send_to_managers(
            'ticket_updated',
            'Ticket Updated',
            f"{changed_by.first_name} updated ticket #{ticket.id}: {ticket.title}",
            ticket_id=ticket.id,
            data={
                'ticket_id': ticket.id,
                'ticket_title': ticket.title,
                'changed_by_id': changed_by.id,
                'changed_by_name': changed_by.get_full_name() or changed_by.username,
                'old_status': old_status,
                'new_status': new_status,
                'updated_at': ticket.updated_at.isoformat(),
            }
        )

        # Notify assignee if they're not the one making the change
        if ticket.assigned_to and ticket.assigned_to.id != changed_by.id:
            self.send_to_user(
                ticket.assigned_to.id,
                'ticket_updated',
                'Your Ticket Updated',
                f"{changed_by.first_name} updated your ticket: {ticket.title}",
                ticket_id=ticket.id,
            )

    def ticket_assigned(self, ticket, assigned_to, assigned_by):
        """Notify assignee when they're assigned a ticket"""
        # Notify all managers (global monitoring)
        self.send_to_managers(
            'ticket_assigned',
            'Ticket Assigned',
            f"{assigned_by.first_name} assigned ticket #{ticket.id} to {assigned_to.first_name}",
            ticket_id=ticket.id,
            data={
                'ticket_id': ticket.id,
                'ticket_title': ticket.title,
                'assigned_to_id': assigned_to.id,
                'assigned_to_name': assigned_to.get_full_name() or assigned_to.username,
                'assigned_by_id': assigned_by.id,
                'assigned_by_name': assigned_by.get_full_name() or assigned_by.username,
            }
        )

        # Notify the person being assigned
        self.send_to_user(
            assigned_to.id,
            'ticket_assigned',
            'New Ticket Assigned',
            f"{assigned_by.first_name} assigned you: {ticket.title}",
            ticket_id=ticket.id,
        )

    def ticket_resolved(self, ticket, resolved_by):
        """Notify relevant users when ticket is resolved"""
        # Notify all managers (global monitoring)
        self.send_to_managers(
            'ticket_resolved',
            'Ticket Resolved',
            f"{resolved_by.first_name} resolved ticket #{ticket.id}: {ticket.title}",
            ticket_id=ticket.id,
            data={
                'ticket_id': ticket.id,
                'ticket_title': ticket.title,
                'resolved_by_id': resolved_by.id,
                'resolved_by_name': resolved_by.get_full_name() or resolved_by.username,
                'resolved_at': ticket.resolved_at.isoformat() if ticket.resolved_at else None,
            }
        )

        # Notify creator
        if ticket.created_by.id != resolved_by.id:
            self.send_to_user(
                ticket.created_by.id,
                'ticket_resolved',
                'Your Ticket Resolved',
                f"{resolved_by.first_name} resolved your ticket: {ticket.title}",
                ticket_id=ticket.id,
            )

    def ticket_deleted(self, ticket, deleted_by):
        """Notify managers when ticket is deleted"""
        self.send_to_managers(
            'ticket_deleted',
            'Ticket Deleted',
            f"{deleted_by.first_name} deleted ticket #{ticket.id}: {ticket.title}",
            ticket_id=ticket.id,
            data={
                'ticket_id': ticket.id,
                'ticket_title': ticket.title,
                'deleted_by_id': deleted_by.id,
                'deleted_by_name': deleted_by.get_full_name() or deleted_by.username,
            }
        )

    def comment_added(self, ticket, comment, commented_by):
        """Notify relevant users when comment is added"""
        # Notify all managers (global monitoring)
        self.send_to_managers(
            'comment_added',
            'Comment Added',
            f"{commented_by.first_name} commented on ticket #{ticket.id}",
            ticket_id=ticket.id,
            data={
                'ticket_id': ticket.id,
                'ticket_title': ticket.title,
                'commented_by_id': commented_by.id,
                'commented_by_name': commented_by.get_full_name() or commented_by.username,
                'comment_text': comment.text[:100],  # First 100 chars
                'is_internal': comment.is_internal,
            }
        )

        # Notify assignee if they're not the commenter
        if ticket.assigned_to and ticket.assigned_to.id != commented_by.id:
            self.send_to_user(
                ticket.assigned_to.id,
                'comment_added',
                'New Comment on Your Ticket',
                f"{commented_by.first_name} commented: {comment.text[:50]}...",
                ticket_id=ticket.id,
            )


# Global instance
notification_service = NotificationService()
