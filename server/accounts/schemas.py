# accounts/schemas.py
"""
User and Profile Schemas for API responses
"""

from ninja import Schema
from typing import Optional
from datetime import datetime


class UserProfileSchema(Schema):
    """User profile data returned from API"""
    id: int
    username: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    role: str
    date_joined: datetime
    created_at: datetime
    has_avatar: bool = False

    @staticmethod
    def resolve_first_name(obj):
        return obj.first_name or None

    @staticmethod
    def resolve_last_name(obj):
        return obj.last_name or None

    @staticmethod
    def resolve_email(obj):
        return obj.email or None

    @staticmethod
    def resolve_date_joined(obj):
        return obj.date_joined

    @staticmethod
    def resolve_created_at(obj):
        return obj.created_at

    @staticmethod
    def resolve_has_avatar(obj):
        return bool(obj.avatar)


class UserUpdateSchema(Schema):
    """Schema for updating user profile"""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None


class PasswordChangeSchema(Schema):
    """Schema for changing password"""
    current_password: str
    new_password: str
    confirm_password: str


class UserStatsSchema(Schema):
    """User statistics (role-dependent)"""
    total_tickets: int
    tickets_open: int
    tickets_in_progress: int
    tickets_resolved: int
    avg_resolution_time_hours: float
    member_since_days: int
