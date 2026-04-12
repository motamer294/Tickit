"""
Real-time notifications consumer for managers and employees.
Handles global activity notifications and real-time updates.
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Ticket
from accounts.models import User


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time notifications.
    - Managers receive all activity notifications
    - Employees receive their own assigned/mentioned notifications
    """

    async def connect(self):
        """Initialize WebSocket connection and add user to notification group"""
        try:
            # Get user from token (authentication handled by middleware)
            self.user_id = self.scope['user'].id
            self.user = self.scope['user']
            
            # Determine if user is a manager
            self.is_manager = await self.check_if_manager()
            
            # Create group names
            # All managers subscribe to "managers_notifications"
            # All employees get individual group: "user_notifications_{user_id}"
            if self.is_manager:
                self.groups = ['managers_notifications', f'user_notifications_{self.user_id}']
            else:
                self.groups = [f'user_notifications_{self.user_id}']
            
            # Add to all relevant groups
            for group in self.groups:
                await self.channel_layer.group_add(group, self.channel_name)
            
            await self.accept()
            print(f"✅ User {self.user.username} ({self.user.role}) connected to notifications")
        except Exception as e:
            print(f"❌ Connection error: {e}")
            await self.close()

    async def disconnect(self, close_code):
        """Remove user from all groups on disconnect"""
        for group in self.groups:
            await self.channel_layer.group_discard(group, self.channel_name)
        print(f"❌ User {self.user_id} disconnected from notifications")

    async def receive(self, text_data):
        """Handle incoming messages (usually just keep-alive pings)"""
        try:
            data = json.loads(text_data)
            # Handle ping/pong for keep-alive
            if data.get('type') == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))
        except Exception as e:
            print(f"❌ Receive error: {e}")

    # ============ NOTIFICATION HANDLERS ============

    async def ticket_created(self, event):
        """Handler for ticket created notification"""
        await self.send_notification(event)

    async def ticket_updated(self, event):
        """Handler for ticket updated/status changed notification"""
        await self.send_notification(event)

    async def ticket_assigned(self, event):
        """Handler for ticket assigned notification"""
        await self.send_notification(event)

    async def ticket_resolved(self, event):
        """Handler for ticket resolved notification"""
        await self.send_notification(event)

    async def ticket_deleted(self, event):
        """Handler for ticket deleted notification"""
        await self.send_notification(event)

    async def comment_added(self, event):
        """Handler for comment added notification"""
        await self.send_notification(event)

    async def send_notification(self, event):
        """Send notification to frontend"""
        try:
            # Extract notification data from event
            notification_data = {
                'id': event.get('id', str(event.get('timestamp', ''))),
                'type': event.get('type'),
                'title': event.get('title'),
                'message': event.get('message', ''),
                'ticketId': event.get('ticket_id'),
                'timestamp': event.get('timestamp'),
                'data': event.get('data', {}),
                'isGlobal': event.get('is_global', False),
            }
            
            await self.send(text_data=json.dumps(notification_data))
        except Exception as e:
            print(f"❌ Error sending notification: {e}")

    # ============ UTILITY METHODS ============

    @database_sync_to_async
    def check_if_manager(self):
        """Check if the connected user is a manager"""
        try:
            user = User.objects.get(id=self.user_id)
            return user.role == 'MANAGER'
        except User.DoesNotExist:
            return False
