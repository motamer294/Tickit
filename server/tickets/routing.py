from django.urls import path
from . import consumers

websocket_urlpatterns = [
    path('ws/tickets/<int:ticket_id>/chat/', consumers.TicketChatConsumer.as_asgi()),
]