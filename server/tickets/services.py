# tickets/services.py

import requests
import logging
from django.db import transaction
from django.db.models import Count, Q
from .models import Ticket, TicketHistory
from django.utils import timezone
from accounts.models import User

logger = logging.getLogger(__name__)

# رابط الـ ML Service اللي إحنا لسه مشغلينها
ML_SERVICE_URL = "http://127.0.0.1:8001/ticket"

def get_employee_with_least_workload() -> 'User':
    """
    Option C: Calculate which employee has the least open/in-progress tickets
    and return that employee for auto-assignment.
    """
    from django.db.models import Count
    
    # Get all employees (role=EMPLOYEE)
    employees = User.objects.filter(role=User.Role.EMPLOYEE).annotate(
        active_tickets=Count(
            'assigned_tickets',
            filter=Q(assigned_tickets__status__in=['OPEN', 'IN_PROGRESS'])
        )
    ).order_by('active_tickets')
    
    if employees.exists():
        return employees.first()  # Return employee with least tickets
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
        # بنبعت الريكويست وبنستنى 5 ثواني كحد أقصى (Timeout)
        response = requests.post(ML_SERVICE_URL, json=payload, timeout=45)
        response.raise_for_status() # بتضرب إيرور لو السيرفر رد بـ 400 أو 500
        
        return response.json()
    
    except requests.exceptions.RequestException as e:
        logger.error(f"⚠️ ML Service connection failed: {e}")
        # لو السيرفر مقفول أو ضرب إيرور، هنرجع قيم افتراضية عشان السيستم ميوقفش
        return {
            "category": "General IT",
            "priority": "low",
            "sentiment": "neutral",
            "suggested_solution": "Your ticket has been received. Our IT team will review it shortly. (AI Engine Offline)"
        }


def update_ticket_status(ticket: Ticket, new_status: str, user):
    """
    Updates a ticket's status and records the history in one atomic transaction.
    Automatically handles the 'resolved_at' timestamp for dashboard analytics.
    """
    if ticket.status == new_status:
        return ticket  # No change needed

    old_status = ticket.status
    
    with transaction.atomic():
        # 1. تحديث الحالة
        ticket.status = new_status
        
        # 2. منطق تسجيل وقت الحل (عشان الداشبورد)
        if new_status in [Ticket.Status.RESOLVED, Ticket.Status.CLOSED]:
            if not ticket.resolved_at:  # لو مكنتش محلولة قبل كده، سجل الوقت الحالي
                ticket.resolved_at = timezone.now()
        else:
            # لو التذكرة رجعت اتفتحت تاني (OPEN أو IN_PROGRESS)، امسح وقت الحل
            ticket.resolved_at = None

        ticket.save()

        # 3. تسجيل الـ History
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
    assigned_to_id: int = None,  # Option A: Manual assignment
    auto_assign: bool = False  # Option C: Auto-assign by workload
) -> Ticket:
    """
    Creates a new ticket with AI analysis and optional assignment.
    
    Args:
        title: Ticket title
        description: Ticket description
        user: User creating the ticket
        assigned_to_id: Optional employee ID for manual assignment (Option A)
        auto_assign: Whether to auto-assign based on workload (Option C)
    """
    # 1. إرسال المشكلة للذكاء الاصطناعي
    ai_data = analyze_ticket_with_ai(title, description)
    
    # 2. Determine who to assign to
    assigned_to = None
    
    # Option A: Manual assignment (highest priority)
    if assigned_to_id:
        try:
            assigned_to = User.objects.get(
                id=assigned_to_id,
                role=User.Role.EMPLOYEE
            )
        except User.DoesNotExist:
            logger.warning(f"Employee with ID {assigned_to_id} not found")
    
    # Option C: Auto-assign (if not manually assigned)
    elif auto_assign:
        assigned_to = get_employee_with_least_workload()
        if assigned_to:
            logger.info(f"Auto-assigned ticket to {assigned_to.username} (workload: {assigned_to.assigned_tickets.filter(Q(status__in=['OPEN', 'IN_PROGRESS'])).count()} active tickets)")
    
    # 3. حفظ التذكرة في قاعدة البيانات مع مخرجات الـ AI
    ticket = Ticket.objects.create(
        title=title,
        description=description,
        created_by=user,
        assigned_to=assigned_to,  # Set assignment if applicable
        status='IN_PROGRESS' if assigned_to else 'OPEN',  # If assigned, mark as in-progress
        category=ai_data.get("category", "General IT"),
        priority=ai_data.get("priority", "low"),
        sentiment=ai_data.get("sentiment", "neutral"),
        ai_suggested_solution=ai_data.get("suggested_solution", "")
    )
    
    # 4. ممكن نسجل خطوة الإنشاء في הـ History (اختياري بس بيخلي الشغل احترافي)
    TicketHistory.objects.create(
        ticket=ticket,
        old_status="NEW",
        new_status=ticket.status,
        changed_by=user
    )
    
    return ticket