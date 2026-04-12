"""
Real-time data events consumer for tickets
Broadcasts ticket and comment updates to all connected clients
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Ticket, Comment
from accounts.models import User


class RealtimeDataConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time data updates.
    - Broadcasts ticket list updates (creates/deletes)
    - Broadcasts ticket detail updates (status, assignments, edits)
    - Broadcasts comment updates
    """

    async def connect(self):
        """Initialize WebSocket connection for real-time data"""
        try:
            # Initialize groups list (used in disconnect)
            self.groups = []

            # Get user from scope (JWT middleware should have set it)
            user = self.scope.get('user')

            if not user or user.is_anonymous:
                print(f"❌ Anonymous user attempting real-time WebSocket connection")
                await self.close(code=4001)
                return

            self.user_id = user.id
            self.user = user

            # Subscribe to global real-time events channel
            self.groups.append('realtime_updates')
            await self.channel_layer.group_add('realtime_updates', self.channel_name)

            # Subscribe to user-specific updates (their tickets, assignments, etc)
            user_realtime_group = f'user_realtime_{self.user_id}'
            self.groups.append(user_realtime_group)
            await self.channel_layer.group_add(user_realtime_group, self.channel_name)

            await self.accept()
            print(f"✅ User {self.user.username} connected to real-time data")
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
        """Handle incoming messages (keep-alive pings)"""
        try:
            data = json.loads(text_data)
            if data.get('type') == 'ping':
                await self.send(text_data=json.dumps({'type': 'pong'}))
        except Exception as e:
            print(f"❌ Receive error: {e}")

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
