from ninja import Schema
from datetime import datetime
from typing import Dict, Any
from typing import Optional, Literal, List

# ==========================
# Attachment Schema
# ==========================

class AttachmentOutSchema(Schema):
    """File attachment response"""
    id: int
    filename: str
    file_size: int  # bytes
    uploaded_by_username: Optional[str] = None
    uploaded_at: datetime
    file_url: Optional[str] = None  # Will be resolved in API

    @staticmethod
    def resolve_uploaded_by_username(obj):
        return obj.uploaded_by.username if obj.uploaded_by else "Unknown User"

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
    attachments: List[AttachmentOutSchema] = []

    sentiment: Optional[str] = None
    ai_suggested_solution: Optional[str] = None

    created_at: datetime
    updated_at: datetime

    creator_username: Optional[str] = None
    assigned_to_username: Optional[str] = None
    assigned_to_id: Optional[int] = None
    creator_id: Optional[int] = None
    available_transitions: List[dict] = []  # Always include, default to empty list

    @staticmethod
    def resolve_creator_id(obj):
        return obj.created_by.id if getattr(obj, "created_by", None) else None

    @staticmethod
    def resolve_assigned_to_id(obj):
        return obj.assigned_to.id if getattr(obj, "assigned_to", None) else None

    @staticmethod
    def resolve_creator_username(obj):
        return obj.created_by.username if getattr(obj, "created_by", None) else "Unknown User"

    @staticmethod
    def resolve_assigned_to_username(obj):
        return obj.assigned_to.username if getattr(obj, "assigned_to", None) else "Unassigned"

    @staticmethod
    def resolve_available_transitions(obj):
        return obj.get_available_transitions_display() if hasattr(obj, 'get_available_transitions_display') else []

class TicketUpdateSchema(Schema):
    """Update ticket fields"""
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[Literal["OPEN", "PENDING", "IN_PROGRESS", "RESOLVED", "CLOSED"]] = None
    priority: Optional[Literal["LOW", "MEDIUM", "HIGH", "URGENT"]] = None
    category_id: Optional[int] = None
    tag_ids: Optional[List[int]] = None
    assigned_to_id: Optional[int] = None

class TicketStatusUpdateSchema(Schema):
    status: Literal["OPEN", "PENDING", "IN_PROGRESS", "RESOLVED", "CLOSED"]

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


# ==========================
# SLA Schemas
# ==========================
class SLASchema(Schema):
    id: int
    name: str
    description: str
    priority: str
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    response_time_hours: int
    resolution_time_hours: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class SLACreateSchema(Schema):
    name: str
    description: str = ""
    priority: str  # HIGH, MEDIUM, LOW
    category_id: Optional[int] = None
    response_time_hours: int = 4
    resolution_time_hours: int = 24
    is_active: bool = True


# ==========================
# AuditLog Schemas
# ==========================
class AuditLogSchema(Schema):
    id: int
    action_type: str
    performed_by_username: Optional[str] = None
    ticket_id: Optional[int] = None
    user_id: Optional[int] = None
    user_username: Optional[str] = None
    description: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    metadata: Dict[str, Any] = {}
    created_at: datetime
    ip_address: Optional[str] = None


# ==========================
# User Admin Schemas
# ==========================
class UserDetailSchema(Schema):
    id: int
    username: str
    email: str
    first_name: str
    last_name: str
    role: str  # MANAGER, EMPLOYEE, CUSTOMER
    is_active: bool
    date_joined: datetime
    created_at: datetime


class UserCreateSchema(Schema):
    username: str
    email: str
    password: str
    first_name: str = ""
    last_name: str = ""
    role: str  # MANAGER, EMPLOYEE, CUSTOMER


class UserUpdateSchema(Schema):
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[str] = None  # MANAGER, EMPLOYEE, CUSTOMER
    is_active: Optional[bool] = None
