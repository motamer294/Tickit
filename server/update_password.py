#!/usr/bin/env python3
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from accounts.models import User

print("Updating password for user 'essam'...")
user = User.objects.get(username='essam')
user.set_password('password123')
user.save()
print(f"✅ Password updated!")
print(f"Password verification: {user.check_password('password123')}")
