# tickets/services.py

import os
import requests
import logging
from django.db import transaction
from django.db.models import Count, Q
from .models import Ticket, TicketHistory, Category, Tag
from django.utils import timezone
from accounts.models import User

logger = logging.getLogger(__name__)

ML_SERVICE_URL = os.environ.get('ML_SERVICE_URL', 'http://host.docker.internal:8001/ticket')
ML_SERVICE_TIMEOUT = int(os.environ.get('ML_SERVICE_TIMEOUT', '300'))

def get_employee_with_least_workload() -> 'User':
    """
    Calculate which employee has the least open/in-progress tickets
    and return that employee for auto-assignment.
    """
    employees = User.objects.filter(role=User.Role.EMPLOYEE).annotate(
        active_tickets=Count(
            'assigned_tickets',
            filter=Q(assigned_tickets__status__in=['OPEN', 'IN_PROGRESS'])
        )
    ).order_by('active_tickets')

    if employees.exists():
        return employees.first()
    return None


def analyze_ticket_with_ai(title: str, description: str) -> dict:
    """
    Sends the ticket title and description to the ML Service
    and returns the AI's predicted category, priority, and solution.
    """
    payload = {
        "title": title,
        "description": description
    }

    try:
        response = requests.post(ML_SERVICE_URL, json=payload, timeout=ML_SERVICE_TIMEOUT)
        response.raise_for_status()

        data = response.json()
        # Standardize the data format for the frontend (e.g., High not high)
        if "priority" in data:
            data["priority"] = data["priority"].upper()
        if "sentiment" in data:
            data["sentiment"] = data["sentiment"].capitalize()

        return data

    except requests.exceptions.ConnectionError as e:
        # ML service is completely unreachable — no point retrying from here
        logger.error(f" ML Service unreachable: {e}")
        return {
            "category": "General IT",
            "priority": "LOW",
            "sentiment": "Neutral",
            "suggested_solution": "Your ticket has been received. Our IT team will review it shortly. (AI Engine Offline)"
        }
    except requests.exceptions.RequestException as e:
        # Timeout or HTTP error — re-raise so Celery retries with back-off
        logger.error(f" ML Service request failed (will retry): {e}")
        raise


def update_ticket_status(ticket: Ticket, new_status: str, user):
    """
    Updates a ticket's status and records the history in one atomic transaction.
    Validates state transitions according to VALID_TRANSITIONS.
    Automatically handles the 'resolved_at' timestamp for dashboard analytics.

    Raises ValueError if transition is not allowed.
    """
    if ticket.status == new_status:
        return ticket

    # Validate transition
    if not ticket.can_transition_to(new_status):
        available = ticket.get_available_transitions()
        raise ValueError(
            f"Cannot transition from {ticket.status} to {new_status}. "
            f"Valid transitions: {available}"
        )

    old_status = ticket.status

    with transaction.atomic():
        ticket.status = new_status

        if new_status in [Ticket.Status.RESOLVED, Ticket.Status.CLOSED]:
            if not ticket.resolved_at:
                ticket.resolved_at = timezone.now()
        else:
            ticket.resolved_at = None

        ticket.save()

        TicketHistory.objects.create(
            ticket=ticket,
            old_status=old_status,
            new_status=new_status,
            changed_by=user
        )

    return ticket

def create_ticket(
    title: str,
    description: str,
    user,
    category_id: int = None,
    tag_ids: list = None,
    priority: str = None,
    assigned_to_id: int = None,
    auto_assign: bool = False
) -> Ticket:
    """
    Saves a new ticket immediately and returns it.
    AI triage (sentiment, solution, category) runs asynchronously via Celery.
    ai_status starts as PENDING and is updated by the background task.
    """
    assigned_to = None

    if assigned_to_id:
        try:
            assigned_to = User.objects.get(id=assigned_to_id, role=User.Role.EMPLOYEE)
        except User.DoesNotExist:
            logger.warning(f"Employee with ID {assigned_to_id} not found")

    elif auto_assign:
        assigned_to = get_employee_with_least_workload()
        if assigned_to:
            logger.info(f"Auto-assigned ticket to {assigned_to.username}")

    category = None
    if category_id:
        try:
            category = Category.objects.get(id=category_id)
        except Category.DoesNotExist:
            logger.warning(f"Category with ID {category_id} not found")

    ticket = Ticket.objects.create(
        title=title,
        description=description,
        created_by=user,
        assigned_to=assigned_to,
        category=category,
        status='IN_PROGRESS' if assigned_to else 'OPEN',
        priority=priority or 'MEDIUM',
        ai_status=Ticket.AiStatus.PENDING,
    )

    if tag_ids:
        tags = Tag.objects.filter(id__in=tag_ids)
        ticket.tags.set(tags)

    TicketHistory.objects.create(
        ticket=ticket,
        old_status="NEW",
        new_status=ticket.status,
        changed_by=user
    )

    return ticket


# Keep old name as an alias so nothing outside breaks during the transition
create_ticket_with_ai = create_ticket
