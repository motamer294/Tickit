from ninja_extra import NinjaExtraAPI
from ninja_jwt.controller import NinjaJWTDefaultController
from ninja_jwt.authentication import JWTAuth
from ninja import Schema  
from django.contrib.auth.hashers import make_password
from typing import List
from django.shortcuts import get_object_or_404
from django.db.models import Count, Avg, F
from tickets.schemas import DashboardStatsSchema
from accounts.models import User
from tickets.models import Ticket, Comment
from tickets.services import update_ticket_status,create_ticket_with_ai
from tickets.schemas import (
    TicketCreateSchema, 
    TicketOutSchema, 
    CommentSchema, 
    CommentOutSchema,
    TicketStatusUpdateSchema
)


class GlobalAuth(JWTAuth):
    def authenticate(self, request, token):
        return super().authenticate(request, token)
    
api = NinjaExtraAPI(
    auth=GlobalAuth(),
    title="Help Desk API",
    description="API for managing support tickets, users, and comments in a help desk system."
)
api.register_controllers(NinjaJWTDefaultController)

# --- Endpoints ---
#Sign up 
# 1. Define the Schema for Input
class UserSignupSchema(Schema):
    username: str
    password: str
    role: str = "CUSTOMER" # Default to Customer

# 2. Create the Endpoint
@api.post("/signup", auth=None) # auth=None allows public access
def signup(request, data: UserSignupSchema):
    # Check if username exists
    if User.objects.filter(username=data.username).exists():
        return api.create_response(request, {"message": "Username already taken"}, status=400)
    
    # Create User
    user = User.objects.create(
        username=data.username,
        password=make_password(data.password), # Hash the password!
        role=data.role
    )
    
    return {"id": user.id, "username": user.username, "role": user.role}
####################
#Tickets
# 1. Assign Ticket (Strict Role Check)
@api.patch("/tickets/{ticket_id}/assign/{employee_id}", response=TicketOutSchema)
def assign_ticket(request, ticket_id: int, employee_id: int):
    # Use the Enum (User.Role.MANAGER) instead of the string "MANAGER"
    if request.user.role != User.Role.MANAGER:
        return api.create_response(request, {"message": "Permission denied"}, status=403)
    
    ticket = get_object_or_404(Ticket, id=ticket_id)
    employee = get_object_or_404(User, id=employee_id, role=User.Role.EMPLOYEE) # Check employee role too!
    
    # Use our Service to handle history & status safely
    ticket.assigned_to = employee
    update_ticket_status(ticket, "IN_PROGRESS", request.user)
    ticket.save()
    
    return ticket

# 2. Employee Tasks (Strict Access)
@api.get("/employee/tasks", response=List[TicketOutSchema])
def list_employee_tasks(request):
    # Only Employees should see this endpoint
    if request.user.role != User.Role.EMPLOYEE:
        return api.create_response(request, {"message": "Only employees have tasks"}, status=403)

    return Ticket.objects.filter(assigned_to=request.user)
# 3. Create Ticket (Open to Customers & Employees)
@api.post("/tickets", response=TicketOutSchema)
def create_ticket(request, data: TicketCreateSchema):
    # مسحنا الطريقة القديمة:
    # ticket = Ticket.objects.create(**data.dict(), created_by=request.user)
    
    # استخدمنا الـ AI Service بتاعتنا:
    ticket = create_ticket_with_ai(
        title=data.title,
        description=data.description,
        user=request.user
    )
    return ticket

# 4. List My Tickets (Customers see their own, Managers see all)
@api.get("/my-tickets", response=List[TicketOutSchema])
def list_my_tickets(request):
    # FIX: Using User.Role enum
    if request.user.role == User.Role.MANAGER:
        return Ticket.objects.all()
    return Ticket.objects.filter(created_by=request.user)

# 5. Add Comment Endpoint
@api.post("/tickets/{ticket_id}/comments", response=CommentOutSchema)
def add_comment(request, ticket_id: int, data: CommentSchema):
    ticket = get_object_or_404(Ticket, id=ticket_id)
    
    # --- SECURITY/AUTHORIZATION CHECK ---
    # Determine if the user has rights to this specific ticket
    is_manager = request.user.role == User.Role.MANAGER
    is_creator = ticket.created_by == request.user
    is_assignee = ticket.assigned_to == request.user
    
    # If they are none of these, block the request
    if not (is_manager or is_creator or is_assignee):
        return api.create_response(
            request, 
            {"message": "You do not have permission to comment on this ticket."}, 
            status=403
        )
    # ------------------------------------
    
    comment = Comment.objects.create(
        ticket=ticket,
        author=request.user,
        text=data.text
    )
    return comment
# 6. Update Ticket Status (Strict Access)
@api.patch("/tickets/{ticket_id}/status", response=TicketOutSchema)

def update_status(request, ticket_id: int, data: TicketStatusUpdateSchema):
    ticket = get_object_or_404(Ticket, id=ticket_id)

    # --- SECURITY CHECK ---
    # Only the agent working on the ticket or an IT Manager can change its status
    is_manager = request.user.role == User.Role.MANAGER
    is_assignee = ticket.assigned_to == request.user

    if not (is_manager or is_assignee):
        return api.create_response(
            request, 
            {"message": "Only the assigned agent or a manager can update the status."}, 
            status=403
        )

    # --- VALIDATION CHECK ---
    # Prevent the frontend from sending made-up statuses like "SUPER_DONE"
    valid_statuses = [choice[0] for choice in Ticket.Status.choices]
    if data.status not in valid_statuses:
         return api.create_response(
            request, 
            {"message": f"Invalid status. Must be one of: {valid_statuses}"}, 
            status=400
        )

    # --- EXECUTE BUSINESS LOGIC ---
    # This calls the service we already wrote in services.py
    # It safely updates the ticket AND generates the TicketHistory audit log in one transaction
    update_ticket_status(ticket, data.status, request.user)

    return ticket
# 7. Analytics Dashboard (Strictly for Managers)
@api.get("/analytics/dashboard", response=DashboardStatsSchema)
def get_dashboard_stats(request):
    # حماية الـ API: المديرين بس هما اللي يشوفوا الإحصائيات
    if request.user.role != User.Role.MANAGER:
        return api.create_response(request, {"message": "Access Denied: Managers only."}, status=403)

    # 1. الأرقام الأساسية
    total = Ticket.objects.count()
    open_count = Ticket.objects.filter(status=Ticket.Status.OPEN).count()
    resolved_count = Ticket.objects.filter(status__in=[Ticket.Status.RESOLVED, Ticket.Status.CLOSED]).count()

    # 2. حساب متوسط وقت الحل (MTTR)
    resolved_tickets = Ticket.objects.filter(resolved_at__isnull=False)
    mttr_delta = resolved_tickets.aggregate(
        mttr=Avg(F('resolved_at') - F('created_at'))
    )['mttr']

    mttr_hours = 0.0
    if mttr_delta:
        # تحويل الوقت الكلي لساعات وتقريبه لرقمين عشريين
        mttr_hours = round(mttr_delta.total_seconds() / 3600, 2)

    # 3. التجميع (Aggregations) للـ Charts
    # بتجيب كل تصنيف وبتعد جواه كام تذكرة، وبنحولها لـ Dictionary
    categories = {
        item['category'] or "Uncategorized": item['count'] 
        for item in Ticket.objects.values('category').annotate(count=Count('id'))
    }
    
    priorities = {
        item['priority'] or "None": item['count'] 
        for item in Ticket.objects.values('priority').annotate(count=Count('id'))
    }
    
    sentiments = {
        item['sentiment'] or "Unknown": item['count'] 
        for item in Ticket.objects.values('sentiment').annotate(count=Count('id'))
    }

    return {
        "total_tickets": total,
        "open_tickets": open_count,
        "resolved_tickets": resolved_count,
        "avg_resolution_time_hours": mttr_hours,
        "tickets_by_category": categories,
        "tickets_by_priority": priorities,
        "sentiment_analysis": sentiments
    }