from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'role', 'get_department', 'get_team', 'is_staff', 'is_active')
    list_filter = ('role', 'is_staff', 'is_active', 'team__department')
    search_fields = ('username', 'email', 'team__name', 'team__department__name')

    fieldsets = UserAdmin.fieldsets + (
        ('Help Desk Roles', {'fields': ('role',)}),
        ('Team Assignment', {'fields': ('team',)}),
    )

    def get_department(self, obj):
        """Display department through team"""
        if obj.team:
            return obj.team.department.name
        return '—'
    get_department.short_description = 'Department'

    def get_team(self, obj):
        """Display team assignment"""
        if obj.team:
            return obj.team.name
        return '—'
    get_team.short_description = 'Team'


admin.site.register(User, CustomUserAdmin)