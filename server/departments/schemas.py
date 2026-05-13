"""
Pydantic Schemas for Department & Team API Responses
"""
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from datetime import datetime


class UserTeamInfo(BaseModel):
    """Minimal user info for team member display"""
    id: int
    username: str
    email: str
    role: str

    class Config:
        from_attributes = True


class TeamOut(BaseModel):
    """Team response schema"""
    id: int
    name: str
    description: Optional[str] = None
    department_id: int
    team_lead_id: Optional[int] = None
    team_lead: Optional[UserTeamInfo] = None
    employee_count: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @field_validator('employee_count', mode='after')
    @classmethod
    def validate_employee_count(cls, v, info):
        """Recalculate employee_count if needed"""
        # If employee_count is 0 but we have members, calculate it
        if v == 0 and hasattr(info, 'data') and 'members' in info.data:
            members = info.data.get('members', [])
            if isinstance(members, list):
                return len([m for m in members if getattr(m, 'is_active', True)])
        return v


class TeamDetailOut(TeamOut):
    """Extended team info with members"""
    members: List[UserTeamInfo] = []

    @field_validator('members', mode='before')
    @classmethod
    def convert_members_to_list(cls, v):
        """Convert Django RelatedManager to list of member dicts"""
        if v is None:
            return []

        # If it's a Django RelatedManager, convert to list
        if hasattr(v, 'all'):
            return list(v.all())

        # If it's already a list or queryset, convert to list
        if hasattr(v, '__iter__'):
            return list(v)

        return v


class DepartmentOut(BaseModel):
    """Department response schema"""
    id: int
    name: str
    description: Optional[str] = None
    manager_id: Optional[int] = None
    manager: Optional[UserTeamInfo] = None
    team_count: int
    employee_count: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @field_validator('team_count', mode='before')
    @classmethod
    def compute_team_count(cls, v, info):
        """Compute team_count from teams if available"""
        # If we have access to the raw data, calculate from teams
        if hasattr(info, 'data') and 'teams' in info.data:
            teams = info.data['teams']
            if hasattr(teams, '__len__'):
                return len(teams)
            elif hasattr(teams, 'count'):
                return teams.count()
        return v if v else 0

    @field_validator('employee_count', mode='before')
    @classmethod
    def compute_employee_count(cls, v, info):
        """Compute employee_count from teams if available"""
        if hasattr(info, 'data') and 'teams' in info.data:
            teams = info.data['teams']
            if hasattr(teams, '__iter__'):
                try:
                    total = 0
                    for team in teams:
                        if hasattr(team, 'employee_count'):
                            total += team.employee_count
                        elif hasattr(team, 'members'):
                            members = team.members
                            if hasattr(members, 'count'):
                                total += members.filter(is_active=True).count()
                            elif hasattr(members, '__iter__'):
                                total += sum(1 for m in members if getattr(m, 'is_active', True))
                    return total
                except:
                    pass
        return v if v else 0


class DepartmentDetailOut(DepartmentOut):
    """Extended department info with teams"""
    teams: List[TeamOut] = []

    @field_validator('teams', mode='before')
    @classmethod
    def convert_teams_to_list(cls, v):
        """Convert Django RelatedManager to list of team dicts"""
        if v is None:
            return []

        # If it's a Django RelatedManager, convert to list
        if hasattr(v, 'all'):
            return list(v.all())

        # If it's already a list or queryset, convert to list
        if hasattr(v, '__iter__'):
            return list(v)

        return v


class DepartmentCreate(BaseModel):
    """Create department schema"""
    name: str
    description: Optional[str] = None
    manager_id: Optional[int] = None


class DepartmentUpdate(BaseModel):
    """Update department schema"""
    name: Optional[str] = None
    description: Optional[str] = None
    manager_id: Optional[int] = None
    is_active: Optional[bool] = None


class TeamCreate(BaseModel):
    """Create team schema"""
    name: str
    description: Optional[str] = None
    department_id: int
    team_lead_id: Optional[int] = None


class TeamUpdate(BaseModel):
    """Update team schema"""
    name: Optional[str] = None
    description: Optional[str] = None
    team_lead_id: Optional[int] = None
    is_active: Optional[bool] = None


class EmployeeListOut(BaseModel):
    """Employee list item with team info"""
    id: int
    username: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: str
    team_id: Optional[int] = None
    team: Optional[TeamOut] = None
    department: Optional['DepartmentMinimalOut'] = None

    class Config:
        from_attributes = True

    @field_validator('team', mode='before')
    @classmethod
    def convert_team_to_dict(cls, v):
        """Convert Django model to dict for serialization"""
        if v is None:
            return None
        if hasattr(v, '__dict__'):
            return v
        return v

    @classmethod
    def from_orm(cls, user):
        """Custom ORM conversion to include department info"""
        # Get team with its full structure
        team_data = None
        if user.team:
            team_data = {
                'id': user.team.id,
                'name': user.team.name,
                'description': user.team.description,
                'department_id': user.team.department_id,
                'is_active': user.team.is_active,
                'team_lead_id': user.team.team_lead_id if user.team.team_lead else None,
                'employee_count': user.team.members.filter(is_active=True).count(),
                'created_at': user.team.created_at,
                'updated_at': user.team.updated_at,
            }

        # Get department through team relationship
        department_data = None
        if user.team and user.team.department:
            department_data = {
                'id': user.team.department.id,
                'name': user.team.department.name,
                'description': user.team.department.description,
            }

        data = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': user.role,
            'team_id': user.team_id,
            'team': team_data,
            'department': department_data,
        }
        return cls(**data)


class DepartmentMinimalOut(BaseModel):
    """Minimal department info for employee list"""
    id: int
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True
