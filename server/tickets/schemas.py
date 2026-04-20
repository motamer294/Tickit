from ninja import Schema
from datetime import datetime
from typing import Dict
from typing import Optional, Literal, List

# ==========================
# Category & Tag Schemas
# ==========================

class CategorySchema(Schema):
    """Ticket category"""
    id: int
    name: str
    description: str
    color: str

class TagSchema(Schema):
    """Ticket tag"""
    id: int
    name: str
    color: str

# ==========================
# Tickets Schemas
# ==========================

class TicketCreateSchema(Schema):
    title: str
    description: str
    priority: Literal["LOW", "MEDIUM", "HIGH", "URGENT"] = "MEDIUM"
    category_id: Optional[int] = None
    tag_ids: List[int] = []  # List of tag IDs to attach
    assigned_to_id: Optional[int] = None

class TicketOutSchema(Schema):
    id: int
    title: str
    description: str
    status: str
    priority: str

    category: Optional[CategorySchema] = None
    tags: List[TagSchema] = []

    sentiment: Optional[str] = None
    ai_suggested_solution: Optional[str] = None

    created_at: datetime
    updated_at: datetime

    creator_username: Optional[str] = None
    assigned_to_username: Optional[str] = None

    @staticmethod
    def resolve_creator_username(obj):
        return obj.created_by.username if getattr(obj, "created_by", None) else "Unknown User"

    @staticmethod
    def resolve_assigned_to_username(obj):
        return obj.assigned_to.username if getattr(obj, "assigned_to", None) else "Unassigned"

class TicketUpdateSchema(Schema):
    """Update ticket fields"""
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[Literal["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]] = None
    priority: Optional[Literal["LOW", "MEDIUM", "HIGH", "URGENT"]] = None
    category_id: Optional[int] = None
    tag_ids: Optional[List[int]] = None
    assigned_to_id: Optional[int] = None

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
