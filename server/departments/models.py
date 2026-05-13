"""
Department and Team Models
Hierarchical organization structure: Department → Team → Employee
"""
from django.db import models
from django.utils.timezone import now


class Department(models.Model):
    """
    Top-level organizational unit
    Examples: IT Support, Billing, Security, Customer Service
    """
    
    name = models.CharField(
        max_length=255,
        unique=True,
        help_text="Department name (e.g., 'IT Support', 'Billing')"
    )
    
    description = models.TextField(
        blank=True,
        help_text="Department description and responsibilities"
    )
    
    manager = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='managed_departments',
        help_text="Department manager (typically MANAGER role)"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(
        default=True,
        help_text="Inactive departments don't accept new assignments"
    )
    
    class Meta:
        verbose_name_plural = "Departments"
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name}"
    
    @property
    def team_count(self):
        """Count of teams in this department"""
        return self.teams.count()
    
    @property
    def employee_count(self):
        """Count of employees across all teams"""
        return sum(team.employee_count for team in self.teams.all())


class Team(models.Model):
    """
    Sub-unit within a Department
    Examples: 
    - IT Support → Desktop Support, Network Support
    - Billing → Collections, Reconciliation
    """
    
    name = models.CharField(
        max_length=255,
        help_text="Team name (e.g., 'Desktop Support')"
    )
    
    description = models.TextField(
        blank=True,
        help_text="Team responsibilities and specialization"
    )
    
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name='teams',
        help_text="Parent department"
    )
    
    team_lead = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='led_teams',
        help_text="Team lead or senior employee (usually EMPLOYEE or MANAGER)"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(
        default=True,
        help_text="Inactive teams don't accept new assignments"
    )
    
    class Meta:
        unique_together = ('name', 'department')
        ordering = ['department', 'name']
    
    def __str__(self):
        return f"{self.department.name} → {self.name}"
    
    @property
    def employee_count(self):
        """Count of employees in this team"""
        return self.members.filter(is_active=True).count()
    
    @property
    def workload(self):
        """Average workload per team member"""
        count = self.employee_count
        if count == 0:
            return 0
        
        from tickets.models import Ticket
        ticket_count = Ticket.objects.filter(
            assigned_to__in=self.members.all(),
            status__in=['OPEN', 'IN_PROGRESS']
        ).count()
        
        return ticket_count / count
