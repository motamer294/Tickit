import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from accounts.models import User

print("=" * 50)
print("Checking users in database...")
print("=" * 50)

users = list(User.objects.all())
if users:
    for user in users:
        print(f" {user.username} | email: {user.email} | role: {user.role}")
else:
    print(" No users found, creating test user...")
    user = User.objects.create_user(
        username='essam',
        email='essam@example.com',
        password='password123',
        role='MANAGER'
    )
    print(f" Created: {user.username}")

print(f"Total users: {User.objects.count()}")
