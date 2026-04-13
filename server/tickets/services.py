# tickets/services.py

import requests
import logging
from django.db import transaction
from django.db.models import Count, Q
from .models import Ticket, TicketHistory
from django.utils import timezone
from accounts.models import User

logger = logging.getLogger(__name__)

# Most important change: using the Docker gateway IP to communicate with Ubuntu
ML_SERVICE_URL = "http://host.docker.internal:8001/ticket"

def get_employee_with_least_workload() -> 'User':
    """
    Calculate which employee has the least open/in-progress tickets
    and return that employee for auto-assignment.
    """
    # Removed the import Count from here because it's already imported above
    
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
        response = requests.post(ML_SERVICE_URL, json=payload, timeout=45)
        response.raise_for_status() 
        
        data = response.json()
        # Standardize the data format for the frontend (e.g., High not high)
        if "priority" in data:
            data["priority"] = data["priority"].upper()
        if "sentiment" in data:
            data["sentiment"] = data["sentiment"].capitalize()
            
        return data
    
    except requests.exceptions.RequestException as e:
        logger.error(f"⚠️ ML Service connection failed: {e}")
        return {
            "category": "General IT",
            "priority": "LOW", # Keep it capitalized
            "sentiment": "Neutral",
            "suggested_solution": "Your ticket has been received. Our IT team will review it shortly. (AI Engine Offline)"
        }


def update_ticket_status(ticket: Ticket, new_status: str, user):
    """
    Updates a ticket's status and records the history in one atomic transaction.
    Automatically handles the 'resolved_at' timestamp for dashboard analytics.
    """
    if ticket.status == new_status:
        return ticket

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

def create_ticket_with_ai(
    title: str, 
    description: str, 
    user,
    assigned_to_id: int = None,
    auto_assign: bool = False
) -> Ticket:
    """
    Creates a new ticket with AI analysis and optional assignment.
    """
    ai_data = analyze_ticket_with_ai(title, description)
    
    assigned_to = None
    
    if assigned_to_id:
        try:
            assigned_to = User.objects.get(
                id=assigned_to_id,
                role=User.Role.EMPLOYEE
            )
        except User.DoesNotExist:
            logger.warning(f"Employee with ID {assigned_to_id} not found")
    
    elif auto_assign:
        assigned_to = get_employee_with_least_workload()
        if assigned_to:
            logger.info(f"Auto-assigned ticket to {assigned_to.username}")
    
    ticket = Ticket.objects.create(
        title=title,
        description=description,
        created_by=user,
        assigned_to=assigned_to,
        status='IN_PROGRESS' if assigned_to else 'OPEN',
        category=ai_data.get("category", "General IT"),
        priority=ai_data.get("priority", "LOW"),
        sentiment=ai_data.get("sentiment", "Neutral"),
        ai_suggested_solution=ai_data.get("suggested_solution", "")
    )
    
    TicketHistory.objects.create(
        ticket=ticket,
        old_status="NEW",
        new_status=ticket.status,
        changed_by=user
    )
    
    return ticket