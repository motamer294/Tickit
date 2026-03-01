from ninja import Schema
from datetime import datetime
from typing import Optional
from typing import Literal
#Tickets
class TicketCreateSchema(Schema):
    title: str
    description: str

class TicketOutSchema(Schema):
    id: int
    title: str
    description: str
    status: str
    created_at: datetime
    
    # NEW: We need to pass the usernames to the frontend, not just raw database IDs!
    creator_username: Optional[str] = None
    assigned_to_username: Optional[str] = None

    @staticmethod
    def resolve_creator_username(obj):
        # Safely fetches the employee who created the ticket
        return obj.created_by.username if getattr(obj, "created_by", None) else "Unknown User"

    @staticmethod
    def resolve_assigned_to_username(obj):
        # Safely fetches the IT Agent working on it. Returns "Unassigned" if it's new.
        return obj.assigned_to.username if getattr(obj, "assigned_to", None) else "Unassigned"

class TicketStatusUpdateSchema(Schema):
    status: Literal["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]
#Comments
class CommentSchema(Schema):
    text: str

class CommentOutSchema(Schema):
    id: int
    text: str
    author_username: Optional[str] = None
    created_at: datetime

    @staticmethod
    def resolve_author_username(obj):
        # Use the username of the commenter, or "Unknown User" if something went wrong (e.g., deleted user)
        return obj.author.username if getattr(obj, "author", None) else "Unknown User"
        
    # FIX: The broken resolve_text(obj) method was deleted. 
    # Django Ninja will automatically map schema.text to model.text perfectly.