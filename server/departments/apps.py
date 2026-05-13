"""
Departments App Configuration
"""
from django.apps import AppConfig


class DepartmentsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'departments'
    verbose_name = 'Departments & Teams'
