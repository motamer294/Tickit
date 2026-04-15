from ninja_extra import NinjaExtraAPI
from ninja_jwt.controller import NinjaJWTDefaultController
from ninja_jwt.authentication import JWTAuth
from ninja_jwt.tokens import AccessToken, RefreshToken
from ninja import Schema
from django.contrib.auth.hashers import make_password
from typing import List
from django.shortcuts import get_object_or_404
from django.db.models import Count, Avg, F
from tickets.schemas import DashboardStatsSchema
from accounts.models import User
from accounts.schemas import UserProfileSchema, UserUpdateSchema, PasswordChangeSchema, UserStatsSchema
from accounts.services import get_user_stats, update_user_profile, change_password
from tickets.models import Ticket, Comment
from tickets.services import update_ticket_status, create_ticket_with_ai
from tickets.schemas import (
    TicketCreateSchema,
    TicketOutSchema,
    CommentSchema,
    CommentOutSchema,
    TicketStatusUpdateSchema
)
from tickets.notification_service import notification_service
from tickets.realtime_service import realtime_service


# Custom AccessToken that includes user role
class CustomAccessToken(AccessToken):
    @classmethod
    def for_user(cls, user):
        """Generate token and add role field"""
        token = super().for_user(user)
        # Add role to the payload
        token.payload['role'] = getattr(user, 'role', 'CUSTOMER')
        return token


# Custom RefreshToken that uses CustomAccessToken for token regeneration
class CustomRefreshToken(RefreshToken):
    access_token_class = CustomAccessToken


# Custom RefreshToken that uses CustomAccessToken for token regeneration
class CustomRefreshToken(RefreshToken):
    access_token_class = CustomAccessToken


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
# 0.5 Custom Login with Role in JWT
class LoginSchema(Schema):
    username: str
    password: str

@api.post("/login", auth=None)
def login_with_role(request, data: LoginSchema):
    """
    Custom login endpoint that returns JWT with role field included.
    The default /token/pair doesn't include role, so we provide this alternative.
    """
    from django.contrib.auth import authenticate

    user = authenticate(username=data.username, password=data.password)

    if user is None:
        return api.create_response(
            request,
            {"message": "Invalid username or password"},
            status=401
        )

    # Generate tokens with role included
    access_token = CustomAccessToken.for_user(user)
    refresh_token = CustomRefreshToken.for_user(user)

    return {
        "access": str(access_token),
        "refresh": str(refresh_token),
        "user": {
            "id": user.id,
            "username": user.username,
            "role": user.role
        }
    }

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

    # Generate JWT tokens with custom token that includes role
    access_token = CustomAccessToken.for_user(user)
    refresh_token = CustomRefreshToken.for_user(user)

    return {
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "access": str(access_token),
        "refresh": str(refresh_token)
    }

# 2.5 Get Employees List (for dropdown in CreateTicket - Option A)
class EmployeeSchema(Schema):
    id: int
    username: str

@api.get("/employees", response=List[EmployeeSchema])
def list_employees(request):
    """Get all employees for assignment dropdown (managers only)"""
    if request.user.role != User.Role.MANAGER:
        return api.create_response(request, {"message": "Only managers can view employees"}, status=403)

    # Return User objects so Ninja serializes them properly as EmployeeSchema
    employees = User.objects.filter(role=User.Role.EMPLOYEE).order_by('username')
    return employees

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

    # � Send real-time notifications
    notification_service.ticket_assigned(ticket, employee, request.user)

    # 🔄 Broadcast real-time data update
    realtime_service.broadcast_ticket_updated(ticket, ['assigned_to', 'status'])

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
    # Input validation
    if not data.title or len(data.title) < 3 or len(data.title) > 500:
        return api.create_response(
            request,
            {"message": "Title must be between 3 and 500 characters"},
            status=400
        )

    if not data.description or len(data.description) < 10 or len(data.description) > 5000:
        return api.create_response(
            request,
            {"message": "Description must be between 10 and 5000 characters"},
            status=400
        )

    # Option A + C: Pass assignment parameters to service
    ticket = create_ticket_with_ai(
        title=data.title,
        description=data.description,
        user=request.user,
        assigned_to_id=data.assigned_to_id,  # Option A: Manual assignment
        auto_assign=data.auto_assign  # Option C: Auto-assign by workload
    )

    # 🔔 Send real-time notifications to managers
    notification_service.ticket_created(ticket, request.user)

    # 🔄 Broadcast real-time data update
    realtime_service.broadcast_ticket_created(ticket)

    return ticket

# 4. List My Tickets (Customers see their own, Managers see all, Employees see assigned)
@api.get("/my-tickets", response=List[TicketOutSchema])
def list_my_tickets(request):
    # FIX: Using User.Role enum
    if request.user.role == User.Role.MANAGER:
        return Ticket.objects.all()
    elif request.user.role == User.Role.EMPLOYEE:
        # Employees see tickets assigned to them
        return Ticket.objects.filter(assigned_to=request.user)
    else:
        # Customers see only tickets they created
        return Ticket.objects.filter(created_by=request.user)

# 4.5 Get Single Ticket Details
@api.get("/tickets/{ticket_id}", response=TicketOutSchema)
def get_ticket_detail(request, ticket_id: int):
    ticket = get_object_or_404(Ticket, id=ticket_id)

    # --- SECURITY/AUTHORIZATION CHECK ---
    # Users can only view their own tickets unless they are a manager
    is_manager = request.user.role == User.Role.MANAGER
    is_creator = ticket.created_by == request.user
    is_assignee = ticket.assigned_to == request.user

    if not (is_manager or is_creator or is_assignee):
        return api.create_response(
            request,
            {"message": "You do not have permission to view this ticket."},
            status=403
        )

    return ticket

# 4.6 Get Ticket Comments
@api.get("/tickets/{ticket_id}/comments", response=List[CommentOutSchema])
def get_ticket_comments(request, ticket_id: int):
    ticket = get_object_or_404(Ticket, id=ticket_id)

    # --- SECURITY/AUTHORIZATION CHECK ---
    # Same permission logic as viewing the ticket
    is_manager = request.user.role == User.Role.MANAGER
    is_creator = ticket.created_by == request.user
    is_assignee = ticket.assigned_to == request.user

    if not (is_manager or is_creator or is_assignee):
        return api.create_response(
            request,
            {"message": "You do not have permission to view comments on this ticket."},
            status=403
        )

    # Use select_related to eagerly load author and avoid N+1 queries
    comments = Comment.objects.filter(ticket=ticket).select_related('author').order_by('-created_at')
    return comments

# 5. Add Comment Endpoint
@api.post("/tickets/{ticket_id}/comments", response=CommentOutSchema)
def add_comment(request, ticket_id: int, data: CommentSchema):
    ticket = get_object_or_404(Ticket, id=ticket_id)

    # --- INPUT VALIDATION ---
    if not data.text or len(data.text) < 1 or len(data.text) > 2000:
        return api.create_response(
            request,
            {"message": "Comment must be between 1 and 2000 characters"},
            status=400
        )

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

    # 🔔 Send real-time notifications to users subscribed to this ticket
    notification_service.comment_added(ticket, comment, request.user)

    # 🔄 Broadcast real-time data update to trigger React Query invalidation
    # This ensures ALL users see the new comment immediately
    realtime_service.broadcast_comment_added(ticket.id, comment.id, request.user.username)

    return comment

# 5.5 Get Chat Messages for a Ticket
@api.get("/tickets/{ticket_id}/chat", response=List[dict])
def get_chat_messages(request, ticket_id: int):
    ticket = get_object_or_404(Ticket, id=ticket_id)

    # --- SECURITY/AUTHORIZATION CHECK ---
    # Same permission logic as viewing the ticket
    is_manager = request.user.role == User.Role.MANAGER
    is_creator = ticket.created_by == request.user
    is_assignee = ticket.assigned_to == request.user

    if not (is_manager or is_creator or is_assignee):
        return api.create_response(
            request,
            {"message": "You do not have permission to view chat messages on this ticket."},
            status=403
        )

    # Fetch chat messages with select_related for author
    from tickets.models import ChatMessage
    chat_messages = ChatMessage.objects.filter(
        ticket=ticket
    ).select_related('sender').order_by('timestamp')

    return [
        {
            'id': msg.id,
            'ticket_id': msg.ticket.id,
            'message': msg.message,
            'sender_id': msg.sender.id,
            'sender_username': msg.sender.username,
            'timestamp': msg.timestamp.isoformat(),
        }
        for msg in chat_messages
    ]

# 6. Update Ticket Status (Strict Access)
@api.patch("/tickets/{ticket_id}/status", response=TicketOutSchema)

def update_status(request, ticket_id: int, data: TicketStatusUpdateSchema):
    ticket = get_object_or_404(Ticket, id=ticket_id)
    old_status = ticket.status

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

    # 🔔 Send real-time notifications
    notification_service.ticket_updated(ticket, request.user, old_status, data.status)

    # 🔄 Broadcast real-time data update
    realtime_service.broadcast_ticket_updated(ticket, ['status'])

    return ticket


# 6.5 Delete Ticket (Manager Only)
@api.delete("/tickets/{ticket_id}")
def delete_ticket(request, ticket_id: int):
    ticket = get_object_or_404(Ticket, id=ticket_id)

    # --- SECURITY CHECK ---
    # Only managers can delete tickets
    if request.user.role != User.Role.MANAGER:
        return api.create_response(
            request,
            {"message": "Only managers can delete tickets."},
            status=403
        )

    # Save ticket info before deleting (for broadcasting)
    ticket_title = ticket.title

    # 🔔 Send notification before deleting (so we still have ticket data)
    notification_service.ticket_deleted(ticket, request.user)

    # Delete the ticket
    ticket.delete()

    # 🔄 Broadcast real-time data update
    realtime_service.broadcast_ticket_deleted(ticket_id, ticket_title)

    return api.create_response(
        request,
        {"message": f"Ticket #{ticket_id} has been deleted successfully."},
        status=200
    )


# 6.6 Update Ticket (Manager Only) - Edit title, description, category, priority
@api.patch("/tickets/{ticket_id}", response=TicketOutSchema)
def update_ticket(request, ticket_id: int, data: TicketCreateSchema):
    ticket = get_object_or_404(Ticket, id=ticket_id)

    # --- SECURITY CHECK ---
    # Only managers can edit tickets
    if request.user.role != User.Role.MANAGER:
        return api.create_response(
            request,
            {"message": "Only managers can edit tickets."},
            status=403
        )

    # Update fields
    if hasattr(data, 'title') and data.title:
        ticket.title = data.title
    if hasattr(data, 'description') and data.description:
        ticket.description = data.description

    ticket.save()

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


# ============================================
# 8. USER PROFILE MANAGEMENT ENDPOINTS
# ============================================

@api.get("/profile", response=UserProfileSchema)
def get_user_profile(request):
    """
    Get the current authenticated user's profile information.
    Accessible to all authenticated users.
    """
    return request.user


@api.get("/profile/stats", response=UserStatsSchema)
def get_profile_stats(request):
    """
    Get statistics for the current user.
    Stats depend on user role:
    - MANAGER: All tickets
    - EMPLOYEE: Assigned tickets
    - CUSTOMER: Created tickets
    """
    stats = get_user_stats(request.user)
    return stats


@api.patch("/profile", response=UserProfileSchema)
def update_profile(request, data: UserUpdateSchema):
    """
    Update the current user's profile information.
    Can update: first_name, last_name, email
    """
    try:
        user = update_user_profile(
            request.user,
            first_name=data.first_name,
            last_name=data.last_name,
            email=data.email
        )
        return user
    except ValueError as e:
        return api.create_response(
            request,
            {"message": str(e)},
            status=400
        )


@api.post("/profile/change-password")
def change_user_password(request, data: PasswordChangeSchema):
    """
    Change the current user's password.
    Requires: current_password, new_password, confirm_password
    """
    # Validate passwords match
    if data.new_password != data.confirm_password:
        return api.create_response(
            request,
            {"message": "Password confirmation does not match"},
            status=400
        )

    try:
        change_password(
            request.user,
            data.current_password,
            data.new_password
        )
        return api.create_response(
            request,
            {"message": "Password changed successfully"},
            status=200
        )
    except ValueError as e:
        return api.create_response(
            request,
            {"message": str(e)},
            status=400
        )

