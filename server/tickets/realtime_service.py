"""
Real-time data broadcasting service.
Broadcasts data changes to all connected clients so they can refresh their queries.
"""
import json
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from datetime import datetime


class RealtimeService:
    """Service for broadcasting real-time data changes"""

    def __init__(self):
        self.channel_layer = get_channel_layer()

    def broadcast_ticket_created(self, ticket):
        """Broadcast when a new ticket is created"""
        payload = {
            'type': 'data_changed',
            'event': 'ticket_created',
            'ticketId': ticket.id,
            'title': ticket.title,
            'timestamp': datetime.now().isoformat(),
        }
        
        async_to_sync(self.channel_layer.group_send)(
            'realtime_updates',
            payload
        )
        print(f"🔄 Broadcast: New ticket #{ticket.id}")

    def broadcast_ticket_deleted(self, ticket_id, title):
        """Broadcast when a ticket is deleted"""
        payload = {
            'type': 'data_changed',
            'event': 'ticket_deleted',
            'ticketId': ticket_id,
            'title': title,
            'timestamp': datetime.now().isoformat(),
        }
        
        async_to_sync(self.channel_layer.group_send)(
            'realtime_updates',
            payload
        )
        print(f"🔄 Broadcast: Ticket #{ticket_id} deleted")

    def broadcast_ticket_updated(self, ticket, changed_fields):
        """Broadcast when a ticket is updated"""
        payload = {
            'type': 'data_changed',
            'event': 'ticket_updated',
            'ticketId': ticket.id,
            'title': ticket.title,
            'status': ticket.status,
            'assignedTo': ticket.assigned_to_id,
            'changedFields': changed_fields,
            'timestamp': datetime.now().isoformat(),
        }
        
        async_to_sync(self.channel_layer.group_send)(
            'realtime_updates',
            payload
        )
        
        # Also broadcast to specific user if assigned
        if ticket.assigned_to_id:
            async_to_sync(self.channel_layer.group_send)(
                f'user_realtime_{ticket.assigned_to_id}',
                payload
            )
        
        print(f"🔄 Broadcast: Ticket #{ticket.id} updated - {changed_fields}")

    def broadcast_comment_added(self, ticket_id, comment_id, author_name):
        """Broadcast when a comment is added"""
        payload = {
            'type': 'data_changed',
            'event': 'comment_added',
            'ticketId': ticket_id,
            'commentId': comment_id,
            'author': author_name,
            'timestamp': datetime.now().isoformat(),
        }
        
        async_to_sync(self.channel_layer.group_send)(
            f'user_realtime_{ticket_id}',  # Broadcast to anyone viewing this ticket
            payload
        )
        print(f"🔄 Broadcast: New comment on ticket #{ticket_id}")

    def broadcast_to_user(self, user_id, event_type, data):
        """Broadcast a specific event to a user"""
        payload = {
            'type': 'data_changed',
            'event': event_type,
            'data': data,
            'timestamp': datetime.now().isoformat(),
        }
        
        async_to_sync(self.channel_layer.group_send)(
            f'user_realtime_{user_id}',
            payload
        )


# Global instance
realtime_service = RealtimeService()
