from django.urls import path
from . import consumers
from .notification_consumer import NotificationConsumer
from .realtime_consumer import RealtimeDataConsumer
from .unified_consumer import UnifiedWebSocketConsumer

websocket_urlpatterns = [
    path('ws/tickets/<int:ticket_id>/chat/', consumers.TicketChatConsumer.as_asgi()),

    # Single unified WebSocket endpoint (PREFERRED - combines notifications + real-time data)
    path('ws/unified/', UnifiedWebSocketConsumer.as_asgi()),

    # Legacy endpoints (kept for backward compatibility)
    path('ws/notifications/', NotificationConsumer.as_asgi()),
    path('ws/realtime/', RealtimeDataConsumer.as_asgi()),
]
