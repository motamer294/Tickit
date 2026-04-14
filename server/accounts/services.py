# accounts/services.py
"""
User profile and account management services
"""

from django.contrib.auth.hashers import check_password, make_password
from django.db.models import Q, Count, Avg, F
from django.utils import timezone
from datetime import timedelta
from accounts.models import User
from tickets.models import Ticket


def get_user_stats(user: User) -> dict:
    """
    Calculate user statistics based on their role.
    Managers: See all stats. Employees: See their assigned tickets. Customers: See their created tickets.
    """

    if user.role == User.Role.MANAGER:
        # Managers see all tickets
        all_tickets = Ticket.objects.all()
    elif user.role == User.Role.EMPLOYEE:
        # Employees see assigned tickets
        all_tickets = Ticket.objects.filter(assigned_to=user)
    else:
        # Customers see their created tickets
        all_tickets = Ticket.objects.filter(created_by=user)

    # Calculate statistics
    total = all_tickets.count()
    open_count = all_tickets.filter(status=Ticket.Status.OPEN).count()
    in_progress = all_tickets.filter(status=Ticket.Status.IN_PROGRESS).count()
    resolved = all_tickets.filter(status__in=[Ticket.Status.RESOLVED, Ticket.Status.CLOSED]).count()

    # Calculate average resolution time
    resolved_tickets = all_tickets.filter(resolved_at__isnull=False)
    mttr_delta = resolved_tickets.aggregate(
        mttr=Avg(F('resolved_at') - F('created_at'))
    )['mttr']

    avg_resolution_hours = 0.0
    if mttr_delta:
        avg_resolution_hours = round(mttr_delta.total_seconds() / 3600, 2)

    # Calculate member since days
    member_since_days = (timezone.now() - user.created_at).days

    return {
        "total_tickets": total,
        "tickets_open": open_count,
        "tickets_in_progress": in_progress,
        "tickets_resolved": resolved,
        "avg_resolution_time_hours": avg_resolution_hours,
        "member_since_days": max(0, member_since_days),
    }


def update_user_profile(user: User, first_name: str = None, last_name: str = None, email: str = None) -> User:
    """
    Update user profile information.
    Only updates fields that are provided (not None).
    """

    if first_name is not None:
        user.first_name = first_name

    if last_name is not None:
        user.last_name = last_name

    if email is not None:
        # Validate email format (basic check)
        if email and '@' not in email:
            raise ValueError("Invalid email format")
        
        # Check for email uniqueness (only if email is different from current)
        if email != user.email and User.objects.filter(email=email).exists():
            raise ValueError("Email address is already in use")
        
        user.email = email

    user.save()
    return user


def change_password(user: User, current_password: str, new_password: str) -> bool:
    """
    Change user password after verifying the current one.
    Returns True if successful, raises exception otherwise.
    """

    # Verify current password
    if not check_password(current_password, user.password):
        raise ValueError("Current password is incorrect")

    # Validate new password strength (basic)
    if len(new_password) < 6:
        raise ValueError("New password must be at least 6 characters")

    # Set new password
    user.password = make_password(new_password)
    user.save()

    return True
