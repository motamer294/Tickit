import os
os.environ["NINJA_SKIP_REGISTRY"] = "True"
from django.test import TestCase
from ninja.testing import TestClient
from core.api import api
from accounts.models import User
from tickets.models import Comment, Ticket
from django.contrib.auth.hashers import make_password
import json

class TestCoreApi(TestCase):
    def setUp(self):
        self.client = TestClient(api)
        self.password = "strong_password_123"
        
        # Create users with different roles
        # Assuming User.Role.MANAGER is "MANAGER", etc.
        self.manager = User.objects.create(
            username="manager_user",
            password=make_password(self.password),
            role="MANAGER"
        )
        self.employee = User.objects.create(
            username="employee_user",
            password=make_password(self.password),
            role="EMPLOYEE"
        )
        self.customer = User.objects.create(
            username="customer_user",
            password=make_password(self.password),
            role="CUSTOMER"
        )

    def get_token_headers(self, username):
        """Helper to obtain JWT token and format headers"""
        response = self.client.post(
            "/token/pair",
            json={"username": username, "password": self.password},
            content_type="application/json"
        )
        data = json.loads(response.content)
        return {"Authorization": f"Bearer {data['access']}"}

    def test_signup(self):
        payload = {
            "username": "new_customer",
            "password": "newpassword",
            "role": "CUSTOMER"
        }
        response = self.client.post("/signup", json=payload)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(User.objects.filter(username="new_customer").exists())
        
        # Test duplicate username
        response_dup = self.client.post("/signup", json=payload)
        self.assertEqual(response_dup.status_code, 400)

    def test_create_ticket(self):
        headers = self.get_token_headers("customer_user")
        # Assuming TicketCreateSchema requires title/description
        payload = {
            "title": "My Printer is broken",
            "description": "It is not printing.",
            "priority": "HIGH" 
        }
        response = self.client.post("/tickets", json=payload, headers=headers)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(Ticket.objects.filter(title="My Printer is broken").exists())

    def test_assign_ticket_permission(self):
        # Create a ticket to assign
        ticket = Ticket.objects.create(
            title="Fix Server", 
            description="Urgent", 
            created_by=self.customer,
            status="OPEN"
        )

        # 1. Try to assign as Customer (Should Fail)
        headers_cust = self.get_token_headers("customer_user")
        res_cust = self.client.patch(
            f"/tickets/{ticket.id}/assign/{self.employee.id}",
            headers=headers_cust
        )
        self.assertEqual(res_cust.status_code, 403)

        # 2. Try to assign as Manager (Should Succeed)
        headers_mgr = self.get_token_headers("manager_user")
        res_mgr = self.client.patch(
            f"/tickets/{ticket.id}/assign/{self.employee.id}",
            headers=headers_mgr
        )
        self.assertEqual(res_mgr.status_code, 200)
        
        ticket.refresh_from_db()
        self.assertEqual(ticket.assigned_to, self.employee)
        self.assertEqual(ticket.status, "IN_PROGRESS")

    def test_list_my_tickets_filtering(self):
        # Create tickets for different users
        Ticket.objects.create(title="Customer Ticket", created_by=self.customer)
        Ticket.objects.create(title="Manager Ticket", created_by=self.manager)

        # Customer should only see their own ticket
        headers = self.get_token_headers("customer_user")
        res = self.client.get("/my-tickets", headers=headers)
        data = res.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['title'], "Customer Ticket")
    def test_add_comment_authorization(self):
        """
        Ensures only the Ticket Creator, Assigned Agent, or a Manager 
        can add comments to a specific ticket.
        """
        # 1. Setup: Create a ticket owned by our standard customer and assigned to our employee
        ticket = Ticket.objects.create(
            title="Laptop won't turn on",
            description="It's completely dead.",
            created_by=self.customer,
            assigned_to=self.employee,
            status="OPEN"
        )
        
        # Create a "rogue" user who has no relation to this ticket
        User.objects.create(
            username="nosy_user",
            password=make_password(self.password),
            role="CUSTOMER"
        )
        
        payload = {"text": "Just checking in on this!"}

        # 2. Test Rogue User (Should Fail - 403 Forbidden)
        headers_rogue = self.get_token_headers("nosy_user")
        res_rogue = self.client.post(
            f"/tickets/{ticket.id}/comments", json=payload, headers=headers_rogue
        )
        self.assertEqual(res_rogue.status_code, 403)

        # 3. Test Ticket Creator (Should Succeed - 200 OK)
        headers_creator = self.get_token_headers("customer_user")
        res_creator = self.client.post(
            f"/tickets/{ticket.id}/comments", json=payload, headers=headers_creator
        )
        self.assertEqual(res_creator.status_code, 200)

        # 4. Test Assigned IT Agent (Should Succeed - 200 OK)
        headers_agent = self.get_token_headers("employee_user")
        res_agent = self.client.post(
            f"/tickets/{ticket.id}/comments", json=payload, headers=headers_agent
        )
        self.assertEqual(res_agent.status_code, 200)

        # 5. Test Manager (Should Succeed - 200 OK)
        headers_manager = self.get_token_headers("manager_user")
        res_manager = self.client.post(
            f"/tickets/{ticket.id}/comments", json=payload, headers=headers_manager
        )
        self.assertEqual(res_manager.status_code, 200)

        # 6. Verify Database State
        # We expect exactly 3 comments (Creator, Agent, Manager). The rogue user's comment was blocked.
        self.assertEqual(Comment.objects.filter(ticket=ticket).count(), 3)
    def test_update_ticket_status(self):
        """
        Ensures only the Assigned Agent or Manager can update a ticket's status.
        Also verifies the TicketHistory audit log is created.
        """
        # 1. Setup: Create a ticket assigned to our employee
        from tickets.models import TicketHistory # Ensure this is imported at the top of tests.py
        
        ticket = Ticket.objects.create(
            title="Update Status Test",
            description="Testing the status patch endpoint.",
            created_by=self.customer,
            assigned_to=self.employee,
            status="OPEN"
        )
        
        # 2. Test Unassigned Customer (Should Fail - 403 Forbidden)
        # The customer who submitted it shouldn't be allowed to mark it RESOLVED
        headers_cust = self.get_token_headers("customer_user")
        res_cust = self.client.patch(
            f"/tickets/{ticket.id}/status",
            json={"status": "RESOLVED"},
            headers=headers_cust
        )
        self.assertEqual(res_cust.status_code, 403)

        # 3. Test Invalid Status Choice (Should Fail - 422 Validation Error)
        # Testing our new Pydantic Literal schema restriction
        headers_emp = self.get_token_headers("employee_user")
        res_invalid = self.client.patch(
            f"/tickets/{ticket.id}/status",
            json={"status": "FAKE_STATUS"}, 
            headers=headers_emp
        )
        self.assertEqual(res_invalid.status_code, 422)

        # 4. Test Assigned Employee (Should Succeed - 200 OK)
        res_emp = self.client.patch(
            f"/tickets/{ticket.id}/status",
            json={"status": "RESOLVED"},
            headers=headers_emp
        )
        self.assertEqual(res_emp.status_code, 200)

        # 5. Verify Database State and Audit Log
        ticket.refresh_from_db()
        self.assertEqual(ticket.status, "RESOLVED")
        
        # Confirm our services.py correctly generated the history record!
        history_logs = TicketHistory.objects.filter(ticket=ticket)
        self.assertEqual(history_logs.count(), 1)
        self.assertEqual(history_logs.first().old_status, "OPEN")
        self.assertEqual(history_logs.first().new_status, "RESOLVED")
        self.assertEqual(history_logs.first().changed_by, self.employee)