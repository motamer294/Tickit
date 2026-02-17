import os
os.environ["NINJA_SKIP_REGISTRY"] = "True"
from django.test import TestCase
from ninja.testing import TestClient
from core.api import api
from accounts.models import User
from tickets.models import Ticket
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
