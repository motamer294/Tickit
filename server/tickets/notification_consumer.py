"""
Real-time notifications consumer for managers and employees.
Handles global activity notifications and real-time updates.
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Ticket
from accounts.models import User
from core.jwt_middleware import get_user_from_token


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time notifications.
    - Managers receive all activity notifications
    - Employees receive their own assigned/mentioned notifications
    - Authentication via message: {"type": "authenticate", "token": "..."}
    """

    async def connect(self):
        """Initialize WebSocket connection - authenticate via message"""
        try:
            # Initialize groups list (used in disconnect)
            self.groups = []
            self.user = None
            self.user_id = None
            self.is_authenticated = False

            # Accept connection first (authentication happens in receive)
            await self.accept()
            print(f" WebSocket connection accepted, waiting for authentication")
        except Exception as e:
            print(f" Connection error: {e}")
            import traceback
            traceback.print_exc()
            await self.close()

    async def disconnect(self, close_code):
        """Remove user from all groups on disconnect"""
        try:
            for group in getattr(self, 'groups', []):
                await self.channel_layer.group_discard(group, self.channel_name)
            print(f" User {getattr(self, 'user_id', 'unknown')} disconnected from notifications")
        except Exception as e:
            print(f" Error during disconnect: {e}")

    async def receive(self, text_data):
        """Handle incoming messages - authenticate or handle ping"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')

            # Handle authentication
            if message_type == 'authenticate':
                await self.handle_authenticate(data)
            # Handle ping/pong for keep-alive
            elif message_type == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))
            else:
                if not self.is_authenticated:
                    print(f" Unauthenticated message received: {message_type}")
                    await self.close(code=4001)
        except Exception as e:
            print(f" Receive error: {e}")

    async def handle_authenticate(self, data):
        """Authenticate user via JWT token in message"""
        try:
            token = data.get('token')
            if not token:
                print(f" No token provided")
                await self.close(code=4002)
                return

            # Validate token and get user
            user = await get_user_from_token(token)

            if user.is_anonymous:
                print(f" Invalid token")
                await self.close(code=4003)
                return

            # Set user and mark as authenticated
            self.user = user
            self.user_id = user.id
            self.is_authenticated = True

            # Determine if user is a manager
            self.is_manager = await self.check_if_manager()

            # Create group names and add user to groups
            if self.is_manager:
                self.groups = ['managers_notifications', f'user_notifications_{self.user_id}']
            else:
                self.groups = [f'user_notifications_{self.user_id}']

            # Add to all relevant groups
            for group in self.groups:
                await self.channel_layer.group_add(group, self.channel_name)

            # Send confirmation
            await self.send(text_data=json.dumps({
                'type': 'authenticated',
                'user_id': self.user_id,
                'username': self.user.username,
                'role': self.user.role,
            }))

            print(f" User {self.user.username} ({self.user.role}) authenticated and connected to notifications")
        except Exception as e:
            print(f" Authentication error: {e}")
            import traceback
            traceback.print_exc()
            await self.close(code=4000)

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
            print(f" Sent notification: {notification_data['type']}")
        except Exception as e:
            print(f" Error sending notification: {e}")
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
