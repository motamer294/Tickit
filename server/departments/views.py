from django.shortcuts import get_object_or_404
from ninja import Router, Query
from ninja.errors import HttpError
from typing import List
from django.db.models import Count, Prefetch
from .models import Department, Team
from .schemas import (
    DepartmentOut, DepartmentDetailOut, DepartmentCreate, DepartmentUpdate,
    TeamOut, TeamDetailOut, TeamCreate, TeamUpdate,
    EmployeeListOut
)
from accounts.models import User

router = Router()


# ==========================================
# DEPARTMENT ENDPOINTS
# ==========================================

@router.get('/departments', response=List[DepartmentOut], tags=['Departments'])
def list_departments(request):
    """List all departments"""
    if not request.user or not request.user.is_authenticated:
        raise HttpError(401, 'Authentication required')

    # Prefetch teams for each department to properly evaluate counts
    departments = Department.objects.select_related('manager').prefetch_related(
        Prefetch('teams', queryset=Team.objects.prefetch_related('members'))
    )

    # Convert to list and explicitly set counts
    result = []
    for dept in departments:
        dept_data = {
            'id': dept.id,
            'name': dept.name,
            'description': dept.description,
            'manager_id': dept.manager_id,
            'manager': dept.manager,
            'is_active': dept.is_active,
            'created_at': dept.created_at,
            'updated_at': dept.updated_at,
            'team_count': dept.teams.count(),
            'employee_count': sum(len(list(team.members.all())) for team in dept.teams.all()),
        }
        result.append(DepartmentOut(**dept_data))

    return result


@router.get('/departments/{department_id}', response=DepartmentDetailOut, tags=['Departments'])
def get_department(request, department_id: int):
    """Get department details with teams"""
    if not request.user or not request.user.is_authenticated:
        raise HttpError(401, 'Authentication required')

    # Prefetch teams with their members to properly evaluate counts
    department = get_object_or_404(
        Department.objects.select_related('manager').prefetch_related(
            Prefetch('teams', queryset=Team.objects.select_related('team_lead').prefetch_related('members'))
        ),
        id=department_id
    )

    # Explicitly compute counts
    department_dict = {
        'id': department.id,
        'name': department.name,
        'description': department.description,
        'manager_id': department.manager_id,
        'manager': department.manager,
        'is_active': department.is_active,
        'created_at': department.created_at,
        'updated_at': department.updated_at,
        'team_count': department.teams.count(),
        'employee_count': sum(len(list(team.members.all())) for team in department.teams.all()),
        'teams': list(department.teams.all()),
    }

    return DepartmentDetailOut(**department_dict)


@router.post('/departments', response=DepartmentOut, tags=['Departments'])
def create_department(request, payload: DepartmentCreate):
    """Create new department (Manager only)"""
    if request.user.role != 'MANAGER':
        raise HttpError(403, 'Only managers can create departments')

    # Validate manager exists if provided
    if payload.manager_id:
        if not User.objects.filter(id=payload.manager_id, role='MANAGER').exists():
            raise HttpError(400, 'Manager ID must be a valid manager user')

    department = Department.objects.create(
        name=payload.name,
        description=payload.description or '',
        manager_id=payload.manager_id
    )
    return department


@router.patch('/departments/{department_id}', response=DepartmentOut, tags=['Departments'])
def update_department(request, department_id: int, payload: DepartmentUpdate):
    """Update department details (Manager only)"""
    if request.user.role != 'MANAGER':
        raise HttpError(403, 'Only managers can update departments')

    department = get_object_or_404(Department, id=department_id)

    if payload.name is not None:
        # Check name uniqueness
        if Department.objects.filter(name=payload.name).exclude(id=department_id).exists():
            raise HttpError(400, 'Department name already exists')
        department.name = payload.name

    if payload.description is not None:
        department.description = payload.description

    if payload.manager_id is not None:
        if payload.manager_id and not User.objects.filter(id=payload.manager_id, role='MANAGER').exists():
            raise HttpError(400, 'Manager ID must be a valid manager user')
        department.manager_id = payload.manager_id

    if payload.is_active is not None:
        department.is_active = payload.is_active

    department.save()
    return department


@router.delete('/departments/{department_id}', tags=['Departments'])
def delete_department(request, department_id: int):
    """Delete department (Manager only)"""
    if request.user.role != 'MANAGER':
        raise HttpError(403, 'Only managers can delete departments')

    department = get_object_or_404(Department, id=department_id)

    # Prevent deletion if department has active teams
    active_teams = department.teams.filter(is_active=True).count()
    if active_teams > 0:
        raise HttpError(400, f'Cannot delete department with {active_teams} active teams. Deactivate teams first.')

    department.delete()
    return {'deleted': True}


# ==========================================
# TEAM ENDPOINTS
# ==========================================

@router.get('/teams', response=List[TeamOut], tags=['Teams'])
def list_teams(request, department_id: int = Query(None)):
    """List all teams (optionally filtered by department)"""
    if not request.user or not request.user.is_authenticated:
        raise HttpError(401, 'Authentication required')

    teams = Team.objects.select_related('department', 'team_lead').prefetch_related('members')

    if department_id:
        if not Department.objects.filter(id=department_id).exists():
            raise HttpError(404, 'Department not found')
        teams = teams.filter(department_id=department_id)

    # Convert to dicts with explicit employee_count
    result = []
    for team in teams:
        team_dict = {
            'id': team.id,
            'name': team.name,
            'description': team.description,
            'department_id': team.department_id,
            'team_lead_id': team.team_lead_id,
            'team_lead': team.team_lead,
            'is_active': team.is_active,
            'created_at': team.created_at,
            'updated_at': team.updated_at,
            'employee_count': len(list(team.members.filter(is_active=True))),
        }
        result.append(TeamOut(**team_dict))

    return result


@router.get('/teams/{team_id}', response=TeamDetailOut, tags=['Teams'])
def get_team(request, team_id: int):
    """Get team details with members"""
    if not request.user or not request.user.is_authenticated:
        raise HttpError(401, 'Authentication required')

    # Prefetch members with active filter applied
    team = get_object_or_404(
        Team.objects.select_related('department', 'team_lead').prefetch_related(
            Prefetch('members', queryset=User.objects.filter(is_active=True))
        ),
        id=team_id
    )

    # Explicitly compute employee_count
    members = list(team.members.all())
    team_dict = {
        'id': team.id,
        'name': team.name,
        'description': team.description,
        'department_id': team.department_id,
        'team_lead_id': team.team_lead_id,
        'team_lead': team.team_lead,
        'is_active': team.is_active,
        'created_at': team.created_at,
        'updated_at': team.updated_at,
        'employee_count': len(members),
        'members': members,
    }

    return TeamDetailOut(**team_dict)


@router.post('/teams', response=TeamOut, tags=['Teams'])
def create_team(request, payload: TeamCreate):
    """Create new team (Manager only)"""
    if request.user.role != 'MANAGER':
        raise HttpError(403, 'Only managers can create teams')

    # Validate department exists
    department = get_object_or_404(Department, id=payload.department_id)

    # Validate team lead if provided and is actual user
    if payload.team_lead_id:
        if not User.objects.filter(id=payload.team_lead_id).exists():
            raise HttpError(400, 'Team lead ID must be a valid user')

    # Check name uniqueness within department
    if Team.objects.filter(name=payload.name, department=department).exists():
        raise HttpError(400, f'Team "{payload.name}" already exists in this department')

    team = Team.objects.create(
        name=payload.name,
        description=payload.description or '',
        department=department,
        team_lead_id=payload.team_lead_id
    )
    return team


@router.patch('/teams/{team_id}', response=TeamOut, tags=['Teams'])
def update_team(request, team_id: int, payload: TeamUpdate):
    """Update team details (Manager only)"""
    if request.user.role != 'MANAGER':
        raise HttpError(403, 'Only managers can update teams')

    team = get_object_or_404(Team, id=team_id)

    if payload.name is not None:
        # Check name uniqueness within department
        if Team.objects.filter(name=payload.name, department=team.department).exclude(id=team_id).exists():
            raise HttpError(400, f'Team "{payload.name}" already exists in this department')
        team.name = payload.name

    if payload.description is not None:
        team.description = payload.description

    if payload.team_lead_id is not None:
        if payload.team_lead_id and not User.objects.filter(id=payload.team_lead_id).exists():
            raise HttpError(400, 'Team lead ID must be a valid user')
        team.team_lead_id = payload.team_lead_id

    if payload.is_active is not None:
        team.is_active = payload.is_active

    team.save()
    return team


@router.delete('/teams/{team_id}', tags=['Teams'])
def delete_team(request, team_id: int):
    """Delete team (Manager only)"""
    if request.user.role != 'MANAGER':
        raise HttpError(403, 'Only managers can delete teams')

    team = get_object_or_404(Team, id=team_id)

    # Check if team has members
    member_count = team.members.count()
    if member_count > 0:
        raise HttpError(400, f'Cannot delete team with {member_count} members. Remove members or deactivate team instead.')

    team.delete()
    return {'deleted': True}


# ==========================================
# TEAM MEMBER MANAGEMENT
# ==========================================

@router.post('/teams/{team_id}/add-member/{user_id}', response=TeamDetailOut, tags=['Teams'])
def add_team_member(request, team_id: int, user_id: int):
    """Add employee to team (Manager only)"""
    if request.user.role != 'MANAGER':
        raise HttpError(403, 'Only managers can manage team members')

    team = get_object_or_404(Team, id=team_id)
    user = get_object_or_404(User, id=user_id)

    if user.role == 'CUSTOMER':
        raise HttpError(400, 'Cannot add customer to team. Only employees can be team members.')

    if user.team_id == team.id:
        raise HttpError(400, 'User is already a member of this team')

    # If user was in another team, they'll be moved (single team membership)
    user.team = team
    user.save()

    # Fetch fresh team data with members
    team.refresh_from_db()
    members = list(team.members.filter(is_active=True))

    team_dict = {
        'id': team.id,
        'name': team.name,
        'description': team.description,
        'department_id': team.department_id,
        'team_lead_id': team.team_lead_id,
        'team_lead': team.team_lead,
        'is_active': team.is_active,
        'created_at': team.created_at,
        'updated_at': team.updated_at,
        'employee_count': len(members),
        'members': members,
    }

    return TeamDetailOut(**team_dict)


@router.delete('/teams/{team_id}/remove-member/{user_id}', response=TeamDetailOut, tags=['Teams'])
def remove_team_member(request, team_id: int, user_id: int):
    """Remove employee from team (Manager only)"""
    if request.user.role != 'MANAGER':
        raise HttpError(403, 'Only managers can manage team members')

    team = get_object_or_404(Team, id=team_id)
    user = get_object_or_404(User, id=user_id)

    if user.team_id != team.id:
        raise HttpError(400, 'User is not a member of this team')

    user.team = None
    user.save()

    # Fetch fresh team data with members
    team.refresh_from_db()
    members = list(team.members.filter(is_active=True))

    team_dict = {
        'id': team.id,
        'name': team.name,
        'description': team.description,
        'department_id': team.department_id,
        'team_lead_id': team.team_lead_id,
        'team_lead': team.team_lead,
        'is_active': team.is_active,
        'created_at': team.created_at,
        'updated_at': team.updated_at,
        'employee_count': len(members),
        'members': members,
    }

    return TeamDetailOut(**team_dict)


# ==========================================
# EMPLOYEE LIST WITH TEAM INFO
# ==========================================

@router.get('/test-departments-router', tags=['Test'])
def test_departments_router(request):
    """Test endpoint to verify departments router is registered"""
    return {"message": "departments router is working!", "version": "v2.0"}


@router.get('/employees', tags=['Employees'])
def list_employees(request, team_id: int = Query(None), department_id: int = Query(None), role: str = Query(None)):
    """List employees with their team/department info"""
    print(" DEBUG: list_employees called from departments/views.py")
    if not request.user or not request.user.is_authenticated:
        raise HttpError(401, 'Authentication required')

    # Return all employees with their team/department info
    employees = User.objects.filter(
        role__in=['EMPLOYEE', 'MANAGER']
    ).select_related('team__department')

    if team_id:
        if not Team.objects.filter(id=team_id).exists():
            raise HttpError(404, 'Team not found')
        employees = employees.filter(team_id=team_id)

    if department_id:
        if not Department.objects.filter(id=department_id).exists():
            raise HttpError(404, 'Department not found')
        employees = employees.filter(team__department_id=department_id)

    if role:
        if role not in ['EMPLOYEE', 'MANAGER']:
            raise HttpError(400, 'Invalid role. Must be EMPLOYEE or MANAGER')
        employees = employees.filter(role=role)

    # Build the response as plain dicts with a SPECIAL test field to verify it's from this endpoint
    result = []
    for emp in employees:
        # Build team data if employee has a team
        team_dict = None
        if emp.team:
            team_dict = {
                'id': emp.team.id,
                'name': emp.team.name,
                'description': emp.team.description or '',
                'department_id': emp.team.department_id,
                'is_active': emp.team.is_active,
                'team_lead_id': emp.team.team_lead_id,
                'team_lead': None,
                'employee_count': emp.team.members.filter(is_active=True).count(),
                'created_at': emp.team.created_at.isoformat() if emp.team.created_at else None,
                'updated_at': emp.team.updated_at.isoformat() if emp.team.updated_at else None,
            }

        # Build department data if employee's team has a department
        dept_dict = None
        if emp.team and emp.team.department:
            dept_dict = {
                'id': emp.team.department.id,
                'name': emp.team.department.name,
                'description': emp.team.department.description or '',
            }

        # Build the employee response object as plain dict
        emp_dict = {
            'id': emp.id,
            'username': emp.username,
            'email': emp.email,
            'first_name': emp.first_name or '',
            'last_name': emp.last_name or '',
            'role': emp.role,
            'team_id': emp.team_id,
            'team': team_dict,
            'department': dept_dict,
            '_source': 'departments_views_py',  # SPECIAL marker to verify this is the right endpoint
        }

        result.append(emp_dict)

    print(f" DEBUG: Returning {len(result)} employees with full data from departments/views.py")
    if result:
        print(f" DEBUG: First employee keys: {list(result[0].keys())}")
    return result


