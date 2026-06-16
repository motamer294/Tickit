from ninja_extra import NinjaExtraAPI
from ninja_jwt.controller import NinjaJWTDefaultController
from ninja_jwt.authentication import JWTAuth
from ninja_jwt.tokens import AccessToken, RefreshToken
from ninja import Schema
from django.contrib.auth.hashers import make_password
from typing import List, Optional, Dict, Any
from datetime import datetime
from django.shortcuts import get_object_or_404
from django.db.models import Count, Avg, F, Q, Value, CharField
from django.db.models.functions import Coalesce, TruncDate, Upper
from django.db import transaction
from tickets.schemas import DashboardStatsSchema
from accounts.models import User
from accounts.schemas import UserProfileSchema, UserUpdateSchema, PasswordChangeSchema, UserStatsSchema
from accounts.services import (
    get_user_stats,
    update_user_profile,
    change_password,
    update_user_avatar,
    delete_user_avatar,
)
from tickets.models import Ticket, Comment, Category, Tag, Attachment
from tickets.services import update_ticket_status, create_ticket as create_ticket_record
from tickets.schemas import (
    TicketCreateSchema,
    TicketOutSchema,
    TicketUpdateSchema,
    CommentSchema,
    CommentOutSchema,
    TicketStatusUpdateSchema,
    CategorySchema,
    TagSchema,
    DashboardStatsSchema,
    SLASchema,
    SLACreateSchema,
    AuditLogSchema,
    UserDetailSchema,
    UserCreateSchema,
    UserUpdateSchema,
)
# Import schemas module for typing
import tickets.schemas as schemas
from tickets.notification_service import notification_service
from tickets.realtime_service import realtime_service
from tickets.audit_service import audit_service
# Import departments router
from departments.views import router as departments_router
from tickets.tasks import ai_triage_ticket


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

# 2.1 Validate Token / Get Current User
@api.get("/user/me")
def get_current_user(request):
    """Get current authenticated user info - used for token validation"""
    return {
        "id": request.user.id,
        "username": request.user.username,
        "role": request.user.role,
    }

# 2.5 Get Employees List (for dropdown in CreateTicket)
# IMPORTANT: Returns comprehensive employee data with team and department information
@api.get("/employees")
def list_employees(request):
    """Get all employees for assignment in tickets - with complete team/department info"""
    if request.user.role != User.Role.MANAGER:
        return {"message": "Only managers can view employees"}, 403

    # Build comprehensive employee response manually without Pydantic filtering
    employees = User.objects.filter(
        role__in=[User.Role.EMPLOYEE, User.Role.MANAGER]
    ).select_related('team__department')

    result = []
    for emp in employees:
        team_dict = None
        if emp.team:
            team_dict = {
                'id': emp.team.id,
                'name': emp.team.name,
                'description': emp.team.description or '',
                'department_id': emp.team.department_id,
                'is_active': emp.team.is_active,
                'team_lead_id': emp.team.team_lead_id,
                'employee_count': emp.team.members.filter(is_active=True).count(),
            }

        dept_dict = None
        if emp.team and emp.team.department:
            dept_dict = {
                'id': emp.team.department.id,
                'name': emp.team.department.name,
                'description': emp.team.department.description or '',
            }

        result.append({
            'id': emp.id,
            'username': emp.username,
            'email': emp.email,
            'first_name': emp.first_name or '',
            'last_name': emp.last_name or '',
            'role': emp.role,
            'team_id': emp.team_id,
            'team': team_dict,
            'department': dept_dict,
        })
        
    return result

# ==========================================
# 3. Categories Endpoints
# ==========================================
@api.get("/categories", response=List[CategorySchema])
def list_categories(request):
    """Get all ticket categories"""
    categories = Category.objects.all().order_by('name')
    return categories

class CategoryCreateSchema(Schema):
    name: str
    description: str = ""
    color: str = "#007bff"

@api.post("/categories", response=CategorySchema)
def create_category(request, data: CategoryCreateSchema):
    """Create new ticket category (admin/manager only)"""
    if request.user.role not in [User.Role.MANAGER]:
        return api.create_response(request, {"message": "Permission denied"}, status=403)

    if Category.objects.filter(name=data.name).exists():
        return api.create_response(
            request,
            {"message": f"Category '{data.name}' already exists"},
            status=400
        )

    category = Category.objects.create(
        name=data.name,
        description=data.description,
        color=data.color
    )
    from tickets.audit_service import audit_service
    audit_service.log_category_created(category, request.user, request)
    return category

class CategoryUpdateSchema(Schema):
    name: str = None
    description: str = None
    color: str = None

@api.patch("/categories/{category_id}", response=CategorySchema)
def update_category(request, category_id: int, data: CategoryUpdateSchema):
    """Update a ticket category (admin/manager only)"""
    if request.user.role not in [User.Role.MANAGER]:
        return api.create_response(request, {"message": "Permission denied"}, status=403)

    category = get_object_or_404(Category, id=category_id)

    if data.name and data.name != category.name:
        if Category.objects.filter(name=data.name).exists():
            return api.create_response(
                request,
                {"message": f"Category '{data.name}' already exists"},
                status=400
            )
        category.name = data.name

    changed_fields = {}
    if data.description is not None:
        changed_fields['description'] = data.description
        category.description = data.description

    if data.color is not None:
        changed_fields['color'] = data.color
        category.color = data.color

    category.save()
    from tickets.audit_service import audit_service
    audit_service.log_category_updated(category, changed_fields, request.user, request)
    return category

@api.delete("/categories/{category_id}")
def delete_category(request, category_id: int):
    """Delete a ticket category (admin/manager only)"""
    if request.user.role not in [User.Role.MANAGER]:
        return api.create_response(request, {"message": "Permission denied"}, status=403)

    category = get_object_or_404(Category, id=category_id)
    cat_id, cat_name = category.id, category.name
    category.delete()
    from tickets.audit_service import audit_service
    audit_service.log_category_deleted(cat_id, cat_name, request.user, request)
    return api.create_response(request, {"message": "Category deleted successfully"})

# ==========================================
# 4. Tags Endpoints
# ==========================================
@api.get("/tags", response=List[TagSchema])
def list_tags(request):
    """Get all available tags"""
    tags = Tag.objects.all().order_by('name')
    return tags

class TagCreateSchema(Schema):
    name: str
    color: str = "#6c757d"

@api.post("/tags", response=TagSchema)
def create_tag(request, data: TagCreateSchema):
    """Create new tag (any authenticated user)"""
    # Normalize tag name (lowercase, no spaces)
    tag_name = data.name.lower().strip().replace(" ", "-")

    if Tag.objects.filter(name=tag_name).exists():
        return api.create_response(
            request,
            {"message": f"Tag '#{tag_name}' already exists"},
            status=400
        )

    tag = Tag.objects.create(
        name=tag_name,
        color=data.color
    )
    from tickets.audit_service import audit_service
    audit_service.log_tag_created(tag, request.user, request)
    return tag

class TagUpdateSchema(Schema):
    name: str = None
    color: str = None

@api.patch("/tags/{tag_id}", response=TagSchema)
def update_tag(request, tag_id: int, data: TagUpdateSchema):
    """Update a tag (admin/manager only)"""
    if request.user.role not in [User.Role.MANAGER]:
        return api.create_response(request, {"message": "Permission denied"}, status=403)

    tag = get_object_or_404(Tag, id=tag_id)

    if data.name:
        # Normalize tag name (lowercase, no spaces)
        tag_name = data.name.lower().strip().replace(" ", "-")
        if tag_name != tag.name and Tag.objects.filter(name=tag_name).exists():
            return api.create_response(
                request,
                {"message": f"Tag '#{tag_name}' already exists"},
                status=400
            )
        tag.name = tag_name

    tag_changed_fields = {}
    if data.color is not None:
        tag_changed_fields['color'] = data.color
        tag.color = data.color

    tag.save()
    from tickets.audit_service import audit_service
    audit_service.log_tag_updated(tag, tag_changed_fields, request.user, request)
    return tag

@api.delete("/tags/{tag_id}")
def delete_tag(request, tag_id: int):
    """Delete a tag (admin/manager only)"""
    if request.user.role not in [User.Role.MANAGER]:
        return api.create_response(request, {"message": "Permission denied"}, status=403)

    tag = get_object_or_404(Tag, id=tag_id)
    tag_id_saved, tag_name_saved = tag.id, tag.name
    tag.delete()
    from tickets.audit_service import audit_service
    audit_service.log_tag_deleted(tag_id_saved, tag_name_saved, request.user, request)
    return api.create_response(request, {"message": "Tag deleted successfully"})

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

    from tickets.audit_service import audit_service
    audit_service.log_ticket_assigned(ticket, employee, request.user, request)

    # Use our Service to handle history & status safely
    ticket.assigned_to = employee
    update_ticket_status(ticket, "IN_PROGRESS", request.user)
    ticket.save()

    # Send real-time notifications
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

    # Save ticket instantly — no AI call here
    ticket = create_ticket_record(
        title=data.title,
        description=data.description,
        user=request.user,
        category_id=data.category_id,
        tag_ids=data.tag_ids,
        priority=data.priority,
        assigned_to_id=data.assigned_to_id
    )

    # Dispatch AI triage as a background Celery task (non-blocking)
    ai_triage_ticket.delay(ticket.id)

    # 🔔 Send real-time notifications to managers
    notification_service.ticket_created(ticket, request.user)

    # � Log audit trail
    audit_service.log_ticket_created(ticket, request.user, request)

    # �🔄 Broadcast real-time data update
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

# 4.3 Search/Filter Tickets (moved to a separate path to avoid route conflicts)
@api.get("/search/tickets", response=List[TicketOutSchema])
def search_tickets(
    request,
    query: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    category_id: Optional[int] = None,
    tag_ids: Optional[str] = None,  # comma-separated IDs
    assigned_to_id: Optional[int] = None,
    created_from: Optional[str] = None,  # ISO format: 2024-01-01
    created_to: Optional[str] = None,
):
    """
    Search and filter tickets.
    - query: Search in title + description
    - status: Filter by status (OPEN, PENDING, IN_PROGRESS, RESOLVED, CLOSED)
    - priority: Filter by priority (LOW, MEDIUM, HIGH, URGENT)
    - category_id: Filter by category
    - tag_ids: Filter by tags (comma-separated)
    - assigned_to_id: Filter by assignee
    - created_from: Date range start (YYYY-MM-DD)
    - created_to: Date range end (YYYY-MM-DD)
    """
    try:
        # Base queryset with user permissions
        if request.user.role == User.Role.MANAGER:
            tickets = Ticket.objects.all()
        elif request.user.role == User.Role.EMPLOYEE:
            tickets = Ticket.objects.filter(assigned_to=request.user)
        else:
            tickets = Ticket.objects.filter(created_by=request.user)

        # Apply filters
        filters = Q()

        # Text search
        if query:
            filters &= Q(title__icontains=query) | Q(description__icontains=query)

        # Status filter
        if status:
            filters &= Q(status=status)

        # Priority filter
        if priority:
            filters &= Q(priority=priority)

        # Category filter
        if category_id:
            filters &= Q(category_id=category_id)

        # Assigned to filter
        if assigned_to_id:
            filters &= Q(assigned_to_id=assigned_to_id)

        # Date range filter
        if created_from:
            try:
                from_date = datetime.fromisoformat(created_from.strip())
                filters &= Q(created_at__gte=from_date)
            except (ValueError, AttributeError) as e:
                print(f"⚠️ Invalid created_from date: {created_from} - {str(e)}")

        if created_to:
            try:
                to_date = datetime.fromisoformat(created_to.strip())
                filters &= Q(created_at__lte=to_date)
            except (ValueError, AttributeError) as e:
                print(f"⚠️ Invalid created_to date: {created_to} - {str(e)}")

        # Tag filter (many-to-many)
        if tag_ids:
            try:
                tag_list = [int(t) for t in tag_ids.split(',') if t.strip()]
                if tag_list:
                    tickets = tickets.filter(tags__id__in=tag_list).distinct()
            except (ValueError, AttributeError) as e:
                print(f"⚠️ Invalid tag_ids: {tag_ids} - {str(e)}")

        tickets = tickets.filter(filters).distinct()

        # Order by newest first
        return tickets.order_by('-created_at')
    except Exception as e:
        print(f"❌ Error in search_tickets: {str(e)}")
        import traceback
        traceback.print_exc()
        # Return empty list on error
        return []
# 4.4 Get Single Ticket Details
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
@transaction.atomic
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

    # � Log audit trail
    audit_service.log_comment_added(ticket, request.user, request)

    # �🔄 Broadcast real-time data update to trigger React Query invalidation
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
    try:
        update_ticket_status(ticket, data.status, request.user)
    except ValueError as e:
        return api.create_response(
            request,
            {"message": str(e), "available": ticket.get_available_transitions_display()},
            status=400
        )

    # � Log audit trail
    audit_service.log_status_changed(ticket, old_status, data.status, request.user, request)

    # �🔔 Send real-time notifications
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

    # 📝 Log audit trail
    audit_service.log_ticket_deleted(ticket_id, ticket_title, request.user, request)

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
def update_ticket(request, ticket_id: int, data: TicketUpdateSchema):
    ticket = get_object_or_404(Ticket, id=ticket_id)

    print(f"[UPDATE_TICKET] Received data: title={data.title}, description={data.description}, priority={data.priority}, category_id={data.category_id}, tag_ids={data.tag_ids}")

    # --- SECURITY CHECK ---
    # Only managers can edit tickets (priority, category, tags, title, description)
    if request.user.role != User.Role.MANAGER:
        return api.create_response(
            request,
            {"message": "Only managers can edit ticket details."},
            status=403
        )

    # ✅ VALIDATE ALL FOREIGN KEYS BEFORE SAVING
    fields_updated = []
    category_obj = None
    tag_objs = []

    # Validate category if provided
    if data.category_id is not None:
        print(f"[UPDATE_TICKET] Validating category_id={data.category_id}")
        category_obj = get_object_or_404(Category, id=data.category_id)
        print(f"[UPDATE_TICKET] Category found: {category_obj.name}")
    else:
        print(f"[UPDATE_TICKET] No category_id provided, keeping existing")

    # Validate all tags if provided
    if data.tag_ids is not None:
        print(f"[UPDATE_TICKET] Validating tag_ids={data.tag_ids}")
        tag_objs = []
        for tag_id in data.tag_ids:
            tag = get_object_or_404(Tag, id=tag_id)
            tag_objs.append(tag)
        print(f"[UPDATE_TICKET] Tags found: {[t.name for t in tag_objs]}")
    else:
        print(f"[UPDATE_TICKET] No tag_ids provided, keeping existing")

    # ✅ NOW UPDATE FIELDS (validation passed)
    if data.title and data.title.strip():
        ticket.title = data.title
        fields_updated.append('title')
        print(f"[UPDATE_TICKET] Updated title: {data.title}")
    if data.description and data.description.strip():
        ticket.description = data.description
        fields_updated.append('description')
        print(f"[UPDATE_TICKET] Updated description")
    if data.priority:
        ticket.priority = data.priority
        fields_updated.append('priority')
        print(f"[UPDATE_TICKET] Updated priority: {data.priority}")
    if data.category_id is not None:
        ticket.category = category_obj
        fields_updated.append('category')
        print(f"[UPDATE_TICKET] Updated category: {category_obj.name if category_obj else 'None'}")
    if data.tag_ids is not None:
        ticket.tags.clear()
        for tag in tag_objs:
            ticket.tags.add(tag)
        fields_updated.append('tags')
        print(f"[UPDATE_TICKET] Updated tags: {[t.name for t in tag_objs]}")

    ticket.save()
    print(f"[UPDATE_TICKET] Ticket saved. Fields updated: {fields_updated}")

    # 📝 Log audit trail
    audit_service.log_ticket_updated(ticket, request.user, request)

    # 🔔 Send real-time notifications
    notification_service.ticket_updated(ticket, request.user, None, None)

    # 🔄 Broadcast real-time data update
    realtime_service.broadcast_ticket_updated(ticket, fields_updated)

    return ticket


# 7. Analytics Dashboard (Strictly for Managers)
@api.get("/analytics/dashboard", response=DashboardStatsSchema)
def get_dashboard_stats(request):
    """
    Get dashboard statistics based on user role.
    - MANAGER: All tickets
    - EMPLOYEE: Assigned tickets + created tickets visible to them
    - CUSTOMER: Created tickets + assigned tickets visible to them
    """

    # Filter tickets based on user role
    if request.user.role == User.Role.MANAGER:
        tickets = Ticket.objects.all()
    elif request.user.role == User.Role.EMPLOYEE:
        # Employees see assigned tickets + tickets they created (if any)
        from django.db.models import Q
        tickets = Ticket.objects.filter(
            Q(assigned_to=request.user) | Q(created_by=request.user)
        ).distinct()
    else:  # CUSTOMER
        # Customers see only tickets they created
        tickets = Ticket.objects.filter(created_by=request.user)

    # 1. Basic counts
    total = tickets.count()
    open_count = tickets.filter(status=Ticket.Status.OPEN).count()
    resolved_count = tickets.filter(
        status__in=[Ticket.Status.RESOLVED, Ticket.Status.CLOSED]
    ).count()

    # 2. Calculate average resolution time (MTTR)
    resolved_tickets = tickets.filter(resolved_at__isnull=False)
    mttr_delta = resolved_tickets.aggregate(
        mttr=Avg(F('resolved_at') - F('created_at'))
    )['mttr']

    mttr_hours = 0.0
    if mttr_delta:
        mttr_hours = round(mttr_delta.total_seconds() / 3600, 2)

    # 3. Aggregations for Charts - Use related field names for categories
    # Categories: Get category names, with fallback to "Uncategorized" for NULL
    categories_data = tickets.annotate(
        category_name=Coalesce('category__name', Value('Uncategorized'), output_field=CharField())
    ).values('category_name').annotate(count=Count('id')).order_by('category_name')

    categories = {
        item['category_name']: item['count']
        for item in categories_data
    }

    # Priorities: Normalize to uppercase and aggregate
    priorities_data = tickets.annotate(
        priority_name=Upper(Coalesce('priority', Value('None'), output_field=CharField()))
    ).values('priority_name').annotate(count=Count('id')).order_by('priority_name')

    priorities = {
        item['priority_name']: item['count']
        for item in priorities_data
    }

    # Sentiments: Normalize to uppercase and aggregate
    sentiments_data = tickets.annotate(
        sentiment_name=Upper(Coalesce('sentiment', Value('Unknown'), output_field=CharField()))
    ).values('sentiment_name').annotate(count=Count('id')).order_by('sentiment_name')

    sentiments = {
        item['sentiment_name']: item['count']
        for item in sentiments_data
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


@api.get("/analytics/trends")
def get_dashboard_trends(request):
    """
    Get ticket creation trends for the last 30 days (grouped by day).
    Returns data for line chart: date -> count
    Accessible based on user role: managers see all, employees see their own
    """
    from datetime import timedelta

    # Calculate date range: last 30 days
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=30)

    # Base query based on user role
    if request.user.role == User.Role.MANAGER:
        query = Ticket.objects.all()
    elif request.user.role == User.Role.EMPLOYEE:
        query = Ticket.objects.filter(assigned_to=request.user)
    else:  # CUSTOMER
        query = Ticket.objects.filter(created_by=request.user)

    # Group by date and count
    trends = (
        query.filter(created_at__date__gte=start_date, created_at__date__lte=end_date)
        .annotate(date=TruncDate('created_at'))
        .values('date')
        .annotate(count=Count('id'))
        .order_by('date')
    )

    # Convert to list of dicts for JSON serialization
    # Fill in missing dates with 0 count
    trend_dict = {item['date'].isoformat(): item['count'] for item in trends}

    # Generate all dates in range and fill gaps
    current_date = start_date
    result = []
    while current_date <= end_date:
        iso_date = current_date.isoformat()
        result.append({
            "date": iso_date,
            "count": trend_dict.get(iso_date, 0)
        })
        current_date += timedelta(days=1)

    return result


@api.get("/analytics/team-workload")
def get_team_workload(request):
    """
    Get workload distribution across team members.
    Returns: list of {employee_name, open_tickets, resolved_tickets, total_tickets, avg_resolution_time}
    Manager only endpoint.
    """
    if request.user.role != User.Role.MANAGER:
        return api.create_response(
            request,
            {"message": "Access Denied: Managers only."},
            status=403
        )

    from django.db.models import Count, Avg, Q, F

    # Get all employees
    employees = User.objects.filter(role=User.Role.EMPLOYEE)

    workload_data = []
    for employee in employees:
        total_assigned = Ticket.objects.filter(assigned_to=employee).count()
        open_assigned = Ticket.objects.filter(
            assigned_to=employee,
            status__in=[Ticket.Status.OPEN, Ticket.Status.IN_PROGRESS]
        ).count()
        resolved_assigned = Ticket.objects.filter(
            assigned_to=employee,
            status__in=[Ticket.Status.RESOLVED, Ticket.Status.CLOSED]
        ).count()

        # Calculate avg resolution time for this employee
        resolved_tickets = Ticket.objects.filter(
            assigned_to=employee,
            resolved_at__isnull=False
        )
        mttr_delta = resolved_tickets.aggregate(
            mttr=Avg(F('resolved_at') - F('created_at'))
        )['mttr']

        avg_resolution_hours = 0.0
        if mttr_delta:
            avg_resolution_hours = round(mttr_delta.total_seconds() / 3600, 2)

        workload_data.append({
            "employee_id": employee.id,
            "employee_name": f"{employee.first_name} {employee.last_name}".strip() or employee.username,
            "open_tickets": open_assigned,
            "resolved_tickets": resolved_assigned,
            "total_tickets": total_assigned,
            "avg_resolution_hours": avg_resolution_hours
        })

    return workload_data


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
        changed_fields = {k: v for k, v in {'first_name': data.first_name, 'last_name': data.last_name, 'email': data.email}.items() if v is not None}
        user = update_user_profile(
            request.user,
            first_name=data.first_name,
            last_name=data.last_name,
            email=data.email
        )
        from tickets.audit_service import audit_service
        audit_service.log_user_profile_updated(user, changed_fields, request.user, request)
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
        from tickets.audit_service import audit_service
        audit_service.log_user_password_changed(request.user, request)
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


@api.post("/profile/avatar", response=UserProfileSchema)
def upload_profile_avatar(request):
    """
    Upload (or replace) the current user's profile picture.
    Accepts a multipart/form-data request with a "file" field.
    Allowed types: JPG, PNG, WebP. Max size: 2MB.
    """
    uploaded_file = request.FILES.get('file')
    if not uploaded_file:
        return api.create_response(
            request,
            {"message": "No file provided"},
            status=400
        )

    try:
        user = update_user_avatar(request.user, uploaded_file)
        from tickets.audit_service import audit_service
        audit_service.log_user_profile_updated(user, {'avatar': 'updated'}, request.user, request)
        return user
    except ValueError as e:
        return api.create_response(
            request,
            {"message": str(e)},
            status=400
        )


@api.get("/users/{user_id}/avatar")
def get_user_avatar(request, user_id: int):
    """
    Return a user's profile picture file.
    Avatars are treated like usernames/roles: visible to any authenticated
    user, not just the owner (matches how creator/assignee identities are
    already shown across tickets, chat and audit logs regardless of viewer
    role). This also serves the current user's own avatar (user_id == self).
    """
    target_user = User.objects.filter(id=user_id).first()
    if not target_user or not target_user.avatar:
        return api.create_response(
            request,
            {"message": "No avatar set"},
            status=404
        )

    from django.http import FileResponse
    try:
        response = FileResponse(target_user.avatar.open('rb'))
        response['Content-Disposition'] = f'inline; filename="{target_user.avatar.name.split("/")[-1]}"'
        return response
    except Exception as e:
        return api.create_response(
            request,
            {"message": f"Failed to load avatar: {str(e)}"},
            status=500
        )


@api.delete("/profile/avatar", response=UserProfileSchema)
def remove_profile_avatar(request):
    """Remove the current user's profile picture."""
    user = delete_user_avatar(request.user)
    from tickets.audit_service import audit_service
    audit_service.log_user_profile_updated(user, {'avatar': 'removed'}, request.user, request)
    return user


# ====== AJAX LONG POLLING FALLBACK ENDPOINTS ======
# These endpoints provide a fallback when WebSocket is unavailable

from django.views.decorators.http import require_http_methods
from django.http import JsonResponse
from django.utils import timezone
import asyncio
import json
import time
from channels.layers import get_channel_layer


class MessageQueueSchema(Schema):
    """Schema for queueing a message"""
    message_type: str
    data: dict


class PollResponseSchema(Schema):
    """Schema for polling response"""
    messages: List[dict]
    has_more: bool = False


def get_message_queue_key(user_id: int) -> str:
    """Generate Redis key for user message queue"""
    return f"message_queue:{user_id}"


def get_message_buffer_key(user_id: int) -> str:
    """Generate Redis key for message buffer (in-memory during poll)"""
    return f"message_buffer:{user_id}"


@api.post("/message_queue/send", response=dict)
def queue_message_for_polling(request, data: MessageQueueSchema):
    """
    Queue a message for a user (for polling fallback).
    This is primarily used internally when WebSocket delivery fails.

    Args:
        data: MessageQueueSchema with message_type and data

    Returns:
        Confirmation that message was queued
    """
    try:
        from django_redis import get_redis_connection

        redis_conn = get_redis_connection("default")
        queue_key = get_message_queue_key(request.user.id)

        message = {
            "type": data.message_type,
            "data": data.data,
            "timestamp": timezone.now().isoformat()
        }

        # Push to Redis list (queue)
        redis_conn.lpush(queue_key, json.dumps(message))

        # Set expiry: 1 hour (messages will be auto-deleted)
        redis_conn.expire(queue_key, 3600)

        return {
            "status": "queued",
            "queue_length": redis_conn.llen(queue_key)
        }
    except Exception as e:
        return api.create_response(
            request,
            {"message": f"Failed to queue message: {str(e)}"},
            status=500
        )


@api.get("/message_queue/receive", response=PollResponseSchema)
def poll_for_messages(request):
    """
    Long polling endpoint - returns messages queued for this user.
    Blocks for up to 30 seconds waiting for messages.

    Query Parameters:
        timeout: Number of seconds to wait (default: 30, max: 60)

    Returns:
        List of messages and whether more are available
    """
    try:
        from django_redis import get_redis_connection

        redis_conn = get_redis_connection("default")
        queue_key = get_message_queue_key(request.user.id)

        # Get timeout from query params, default 30, max 60
        timeout = min(int(request.query_params.get("timeout", 30)), 60)
        timeout = max(timeout, 1)  # minimum 1 second

        messages = []
        start_time = time.time()
        poll_interval = 0.5  # Check every 500ms

        # Poll for messages with timeout
        while time.time() - start_time < timeout:
            # Try to get one message from the queue
            message_data = redis_conn.rpop(queue_key)

            if message_data:
                message = json.loads(message_data)
                messages.append(message)

                # Check if there are more messages without waiting
                while True:
                    more_message = redis_conn.rpop(queue_key)
                    if not more_message:
                        break
                    messages.append(json.loads(more_message))

                # If we got messages, return immediately
                if messages:
                    return {
                        "messages": messages,
                        "has_more": redis_conn.llen(queue_key) > 0
                    }

            # Wait before next check (non-blocking)
            time.sleep(poll_interval)

        # Return empty list if timeout reached
        return {
            "messages": [],
            "has_more": redis_conn.llen(queue_key) > 0
        }

    except Exception as e:
        return api.create_response(
            request,
            {"message": f"Polling error: {str(e)}"},
            status=500
        )


@api.delete("/message_queue/clear", response=dict)
def clear_message_queue(request):
    """
    Clear all queued messages for current user.
    Useful for cleanup when switching back to WebSocket.
    """
    try:
        from django_redis import get_redis_connection

        redis_conn = get_redis_connection("default")
        queue_key = get_message_queue_key(request.user.id)

        count = redis_conn.llen(queue_key)
        redis_conn.delete(queue_key)

        return {
            "status": "cleared",
            "messages_removed": count
        }
    except Exception as e:
        return api.create_response(
            request,
            {"message": f"Failed to clear queue: {str(e)}"},
            status=500
        )


# ==========================================
# 8. Attachments (File Uploads/Downloads)
# ==========================================

# 8.1 Upload File to Ticket
@api.post("/tickets/{ticket_id}/attachments", response=dict)
def upload_attachment(request, ticket_id: int):
    """Upload a file to a ticket"""
    ticket = get_object_or_404(Ticket, id=ticket_id)

    # --- SECURITY CHECK ---
    is_manager = request.user.role == User.Role.MANAGER
    is_creator = ticket.created_by == request.user
    is_assignee = ticket.assigned_to == request.user

    if not (is_manager or is_creator or is_assignee):
        return api.create_response(
            request,
            {"message": "You do not have permission to upload files to this ticket."},
            status=403
        )

    # Get uploaded file
    uploaded_file = request.FILES.get('file')
    if not uploaded_file:
        return api.create_response(
            request,
            {"message": "No file provided"},
            status=400
        )

    # Validate file size (max 10MB)
    max_size = 10 * 1024 * 1024  # 10MB
    if uploaded_file.size > max_size:
        return api.create_response(
            request,
            {"message": f"File size exceeds 10MB limit (received {uploaded_file.size / (1024*1024):.1f}MB)"},
            status=400
        )

    # Create attachment
    attachment = Attachment.objects.create(
        ticket=ticket,
        file=uploaded_file,
        filename=uploaded_file.name,
        file_size=uploaded_file.size,
        uploaded_by=request.user
    )

    # � Log audit trail
    audit_service.log_attachment_added(ticket, request.user, request)

    # �🔄 Broadcast real-time data update
    realtime_service.broadcast_ticket_updated(ticket, ['attachments'])

    return {
        'id': attachment.id,
        'filename': attachment.filename,
        'file_size': attachment.file_size,
        'uploaded_at': attachment.uploaded_at.isoformat(),
        'message': f'File "{attachment.filename}" uploaded successfully'
    }


# 8.2 Get Attachments for Ticket
@api.get("/tickets/{ticket_id}/attachments", response=list)
def get_attachments(request, ticket_id: int):
    """Get all attachments for a ticket"""
    ticket = get_object_or_404(Ticket, id=ticket_id)

    # --- SECURITY CHECK ---
    is_manager = request.user.role == User.Role.MANAGER
    is_creator = ticket.created_by == request.user
    is_assignee = ticket.assigned_to == request.user

    if not (is_manager or is_creator or is_assignee):
        return api.create_response(
            request,
            {"message": "You do not have permission to view attachments on this ticket."},
            status=403
        )

    attachments = Attachment.objects.filter(ticket=ticket).values(
        'id', 'filename', 'file_size', 'uploaded_at'
    ).order_by('-uploaded_at')

    return list(attachments)


# 8.3 Download File
@api.get("/attachments/{attachment_id}/download")
def download_attachment(request, attachment_id: int):
    """Download an attachment"""
    attachment = get_object_or_404(Attachment, id=attachment_id)
    ticket = attachment.ticket

    # --- SECURITY CHECK ---
    is_manager = request.user.role == User.Role.MANAGER
    is_creator = ticket.created_by == request.user
    is_assignee = ticket.assigned_to == request.user

    if not (is_manager or is_creator or is_assignee):
        return api.create_response(
            request,
            {"message": "You do not have permission to download this file."},
            status=403
        )

    # Return file download response
    from django.http import FileResponse
    try:
        response = FileResponse(attachment.file.open('rb'))
        response['Content-Disposition'] = f'attachment; filename="{attachment.filename}"'
        response['Content-Type'] = 'application/octet-stream'
        return response
    except Exception as e:
        return api.create_response(
            request,
            {"message": f"Failed to download file: {str(e)}"},
            status=500
        )


# 8.4 Delete Attachment
@api.delete("/attachments/{attachment_id}", response=dict)
def delete_attachment(request, attachment_id: int):
    """Delete an attachment"""
    attachment = get_object_or_404(Attachment, id=attachment_id)
    ticket = attachment.ticket

    # --- SECURITY CHECK ---
    # Only manager, creator, or uploader can delete
    is_manager = request.user.role == User.Role.MANAGER
    is_creator = ticket.created_by == request.user
    is_uploader = attachment.uploaded_by == request.user

    if not (is_manager or is_creator or is_uploader):
        return api.create_response(
            request,
            {"message": "You do not have permission to delete this file."},
            status=403
        )

    filename = attachment.filename
    ticket_id = ticket.id

    # Delete the file from storage
    try:
        if attachment.file:
            attachment.file.delete()
    except Exception as e:
        logger.error(f"Failed to delete file from storage: {e}")

    # Delete the attachment record
    attachment.delete()

    from tickets.audit_service import audit_service
    audit_service.log_attachment_deleted(ticket, filename, request.user, request)

    # 🔄 Broadcast real-time data update
    realtime_service.broadcast_ticket_updated(ticket, ['attachments'])

    return {
        'message': f'Attachment "{filename}" deleted successfully'
    }


# ============================================
# 9. USER ADMIN MANAGEMENT ENDPOINTS (MANAGER ONLY)
# ============================================

@api.get("/admin/users", response=List[schemas.UserDetailSchema])
def list_all_users(request):
    """
    List all users in the system.
    MANAGER ONLY
    """
    if request.user.role != User.Role.MANAGER:
        return api.create_response(request, {"message": "Access Denied"}, status=403)

    users = User.objects.all().order_by('created_at')
    return users


@api.post("/admin/users", response=schemas.UserDetailSchema)
def create_user(request, data: schemas.UserCreateSchema):
    """
    Create a new user with specified role.
    MANAGER ONLY
    """
    if request.user.role != User.Role.MANAGER:
        return api.create_response(request, {"message": "Access Denied"}, status=403)

    # Check if username already exists
    if User.objects.filter(username=data.username).exists():
        return api.create_response(request, {"message": "Username already exists"}, status=400)

    # Create new user
    user = User.objects.create_user(
        username=data.username,
        email=data.email,
        password=data.password,
        first_name=data.first_name,
        last_name=data.last_name,
        role=data.role,
    )

    # Log audit event
    from tickets.audit_service import audit_service
    audit_service.log_user_created(user, request.user, request)

    return user


@api.patch("/admin/users/{user_id}", response=schemas.UserDetailSchema)
def update_user(request, user_id: int, data: schemas.UserUpdateSchema):
    """
    Update user details and/or role.
    MANAGER ONLY
    """
    if request.user.role != User.Role.MANAGER:
        return api.create_response(request, {"message": "Access Denied"}, status=403)

    user = get_object_or_404(User, id=user_id)

    # Log role changes
    if data.role and data.role != user.role:
        from tickets.audit_service import audit_service
        audit_service.log_user_role_changed(user, user.role, data.role, request.user, request)

    # Update fields
    if data.email:
        user.email = data.email
    if data.first_name is not None:
        user.first_name = data.first_name
    if data.last_name is not None:
        user.last_name = data.last_name
    if data.role:
        user.role = data.role
    if data.is_active is not None:
        user.is_active = data.is_active

    user.save()
    return user


@api.delete("/admin/users/{user_id}")
def delete_user(request, user_id: int):
    """
    Soft delete a user (set is_active=False).
    MANAGER ONLY
    """
    if request.user.role != User.Role.MANAGER:
        return api.create_response(request, {"message": "Access Denied"}, status=403)

    # Prevent deleting yourself
    if user_id == request.user.id:
        return api.create_response(request, {"message": "Cannot delete your own account"}, status=400)

    user = get_object_or_404(User, id=user_id)
    user.is_active = False
    user.save()

    from tickets.audit_service import audit_service
    audit_service.log_user_deactivated(user, request.user, request)

    return {'message': f'User {user.username} deactivated'}


# ============================================
# 10. SLA MANAGEMENT ENDPOINTS
# ============================================

@api.get("/admin/slas", response=List[schemas.SLASchema])
def list_slas(request):
    """List all SLAs"""
    from tickets.models import SLA
    slas = SLA.objects.all().order_by('priority')
    return slas


@api.post("/admin/slas", response=schemas.SLASchema)
def create_sla(request, data: schemas.SLACreateSchema):
    """Create a new SLA (MANAGER ONLY)"""
    if request.user.role != User.Role.MANAGER:
        return api.create_response(request, {"message": "Access Denied"}, status=403)

    from tickets.models import SLA
    sla = SLA.objects.create(
        name=data.name,
        description=data.description,
        priority=data.priority,
        category_id=data.category_id,
        response_time_hours=data.response_time_hours,
        resolution_time_hours=data.resolution_time_hours,
        is_active=data.is_active,
    )
    return sla


@api.patch("/admin/slas/{sla_id}", response=schemas.SLASchema)
def update_sla(request, sla_id: int, data: schemas.SLACreateSchema):
    """Update an SLA (MANAGER ONLY)"""
    if request.user.role != User.Role.MANAGER:
        return api.create_response(request, {"message": "Access Denied"}, status=403)

    from tickets.models import SLA
    sla = get_object_or_404(SLA, id=sla_id)

    sla.name = data.name
    sla.description = data.description
    sla.priority = data.priority
    sla.category_id = data.category_id
    sla.response_time_hours = data.response_time_hours
    sla.resolution_time_hours = data.resolution_time_hours
    sla.is_active = data.is_active
    sla.save()

    return sla


@api.delete("/admin/slas/{sla_id}")
def delete_sla(request, sla_id: int):
    """Delete an SLA (MANAGER ONLY)"""
    if request.user.role != User.Role.MANAGER:
        return api.create_response(request, {"message": "Access Denied"}, status=403)

    from tickets.models import SLA
    sla = get_object_or_404(SLA, id=sla_id)
    sla.delete()

    return {'message': 'SLA deleted'}


# ============================================
# 11. AUDIT LOG ENDPOINTS
# ============================================

@api.get("/admin/audit-logs", response=List[schemas.AuditLogSchema])
def list_audit_logs(
    request,
    ticket_id: Optional[int] = None,
    action_type: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
):
    """
    List audit logs (MANAGER ONLY).
    Can filter by ticket_id, action_type, with pagination.
    """
    if request.user.role != User.Role.MANAGER:
        return api.create_response(request, {"message": "Access Denied"}, status=403)

    from tickets.models import AuditLog

    # Build query
    query = AuditLog.objects.all()

    if ticket_id:
        query = query.filter(ticket_id=ticket_id)

    if action_type:
        query = query.filter(action_type=action_type)

    # Order by most recent first
    query = query.order_by('-created_at')

    # Pagination
    total_count = query.count()
    logs = query[offset:offset+limit]

    return list(logs)


@api.get("/admin/audit-logs/ticket/{ticket_id}", response=List[schemas.AuditLogSchema])
def get_ticket_audit_logs(request, ticket_id: int):
    """Get audit logs for a specific ticket"""
    from tickets.models import AuditLog

    ticket = get_object_or_404(Ticket, id=ticket_id)

    # Check permission
    if not (request.user.role == User.Role.MANAGER or
            request.user.id == ticket.created_by_id or
            request.user.id == ticket.assigned_to_id):
        return api.create_response(request, {"message": "Access Denied"}, status=403)

    logs = AuditLog.objects.filter(ticket=ticket).order_by('-created_at')
    return list(logs)


# ==========================================
# Register Departments Router
# ==========================================
api.add_router('', departments_router)


