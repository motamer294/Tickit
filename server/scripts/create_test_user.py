#!/usr/bin/env python3
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from accounts.models import User

print("=" * 60)
print("DATABASE USER CHECK")
print("=" * 60)

# Check existing users
existing_users = User.objects.all()
print(f"\nExisting users: {existing_users.count()}")
for user in existing_users:
    print(f"  • {user.username} ({user.email}) - {user.role}")

# Create test user if needed
if not User.objects.filter(username='essam').exists():
    print("\n Creating test user 'essam'...")
    user = User.objects.create_user(
        username='essam',
        email='essam@test.com',
        password='password123',
        role='MANAGER'
    )
    print(f" Created: {user.username} with role {user.role}")
else:
    print("\n User 'essam' already exists")

# Verify user password
user = User.objects.get(username='essam')
print(f"\n User password verification:")
print(f"  Password matches 'password123': {user.check_password('password123')}")
print(f"  Password hash: {user.password[:50]}...")

print("\n" + "=" * 60)
