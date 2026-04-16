"""
🎯 INTEGRATION TESTS - Critical System Paths
Tests the most important user workflows and API functionality
"""
import pytest
from django.contrib.auth import get_user_model
from django.test import TestCase, Client
import json

User = get_user_model()


class AuthenticationWorkflowTest(TestCase):
    """Test user authentication workflow"""

    def setUp(self):
        self.client = Client()

    def test_signup_and_login_workflow(self):
        """Full workflow: signup → login → access protected resource"""
        # 1. Signup
        signup_response = self.client.post('/api/signup',
            data=json.dumps({'username': 'newtoken', 'password': 'secure123', 'role': 'CUSTOMER'}),
            content_type='application/json'
        )
        assert signup_response.status_code == 200, f"Signup failed: {signup_response.content}"
        signup_data = json.loads(signup_response.content)
        assert 'access' in signup_data
        token = signup_data['access']

        # 2. Verify user created
        assert User.objects.filter(username='newtoken').exists()

        # 3. Login test
        login_response = self.client.post('/api/login',
            data=json.dumps({'username': 'newtoken', 'password': 'secure123'}),
            content_type='application/json'
        )
        assert login_response.status_code == 200

        # 4. Access protected resource with JWT
        self.client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {token}'
        profile_response = self.client.get('/api/profile')
        assert profile_response.status_code == 200


class TicketWorkflowTest(TestCase):
    """Test ticket CRUD operations"""

    def setUp(self):
        self.client = Client()

        # Create and login customer
        User.objects.create_user(username='customer1', password='pass123', role='CUSTOMER')
        login_resp = self.client.post('/api/login',
            data=json.dumps({'username': 'customer1', 'password': 'pass123'}),
            content_type='application/json'
        )
        self.customer_token = json.loads(login_resp.content)['access']
        self.client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {self.customer_token}'

    def test_customer_can_create_ticket(self):
        """Test ticket creation by customer"""
        response = self.client.post('/api/tickets',
            data=json.dumps({
                'title': 'Network Connection Issue',
                'description': 'Cannot connect to company VPN from home office'
            }),
            content_type='application/json'
        )
        assert response.status_code == 201, f"Failed: {response.content}"
        data = json.loads(response.content)
        assert data['title'] == 'Network Connection Issue'
        assert 'id' in data
        self.ticket_id = data['id']

    def test_customer_can_view_own_tickets(self):
        """Test viewing customer's own tickets"""
        # Create ticket first
        self.test_customer_can_create_ticket()

        # View tickets
        response = self.client.get('/api/my-tickets')
        assert response.status_code == 200
        data = json.loads(response.content)
        assert len(data) > 0
        assert any(t['id'] == self.ticket_id for t in data)

    def test_missing_required_fields_rejected(self):
        """Test that missing fields are validated"""
        response = self.client.post('/api/tickets',
            data=json.dumps({'title': 'Only title'}),  # Missing description
            content_type='application/json'
        )
        assert response.status_code == 400


class CommentWorkflowTest(TestCase):
    """Test commenting on tickets"""

    def setUp(self):
        self.client = Client()

        # Create customer and ticket
        from tickets.models import Ticket
        self.customer = User.objects.create_user(
            username='commenter',
            password='pass123',
            role='CUSTOMER'
        )

        self.ticket = Ticket.objects.create(
            title='Test Ticket',
            description='A ticket for testing comments',
            created_by=self.customer,
            status='OPEN',
            category='General IT',
            priority='LOW',
            sentiment='Neutral'
        )

        # Login
        login_resp = self.client.post('/api/login',
            data=json.dumps({'username': 'commenter', 'password': 'pass123'}),
            content_type='application/json'
        )
        token = json.loads(login_resp.content)['access']
        self.client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {token}'

    def test_can_add_comment_to_ticket(self):
        """Test adding a comment"""
        response = self.client.post(f'/api/tickets/{self.ticket.id}/comments',
            data=json.dumps({'text': 'This issue also affects my workstation'}),
            content_type='application/json'
        )
        assert response.status_code == 201, f"Failed: {response.content}"

    def test_can_retrieve_ticket_comments(self):
        """Test retrieving comments on a ticket"""
        # Add comment first
        self.test_can_add_comment_to_ticket()

        # Retrieve
        response = self.client.get(f'/api/tickets/{self.ticket.id}/comments')
        assert response.status_code == 200
        data = json.loads(response.content)
        assert len(data) > 0


class RoleBasedAccessTest(TestCase):
    """Test role-based access control"""

    def setUp(self):
        self.client = Client()

        # Create users with different roles
        self.manager = User.objects.create_user(username='mgr', password='pass123', role='MANAGER')
        self.employee = User.objects.create_user(username='emp', password='pass123', role='EMPLOYEE')
        self.customer = User.objects.create_user(username='cust', password='pass123', role='CUSTOMER')

    def test_only_manager_can_access_analytics(self):
        """Test that analytics endpoint is manager-only"""
        # Test as customer - should fail
        login_resp = self.client.post('/api/login',
            data=json.dumps({'username': 'cust', 'password': 'pass123'}),
            content_type='application/json'
        )
        token = json.loads(login_resp.content)['access']
        self.client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {token}'

        response = self.client.get('/api/analytics/dashboard')
        assert response.status_code in [403, 401], "Customer should not access analytics"

        # Test as manager - should succeed
        login_resp = self.client.post('/api/login',
            data=json.dumps({'username': 'mgr', 'password': 'pass123'}),
            content_type='application/json'
        )
        token = json.loads(login_resp.content)['access']
        self.client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {token}'

        response = self.client.get('/api/analytics/dashboard')
        assert response.status_code == 200

    def test_customer_can_create_tickets(self):
        """Test that customers can create tickets"""
        login_resp = self.client.post('/api/login',
            data=json.dumps({'username': 'cust', 'password': 'pass123'}),
            content_type='application/json'
        )
        token = json.loads(login_resp.content)['access']
        self.client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {token}'

        response = self.client.post('/api/tickets',
            data=json.dumps({
                'title': 'Customer Ticket',
                'description': 'Created by customer role'
            }),
            content_type='application/json'
        )
        assert response.status_code == 201


class ValidationTest(TestCase):
    """Test input validation"""

    def setUp(self):
        self.client = Client()

        # Create and login user
        User.objects.create_user(username='testuser', password='pass123')
        login_resp = self.client.post('/api/login',
            data=json.dumps({'username': 'testuser', 'password': 'pass123'}),
            content_type='application/json'
        )
        token = json.loads(login_resp.content)['access']
        self.client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {token}'

    def test_ticket_title_too_short_rejected(self):
        """Test that short titles are rejected"""
        response = self.client.post('/api/tickets',
            data=json.dumps({
                'title': 'ab',  # Too short
                'description': 'Valid description here'
            }),
            content_type='application/json'
        )
        assert response.status_code == 400

    def test_ticket_description_too_short_rejected(self):
        """Test that short descriptions are rejected"""
        response = self.client.post('/api/tickets',
            data=json.dumps({
                'title': 'Valid Title',
                'description': 'short'  # Too short
            }),
            content_type='application/json'
        )
        assert response.status_code == 400

    def test_ticket_title_max_length_enforced(self):
        """Test that titles cannot exceed max length"""
        response = self.client.post('/api/tickets',
            data=json.dumps({
                'title': 'a' * 501,  # Too long
                'description': 'Valid description'
            }),
            content_type='application/json'
        )
        assert response.status_code == 400

    def test_ticket_description_max_length_enforced(self):
        """Test that descriptions cannot exceed max length"""
        response = self.client.post('/api/tickets',
            data=json.dumps({
                'title': 'Valid Title',
                'description': 'a' * 5001  # Too long
            }),
            content_type='application/json'
        )
        assert response.status_code == 400


class ErrorHandlingTest(TestCase):
    """Test error handling"""

    def setUp(self):
        self.client = Client()

    def test_unauthenticated_access_denied(self):
        """Test that unauthenticated requests are rejected"""
        response = self.client.get('/api/profile')
        assert response.status_code == 401

    def test_nonexistent_ticket_returns_404(self):
        """Test that nonexistent tickets return 404"""
        # Login first
        User.objects.create_user(username='testuser', password='pass123')
        login_resp = self.client.post('/api/login',
            data=json.dumps({'username': 'testuser', 'password': 'pass123'}),
            content_type='application/json'
        )
        token = json.loads(login_resp.content)['access']
        self.client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {token}'

        response = self.client.get('/api/tickets/999999')
        assert response.status_code == 404

    def test_invalid_json_returns_error(self):
        """Test that invalid JSON is rejected"""
        response = self.client.post('/api/login',
            data='not json',
            content_type='application/json'
        )
        assert response.status_code == 400


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
