from ninja import Schema
from datetime import datetime
from typing import Optional

# تذاكر
class TicketCreateSchema(Schema):
    title: str
    description: str

class TicketOutSchema(Schema):
    id: int
    title: str
    description: str
    status: str
    created_at: datetime

# تعليقات
class CommentSchema(Schema):
    text: str

class CommentOutSchema(Schema):
    id: int
    text: str
    author_username: Optional[str] = None
    created_at: datetime

    @staticmethod
    def resolve_author_username(obj):
        # نستخدم الـ username الخاص بكاتب التعليق
        return obj.author.username if getattr(obj, "author", None) else None
    @staticmethod
    def resolve_text(obj):
        return obj.message