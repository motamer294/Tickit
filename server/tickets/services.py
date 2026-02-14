from django.db import transaction
from .models import Ticket, TicketHistory

def update_ticket_status(ticket: Ticket, new_status: str, user):
    """
    Updates a ticket's status and records the history in one atomic transaction.
    """
    if ticket.status == new_status:
        return ticket  # No change needed

    old_status = ticket.status
    
    # atomic ensures both save and history happen, or neither does
    with transaction.atomic():
        # 1. Update the Ticket
        ticket.status = new_status
        ticket.save()

        # 2. Create the History Record using the 'user' passed in
        TicketHistory.objects.create(
            ticket=ticket,
            old_status=old_status,
            new_status=new_status,
            changed_by=user  # accurate user from the API
        )
    
    return ticket