# 🚀 App Startup Guide

## ✅ Current Status

**Backend** (Running ✅):

- Django + Daphne ASGI server: **http://localhost:8000**
- PostgreSQL database: Running
- Redis cache: Running
- All Docker containers started 22 minutes ago

**Frontend** (Not Running ❌):

- Vite dev server needs to be started
- Should run on: **http://localhost:5173**

---

## 📋 How to Start Everything

### **Terminal 1 - Backend (Already Running)**

Backend is already running in Docker. To monitor logs:

```bash
cd /home/essam/graduation_project/server
docker compose logs -f web
```

If you need to restart:

```bash
docker compose down
docker compose up -d
```

### **Terminal 2 - Frontend (START THIS)**

```bash
cd /home/essam/graduation_project/web
npm run dev
```

Wait for output showing:

```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

---

## 🧪 Testing Instructions

### **Step 1: Open the App**

- Go to: **http://localhost:5173**
- You should see login page

### **Step 2: Login & Create Test Environment**

Option A - Use existing users via Django shell:

```bash
# In another terminal:
cd /home/essam/graduation_project/server
docker compose exec web python manage.py shell
```

```python
from django.contrib.auth.models import User
from accounts.models import Profile

# List all users
for u in User.objects.all():
    print(f"{u.username} - {u.profile.role if hasattr(u, 'profile') else 'No profile'}")
```

Option B - Create new test users:

```bash
cd /home/essam/graduation_project/server
docker compose exec web python manage.py createsuperuser
# Then access Django admin at http://localhost:8000/admin/
```

---

## 🧬 Testing the 3 Features

### **Test 1: Chat (Real-Time Messages)**

1. **Open two browser windows/tabs** (or use incognito for second user)
   - Tab A: Login as User A
   - Tab B: Login as User B (different user)

2. **Create a ticket** from Tab A
   - Go to "Create Ticket" page
   - Fill in title and description
   - Submit

3. **Open ticket in both tabs**
   - Tab A: Click on ticket → should see chat modal
   - Tab B: Refresh page, go to same ticket → should see chat modal

4. **Send message from Tab A**
   - Type message in chat box
   - Send
   - ✅ Message should **appear immediately** in Tab A
   - ✅ Message should **appear in Tab B** WITHOUT refresh

5. **Check console** (both tabs):
   - DevTools → Console
   - Should see: `💬 Chat message received` when message sent/received
   - Should see: `Authenticated as [username]` on page load

**Common Issues**:

- ❌ Message doesn't appear: Check DevTools console for errors
- ❌ Tab B doesn't update: WebSocket connection issue
- ❌ No console messages: Check if frontend built correctly

---

### **Test 2: Ticket Creation for Manager**

1. **Login as Manager** (must have role='MANAGER' in token)

2. **Verify Role**:
   - DevTools → Console
   - Run: `localStorage.getItem('access_token') | jq . `
   - Decode at: https://jwt.io
   - Should show: `"role": "MANAGER"`

3. **Navigate to Create Ticket**

4. **Verify Employee Dropdown**:
   - ✅ Should see dropdown with employees listed
   - ❌ Dropdown not showing = Role not recognized as MANAGER

5. **Fill & Submit Form**:
   - Title: "Test Ticket"
   - Description: "Testing ticket creation"
   - Assign to Employee: Select one from dropdown
   - Submit

6. **Check Result**:
   - ✅ Success: Redirected to ticket detail page
   - ✅ Ticket appears in manager's dashboard in real-time
   - ❌ Error: Check DevTools Network tab → POST /api/tickets response

7. **Check Backend Logs**:
   - Run: `docker compose logs web | grep -i "ticket created"`
   - Should see: `📢 Broadcast to managers: New Ticket Created`

**Common Issues**:

- ❌ 403 Permission Denied: Role is not MANAGER
- ❌ Dropdown doesn't show: /employees API call failed (check Network tab)
- ❌ Ticket not created: Check Docker logs for error

---

### **Test 3: Real-Time Notifications**

1. **Open two tabs** (or windows):
   - Tab A: Logged in as Manager
   - Tab B: Logged in as Customer

2. **Create Ticket as Customer** (Tab B):
   - Navigate to Create Ticket
   - Fill and submit

3. **Check Manager Notifications** (Tab A):
   - ✅ Notification should appear in top-right notification center in **real-time** (no refresh needed)
   - ✅ Click notification → should navigate to ticket
   - ✅ Notification should include: "New ticket from [customer name]"

4. **Check Console** (Tab A):
   - DevTools → Console
   - Should see: `📬 Notification: TICKET_CREATED`
   - Should show: `Updated notifications via WebSocket`

**Common Issues**:

- ❌ Notification doesn't appear: WebSocket not connected
- ❌ Notification appears but disappears: Notification store not persisting
- ❌ Manager doesn't see notification: Target group not configured properly

---

## 🔍 Debugging Commands

### **View Backend Logs**

```bash
# Last 50 lines
docker compose logs web --tail=50

# Follow in real-time
docker compose logs web -f

# Search for errors
docker compose logs web | grep ERROR
```

### **Check Django Database**

```bash
# Connect to PostgreSQL
docker compose exec db psql -U postgres -d graduation_project -c "SELECT id, title, created_by FROM tickets_ticket LIMIT 5;"
```

### **Check Redis Cache**

```bash
# Connect to Redis CLI
docker compose exec redis redis-cli

# View all keys
KEYS *

# Get value
GET <key>
```

### **Access Django Shell**

```bash
docker compose exec web python manage.py shell
```

---

## 🛠️ Quick Fixes if Something Breaks

### **Frontend won't compile**

```bash
cd /home/essam/graduation_project/web
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### **Backend won't start**

```bash
cd /home/essam/graduation_project/server
docker compose down
docker compose up -d
docker compose logs web -f  # Check for errors
```

### **WebSocket not connecting**

- ✅ Verify Redis is running: `docker compose ps | grep redis`
- ✅ Verify backend is running: `docker compose ps | grep web`
- ✅ Check browser console for connection errors
- ✅ Verify `/ws/unified/` route exists in routing.py

### **Database issues**

```bash
docker compose exec web python manage.py migrate
docker compose exec web python manage.py makemigrations
```

---

## 📊 Expected Architecture

```
User opens browser
  ↓
Frontend (Vite dev server on port 5173)
  ├─ Login via REST API (http://localhost:8000/api/auth/login)
  ├─ Connect WebSocket (ws://localhost:8000/ws/unified/)
  └─ Load tickets via REST API (http://localhost:8000/api/tickets)

Backend (Daphne ASGI on port 8000)
  ├─ WebSocket handler (Daphne)
  ├─ Django Ninja REST API
  ├─ PostgreSQL (Database)
  └─ Redis (WebSocket channel layer)

Real-time Flow:
  Manager creates ticket
    ↓
  Django API endpoint called
    ↓
  notification_service.ticket_created()
    ↓
  Broadcast to Redis channel: managers_notifications
    ↓
  Daphne WebSocket picks up message
    ↓
  Sends to all connected managers via WebSocket
    ↓
  React receives in WebSocketProvider.onmessage
    ↓
  Notification added to Zustand store
    ↓
  NotificationCenter component re-renders
    ↓
  Manager sees notification in real-time ✅
```

---

## ✨ Next Steps

1. **Start the frontend** using the command above
2. **Test each feature** following the steps
3. **Check DevTools console** if anything doesn't work
4. **Monitor Docker logs** while testing
5. **Report which feature doesn't work** and I'll debug it

---

**Status Codes Guide**:

- ✅ Working
- ❌ Not working / Issue
- 🔄 In progress
- ⚠️ Warning
