import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=30, name='tickets.ai_triage_ticket')
def ai_triage_ticket(self, ticket_id: int):
    """
    Background task: call ML service and patch the ticket with AI results.
    Triggered immediately after ticket creation so the HTTP response is never blocked.

    Retry schedule on failure: 30s → 60s → 120s.
    """
    from .models import Ticket, Category
    from .services import analyze_ticket_with_ai
    from .realtime_service import realtime_service

    try:
        ticket = Ticket.objects.get(id=ticket_id)
    except Ticket.DoesNotExist:
        logger.error(f"ai_triage_ticket: ticket #{ticket_id} not found — skipping")
        return

    # Mark as processing so frontend can show a spinner
    Ticket.objects.filter(id=ticket_id).update(ai_status=Ticket.AiStatus.PROCESSING)

    try:
        ai_data = analyze_ticket_with_ai(ticket.title, ticket.description)

        update_fields = ['sentiment', 'ai_suggested_solution', 'priority', 'ai_status', 'updated_at']

        ticket.sentiment             = ai_data.get('sentiment', 'Neutral')
        ticket.ai_suggested_solution = ai_data.get('suggested_solution', '')
        ticket.priority              = ai_data.get('priority', ticket.priority)

        # Always apply ML category — create it if it doesn't exist yet
        category_name = ai_data.get('category', '').strip()
        if category_name:
            category = Category.objects.filter(name__iexact=category_name).first()
            if not category:
                category = Category.objects.create(name=category_name)
            ticket.category = category
            update_fields.append('category')

        ticket.ai_status = Ticket.AiStatus.DONE
        ticket.save(update_fields=update_fields)

        # Push WebSocket event → frontend auto-refetches this ticket
        realtime_service.broadcast_ai_complete(ticket)
        logger.info(f"✅ AI triage done for ticket #{ticket_id}")

    except Exception as exc:
        logger.error(f"❌ AI triage failed for ticket #{ticket_id}: {exc}")

        # Mark as FAILED so the UI can surface this
        Ticket.objects.filter(id=ticket_id).update(ai_status=Ticket.AiStatus.FAILED)

        # Exponential back-off: attempt 1→30s, 2→60s, 3→120s
        countdown = 30 * (2 ** self.request.retries)
        raise self.retry(exc=exc, countdown=countdown)
