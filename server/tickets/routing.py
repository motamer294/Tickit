from django.urls import path
from . import consumers
from .notification_consumer import NotificationConsumer
from .realtime_consumer import RealtimeDataConsumer

websocket_urlpatterns = [
    path('ws/tickets/<int:ticket_id>/chat/', consumers.TicketChatConsumer.as_asgi()),
    path('ws/notifications/', NotificationConsumer.as_asgi()),
    path('ws/realtime/', RealtimeDataConsumer.as_asgi()),
]