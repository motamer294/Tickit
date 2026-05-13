from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    class Role(models.TextChoices):
        MANAGER = "MANAGER", "Manager"
        EMPLOYEE = "EMPLOYEE", "Employee"
        CUSTOMER = "CUSTOMER", "Customer"

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.CUSTOMER
    )
    
    # Team membership - for organizing employees into teams
    # Nullable for MANAGER and CUSTOMER roles; required for EMPLOYEE
    team = models.ForeignKey(
        'departments.Team',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='members',
        help_text="Team assignment for EMPLOYEE role (optional)"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.username} ({self.role})"
    
    @property
    def department(self):
        """Get department through team membership"""
        if self.team:
            return self.team.department
        return None