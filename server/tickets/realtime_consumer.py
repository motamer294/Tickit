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
            self.user_id = self.scope['user'].id
            self.user = self.scope['user']
            
            # Subscribe to global real-time events channel
            await self.channel_layer.group_add('realtime_updates', self.channel_name)
            
            # Subscribe to user-specific updates (their tickets, assignments, etc)
            await self.channel_layer.group_add(f'user_realtime_{self.user_id}', self.channel_name)
            
            await self.accept()
            print(f"✅ User {self.user.username} connected to real-time data")
        except Exception as e:
            print(f"❌ Real-time connection error: {e}")
            await self.close()

    async def disconnect(self, close_code):
        """Unsubscribe from real-time channels"""
        await self.channel_layer.group_discard('realtime_updates', self.channel_name)
        await self.channel_layer.group_discard(f'user_realtime_{self.user_id}', self.channel_name)
        print(f"❌ User {self.user_id} disconnected from real-time data")

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
