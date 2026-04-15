"""
🎯 COMPREHENSIVE SYSTEM TESTS - Full End-to-End
Tests all critical functionality: auth, tickets, comments, permissions, etc.
"""
import pytest
from django.contrib.auth import get_user_model
from django.test import TestCase, Client
from django.test import AsyncClient
import json

User = get_user_model()


class AuthenticationTests(TestCase):
    """Test authentication endpoints and JWT token handling"""

    def setUp(self):
        self.client = Client()
        self.login_url = '/api/login'
        self.signup_url = '/api/signup'

    def test_user_can_login(self):
        """Test that user can login with correct credentials"""
        # Create test user
        User.objects.create_user(
            username='testuser',
            password='testpass123',
            role='CUSTOMER'
        )

        # Login
        response = self.client.post(self.login_url,
            json.dumps({'username': 'testuser', 'password': 'testpass123'}),
            content_type='application/json'
        )

        assert response.status_code == 200
        data = json.loads(response.content)
        assert 'access' in data
        assert 'refresh' in data
        assert data['user']['username'] == 'testuser'
        assert data['user']['role'] == 'CUSTOMER'

    def test_login_with_wrong_password_fails(self):
        """Test that login fails with wrong password"""
        User.objects.create_user(
            username='testuser',
            password='correctpass',
            role='CUSTOMER'
        )

        response = self.client.post(self.login_url,
            json.dumps({'username': 'testuser', 'password': 'wrongpass'}),
            content_type='application/json'
        )

        assert response.status_code == 401

    def test_user_can_signup(self):
        """Test that user can sign up with role selection"""
        response = self.client.post(self.signup_url,
            json.dumps({'username': 'newuser', 'password': 'newpass123', 'role': 'EMPLOYEE'}),
            content_type='application/json'
        )

        assert response.status_code == 200
        data = json.loads(response.content)
        assert data['username'] == 'newuser'
        assert data['role'] == 'EMPLOYEE'
        assert 'access' in data

        # Verify user was created
        user = User.objects.get(username='newuser')
        assert user.role == 'EMPLOYEE'

    def test_signup_default_role_is_customer(self):
        """Test that signup defaults to CUSTOMER role if not specified"""
        response = self.client.post(self.signup_url,
            json.dumps({'username': 'defaultuser', 'password': 'pass123'}),
            content_type='application/json'
        )

        assert response.status_code == 200
        data = json.loads(response.content)
        assert data['role'] == 'CUSTOMER'

    def test_duplicate_username_rejected(self):
        """Test that duplicate usernames are rejected"""
        User.objects.create_user(
            username='existinguser',
            password='pass123',
            role='CUSTOMER'
        )

        response = self.client.post(self.signup_url,
            json.dumps({'username': 'existinguser', 'password': 'pass123'}),
            content_type='application/json'
        )

        assert response.status_code == 400
        data = json.loads(response.content)
        assert 'already taken' in data.get('message', '').lower() or 'exists' in str(data).lower()


class TicketManagementTests(TestCase):
    """Test ticket CRUD operations and permissions"""

    def setUp(self):
        self.client = APIClient()

        # Create test users with different roles
        self.manager = User.objects.create_user(
            username='manager',
            password='pass123',
            role='MANAGER'
        )
        self.employee = User.objects.create_user(
            username='employee',
            password='pass123',
            role='EMPLOYEE'
        )
        self.customer = User.objects.create_user(
            username='customer',
            password='pass123',
            role='CUSTOMER'
        )

    def test_customer_can_create_ticket(self):
        """Test that customers can create tickets"""
        self.client.force_authenticate(user=self.customer)

        response = self.client.post('/api/tickets', {
            'title': 'Test Ticket',
            'description': 'This is a test ticket with enough characters'
        }, format='json')

        assert response.status_code == 201
        data = response.json()
        assert data['title'] == 'Test Ticket'
        assert data['created_by_id'] == self.customer.id

    def test_ticket_creation_requires_minimum_title_length(self):
        """Test that ticket title must be at least 3 characters"""
        self.client.force_authenticate(user=self.customer)

        response = self.client.post('/api/tickets', {
            'title': 'ab',  # Too short
            'description': 'This is a valid ticket description'
        }, format='json')

        assert response.status_code == 400

    def test_ticket_creation_requires_minimum_description_length(self):
        """Test that ticket description must be at least 10 characters"""
        self.client.force_authenticate(user=self.customer)

        response = self.client.post('/api/tickets', {
            'title': 'Valid Title',
            'description': 'short'  # Too short
        }, format='json')

        assert response.status_code == 400

    def test_manager_can_view_all_tickets(self):
        """Test that managers can view all tickets"""
        # Customer creates ticket
        from tickets.models import Ticket
        ticket = Ticket.objects.create(
            title='Test Ticket',
            description='A valid ticket description here',
            created_by=self.customer,
            status='OPEN',
            category='General IT',
            priority='LOW',
            sentiment='Neutral'
        )

        self.client.force_authenticate(user=self.manager)
        response = self.client.get('/api/my-tickets')

        assert response.status_code == 200
        assert len(response.json()) >= 1

    def test_customer_can_only_view_own_tickets(self):
        """Test that customers can only see their own tickets"""
        from tickets.models import Ticket

        # Create ticket from different customer
        other_customer = User.objects.create_user(
            username='othercustomer',
            password='pass123',
            role='CUSTOMER'
        )

        ticket = Ticket.objects.create(
            title='Other Ticket',
            description='A valid ticket description here',
            created_by=other_customer,
            status='OPEN',
            category='General IT',
            priority='LOW',
            sentiment='Neutral'
        )

        self.client.force_authenticate(user=self.customer)
        response = self.client.get('/api/my-tickets')

        # Should not see other customer's ticket
        ticket_ids = [t['id'] for t in response.json()]
        assert ticket.id not in ticket_ids

    def test_manager_can_delete_ticket(self):
        """Test that only managers can delete tickets"""
        from tickets.models import Ticket

        ticket = Ticket.objects.create(
            title='Delete Me',
            description='This ticket will be deleted soon',
            created_by=self.customer,
            status='OPEN',
            category='General IT',
            priority='LOW',
            sentiment='Neutral'
        )

        self.client.force_authenticate(user=self.manager)
        response = self.client.delete(f'/api/tickets/{ticket.id}')

        assert response.status_code == 200
        assert not Ticket.objects.filter(id=ticket.id).exists()

    def test_customer_cannot_delete_ticket(self):
        """Test that customers cannot delete tickets"""
        from tickets.models import Ticket

        ticket = Ticket.objects.create(
            title='Protected',
            description='This ticket cannot be deleted by customer',
            created_by=self.customer,
            status='OPEN',
            category='General IT',
            priority='LOW',
            sentiment='Neutral'
        )

        self.client.force_authenticate(user=self.customer)
        response = self.client.delete(f'/api/tickets/{ticket.id}')

        assert response.status_code == 403
        assert Ticket.objects.filter(id=ticket.id).exists()


class CommentTests(TestCase):
    """Test comment functionality"""

    def setUp(self):
        self.client = APIClient()

        self.user1 = User.objects.create_user(
            username='user1',
            password='pass123',
            role='CUSTOMER'
        )
        self.user2 = User.objects.create_user(
            username='user2',
            password='pass123',
            role='CUSTOMER'
        )

        from tickets.models import Ticket
        self.ticket = Ticket.objects.create(
            title='Test Ticket',
            description='A valid test ticket for comments',
            created_by=self.user1,
            status='OPEN',
            category='General IT',
            priority='LOW',
            sentiment='Neutral'
        )

    def test_creator_can_add_comment(self):
        """Test that ticket creator can add comments"""
        self.client.force_authenticate(user=self.user1)

        response = self.client.post(
            f'/api/tickets/{self.ticket.id}/comments',
            {'text': 'This is a valid comment with enough characters'},
            format='json'
        )

        assert response.status_code == 201

    def test_comment_requires_minimum_length(self):
        """Test that comments must be at least 1 character"""
        self.client.force_authenticate(user=self.user1)

        response = self.client.post(
            f'/api/tickets/{self.ticket.id}/comments',
            {'text': ''},  # Empty comment
            format='json'
        )

        assert response.status_code == 400

    def test_comment_cannot_exceed_maximum_length(self):
        """Test that comments must not exceed 2000 characters"""
        self.client.force_authenticate(user=self.user1)

        long_text = 'a' * 2001  # Too long
        response = self.client.post(
            f'/api/tickets/{self.ticket.id}/comments',
            {'text': long_text},
            format='json'
        )

        assert response.status_code == 400

    def test_non_authorized_user_cannot_comment(self):
        """Test that users without access cannot comment"""
        self.client.force_authenticate(user=self.user2)

        response = self.client.post(
            f'/api/tickets/{self.ticket.id}/comments',
            {'text': 'Unauthorized comment attempt'},
            format='json'
        )

        assert response.status_code == 403


class ProfileManagementTests(TestCase):
    """Test user profile functionality"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='pass123',
            role='CUSTOMER'
        )

    def test_user_can_view_profile(self):
        """Test that user can view their own profile"""
        self.client.force_authenticate(user=self.user)

        response = self.client.get('/api/profile')

        assert response.status_code == 200
        data = response.json()
        assert data['username'] == 'testuser'
        assert data['email'] == 'test@example.com'

    def test_user_can_update_profile(self):
        """Test that user can update profile information"""
        self.client.force_authenticate(user=self.user)

        response = self.client.patch('/api/profile', {
            'first_name': 'John',
            'last_name': 'Doe',
            'email': 'newemail@example.com'
        }, format='json')

        assert response.status_code == 200
        data = response.json()
        assert data['first_name'] == 'John'
        assert data['last_name'] == 'Doe'
        assert data['email'] == 'newemail@example.com'

    def test_email_must_be_unique(self):
        """Test that email addresses must be unique"""
        other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='pass123'
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.patch('/api/profile', {
            'email': 'other@example.com'  # Already taken
        }, format='json')

        assert response.status_code == 400
        assert 'already' in response.json()['message'].lower()

    def test_user_can_change_password(self):
        """Test that user can change their password"""
        self.client.force_authenticate(user=self.user)

        response = self.client.post('/api/profile/change-password', {
            'current_password': 'pass123',
            'new_password': 'newpass123',
            'confirm_password': 'newpass123'
        }, format='json')

        assert response.status_code == 200

        # Verify old password no longer works
        new_client = APIClient()
        response = new_client.post('/api/login', {
            'username': 'testuser',
            'password': 'pass123'
        }, format='json')
        assert response.status_code == 401

    def test_password_change_requires_correct_current_password(self):
        """Test that password change requires correct current password"""
        self.client.force_authenticate(user=self.user)

        response = self.client.post('/api/profile/change-password', {
            'current_password': 'wrongpass',
            'new_password': 'newpass123',
            'confirm_password': 'newpass123'
        }, format='json')

        assert response.status_code == 400
        assert 'incorrect' in response.json()['message'].lower()


class RoleBasedAccessControlTests(TestCase):
    """Test role-based access control across the system"""

    def setUp(self):
        self.client = APIClient()

        self.manager = User.objects.create_user(
            username='manager',
            password='pass123',
            role='MANAGER'
        )
        self.employee = User.objects.create_user(
            username='employee',
            password='pass123',
            role='EMPLOYEE'
        )
        self.customer = User.objects.create_user(
            username='customer',
            password='pass123',
            role='CUSTOMER'
        )

    def test_only_manager_can_view_analytics(self):
        """Test that only managers can access analytics dashboard"""
        self.client.force_authenticate(user=self.customer)
        response = self.client.get('/api/analytics/dashboard')
        assert response.status_code == 403

        self.client.force_authenticate(user=self.manager)
        response = self.client.get('/api/analytics/dashboard')
        assert response.status_code == 200

    def test_only_manager_can_view_employees(self):
        """Test that only managers can view employee list"""
        self.client.force_authenticate(user=self.customer)
        response = self.client.get('/api/employees')
        assert response.status_code == 403

        self.client.force_authenticate(user=self.manager)
        response = self.client.get('/api/employees')
        assert response.status_code == 200

    def test_only_employee_can_view_tasks(self):
        """Test that only employees can view assigned tasks"""
        self.client.force_authenticate(user=self.customer)
        response = self.client.get('/api/employee/tasks')
        assert response.status_code == 403

        self.client.force_authenticate(user=self.employee)
        response = self.client.get('/api/employee/tasks')
        assert response.status_code == 200


class ValidationTests(TestCase):
    """Test input validation across endpoints"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            password='pass123',
            role='CUSTOMER'
        )
        self.client.force_authenticate(user=self.user)

    def test_invalid_email_format_rejected(self):
        """Test that invalid email formats are rejected"""
        response = self.client.patch('/api/profile', {
            'email': 'not-an-email'
        }, format='json')

        assert response.status_code == 400

    def test_ticket_title_max_length_enforced(self):
        """Test that ticket titles cannot exceed maximum length"""
        response = self.client.post('/api/tickets', {
            'title': 'a' * 501,  # Too long
            'description': 'This is a valid description'
        }, format='json')

        assert response.status_code == 400

    def test_ticket_description_max_length_enforced(self):
        """Test that descriptions cannot exceed maximum length"""
        response = self.client.post('/api/tickets', {
            'title': 'Valid Title',
            'description': 'a' * 5001  # Too long
        }, format='json')

        assert response.status_code == 400


class ErrorHandlingTests(TestCase):
    """Test error handling and edge cases"""

    def setUp(self):
        self.client = APIClient()

    def test_nonexistent_endpoint_returns_404(self):
        """Test that nonexistent endpoints return 404"""
        response = self.client.get('/api/nonexistent')
        assert response.status_code == 404

    def test_unauthenticated_request_returns_401(self):
        """Test that unauthenticated requests return 401"""
        response = self.client.get('/api/profile')
        assert response.status_code == 401

    def test_invalid_ticket_id_returns_404(self):
        """Test that invalid ticket IDs return 404"""
        user = User.objects.create_user(
            username='testuser',
            password='pass123'
        )
        self.client.force_authenticate(user=user)

        response = self.client.get('/api/tickets/99999')
        assert response.status_code == 404

    def test_invalid_json_returns_400(self):
        """Test that invalid JSON returns 400"""
        response = self.client.post(
            '/api/login',
            'not json',
            content_type='application/json'
        )
        assert response.status_code == 400


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
