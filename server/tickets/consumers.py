import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Ticket, ChatMessage
from accounts.models import User

class TicketChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # 1. Get the ticket number from the URL
        self.ticket_id = self.scope['url_route']['kwargs']['ticket_id']
        # 2. Create a room name based on the ticket number
        self.room_group_name = f'ticket_chat_{self.ticket_id}'

        # 3. Add this user to the room
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        # When the user closes the page, remove them from the room
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        # When someone sends a message, we receive it here
        text_data_json = json.loads(text_data)
        message = text_data_json['message']
        sender_id = text_data_json['sender_id']  # The frontend will send us the user ID

        # Save the message to the database
        saved_msg = await self.save_message(self.ticket_id, sender_id, message)

        # Broadcast the message to everyone in the room (so it appears to them instantly)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message,
                'sender_id': sender_id,
                'username': saved_msg.sender.username,
                'timestamp': saved_msg.timestamp.isoformat()
            }
        )

    # Helper function to send data to the frontend
    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'message': event['message'],
            'sender_id': event['sender_id'],
            'username': event['username'],
            'timestamp': event['timestamp']
        }))

    # Function for database operations (because Django's database is synchronous by nature and we need to convert it to async)
    @database_sync_to_async
    def save_message(self, ticket_id, sender_id, message):
        ticket = Ticket.objects.get(id=ticket_id)
        sender = User.objects.get(id=sender_id)
        return ChatMessage.objects.create(ticket=ticket, sender=sender, message=message)