"""
Real-time data events consumer for tickets
Broadcasts ticket and comment updates to all connected clients
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Ticket, Comment
from accounts.models import User
from core.jwt_middleware import get_user_from_token


class RealtimeDataConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time data updates.
    - Broadcasts ticket list updates (creates/deletes)
    - Broadcasts ticket detail updates (status, assignments, edits)
    - Broadcasts comment updates
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
            print(f"✅ Real-time WebSocket connection accepted, waiting for authentication")
        except Exception as e:
            print(f"❌ Real-time connection error: {e}")
            import traceback
            traceback.print_exc()
            await self.close()

    async def disconnect(self, close_code):
        """Unsubscribe from real-time channels"""
        for group in getattr(self, 'groups', []):
            await self.channel_layer.group_discard(group, self.channel_name)
        print(f"❌ User {getattr(self, 'user_id', 'unknown')} disconnected from real-time data")

    async def receive(self, text_data):
        """Handle incoming messages - authenticate or keep-alive pings"""
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
                    print(f"❌ Unauthenticated message received: {message_type}")
                    await self.close(code=4001)
        except Exception as e:
            print(f"❌ Receive error: {e}")

    async def handle_authenticate(self, data):
        """Authenticate user via JWT token in message"""
        try:
            token = data.get('token')
            if not token:
                print(f"❌ No token provided")
                await self.close(code=4002)
                return

            # Validate token and get user
            user = await get_user_from_token(token)

            if user.is_anonymous:
                print(f"❌ Invalid token")
                await self.close(code=4003)
                return

            # Set user and mark as authenticated
            self.user = user
            self.user_id = user.id
            self.is_authenticated = True

            # Subscribe to global real-time events channel
            self.groups.append('realtime_updates')
            await self.channel_layer.group_add('realtime_updates', self.channel_name)

            # Subscribe to user-specific updates (their tickets, assignments, etc)
            user_realtime_group = f'user_realtime_{self.user_id}'
            self.groups.append(user_realtime_group)
            await self.channel_layer.group_add(user_realtime_group, self.channel_name)

            # Send confirmation
            await self.send(text_data=json.dumps({
                'type': 'authenticated',
                'user_id': self.user_id,
                'username': self.user.username,
                'role': self.user.role,
            }))

            print(f"✅ User {self.user.username} authenticated and connected to real-time data")
        except Exception as e:
            print(f"❌ Authentication error: {e}")
            import traceback
            traceback.print_exc()
            await self.close(code=4000)

    # ============ EVENT HANDLERS ============

    async def ticket_created(self, event):
        """Handle new ticket creation"""
        await self.send(text_data=json.dumps(event))

    async def ticket_deleted(self, event):
        """Handle ticket deletion"""
        await self.send(text_data=json.dumps(event))

    async def ticket_updated(self, event):
        """Handle ticket update (status, assignment, etc)"""
        await self.send(text_data=json.dumps(event))

    async def comment_added(self, event):
        """Handle new comment"""
        await self.send(text_data=json.dumps(event))

    async def data_changed(self, event):
        """Generic data change event"""
        await self.send(text_data=json.dumps(event))
