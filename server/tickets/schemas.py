from ninja import Schema
from datetime import datetime
from typing import Dict
from typing import Optional, Literal

# ==========================
# Tickets Schemas
# ==========================

class TicketCreateSchema(Schema):
    title: str
    description: str
    assigned_to_id: Optional[int] = None  # Option A: Manual assignment by manager
    auto_assign: bool = False  # Option C: Auto-assign by workload

class TicketOutSchema(Schema):
    id: int
    title: str
    description: str
    status: str
    
    # 🤖 AI Fields (Strictly Required - No Optional)
    category: str
    priority: str
    sentiment: str
    ai_suggested_solution: str

    created_at: datetime
    
    # NEW: We need to pass the usernames to the frontend, not just raw database IDs!
    # (Kept Optional here only because assigned_to can legitimately be empty/unassigned)
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

# ==========================
# Comments Schemas
# ==========================

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
    # ==========================
# Analytics & Dashboard Schemas
# ==========================
class DashboardStatsSchema(Schema):
    total_tickets: int
    open_tickets: int
    resolved_tickets: int
    avg_resolution_time_hours: float
    
    # We will return the statistics as dictionaries so they can be easily plotted in the charts
    tickets_by_category: Dict[str, int]
    tickets_by_priority: Dict[str, int]
    sentiment_analysis: Dict[str, int]