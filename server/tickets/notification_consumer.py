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
            # Initialize groups list (used in disconnect)
            self.groups = []

            # Get user from scope (JWT middleware should have set it)
            user = self.scope.get('user')

            if not user or user.is_anonymous:
                print(f"❌ Anonymous user attempting WebSocket connection")
                await self.close(code=4001)
                return

            self.user_id = user.id
            self.user = user

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
            import traceback
            traceback.print_exc()
            await self.close()

    async def disconnect(self, close_code):
        """Remove user from all groups on disconnect"""
        try:
            for group in getattr(self, 'groups', []):
                await self.channel_layer.group_discard(group, self.channel_name)
            print(f"❌ User {getattr(self, 'user_id', 'unknown')} disconnected from notifications")
        except Exception as e:
            print(f"⚠️ Error during disconnect: {e}")

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
            # Map backend notification types to frontend types
            type_map = {
                'ticket_created': 'TICKET_CREATED',
                'ticket_updated': 'TICKET_UPDATED',
                'ticket_assigned': 'TICKET_ASSIGNED',
                'ticket_resolved': 'TICKET_RESOLVED',
                'ticket_deleted': 'TICKET_DELETED',
                'comment_added': 'COMMENT_ADDED',
            }

            # Convert type to frontend format
            backend_type = event.get('type', 'SYSTEM').lower()
            frontend_type = type_map.get(backend_type, 'SYSTEM')

            # Extract user info from data if available
            from_user = None
            data = event.get('data', {})
            if 'created_by_id' in data:
                from_user = {
                    'id': data['created_by_id'],
                    'username': data.get('created_by_name', 'Unknown'),
                }
            elif 'changed_by_id' in data:
                from_user = {
                    'id': data['changed_by_id'],
                    'username': data.get('changed_by_name', 'Unknown'),
                }
            elif 'assigned_by_id' in data:
                from_user = {
                    'id': data['assigned_by_id'],
                    'username': data.get('assigned_by_name', 'Unknown'),
                }

            # Extract notification data from event
            notification_data = {
                'id': event.get('id', str(event.get('timestamp', ''))),
                'type': frontend_type,
                'title': event.get('title', 'Notification'),
                'message': event.get('message', ''),
                'ticketId': event.get('ticket_id'),
                'createdAt': event.get('timestamp'),
                'data': data,
                'isGlobal': event.get('is_global', False),
                'fromUser': from_user,
            }

            await self.send(text_data=json.dumps(notification_data))
            print(f"✉️ Sent notification: {notification_data['type']}")
        except Exception as e:
            print(f"❌ Error sending notification: {e}")
            import traceback
            traceback.print_exc()

    # ============ UTILITY METHODS ============

    @database_sync_to_async
    def check_if_manager(self):
        """Check if the connected user is a manager"""
        try:
            user = User.objects.get(id=self.user_id)
            return user.role == 'MANAGER'
        except User.DoesNotExist:
            return False
