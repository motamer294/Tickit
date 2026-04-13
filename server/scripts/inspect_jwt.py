#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from ninja_jwt.tokens import AccessToken, RefreshToken
from accounts.models import User
from django.contrib.auth.hashers import make_password
import json

# Create a test user
user, created = User.objects.get_or_create(
    username='test_user_jwt_inspect',
    defaults={
        'password': make_password('testpass123'),
        'role': 'CUSTOMER'
    }
)

# Create tokens
access_token = AccessToken.for_user(user)
refresh_token = RefreshToken.for_user(user)

print('=' * 60)
print('ACCESS TOKEN CLAIMS')
print('=' * 60)
print(json.dumps(access_token.payload, indent=2, default=str))

print('\n' + '=' * 60)
print('REFRESH TOKEN CLAIMS')
print('=' * 60)
print(json.dumps(refresh_token.payload, indent=2, default=str))

print('\n' + '=' * 60)
print('ACCESS TOKEN STRING (first 100 chars)')
print('=' * 60)
print(str(access_token)[:100] + '...')

print('\n' + '=' * 60)
print('USER OBJECT FIELDS')
print('=' * 60)
print(f'  id: {user.id}')
print(f'  username: {user.username}')
print(f'  email: {user.email}')
print(f'  role: {user.role}')
print(f'  is_active: {user.is_active}')
print(f'  is_staff: {user.is_staff}')
print(f'  is_superuser: {user.is_superuser}')
print(f'  first_name: {user.first_name}')
print(f'  last_name: {user.last_name}')
print(f'  date_joined: {user.date_joined}')
print(f'  last_login: {user.last_login}')
