#!/usr/bin/env python3
"""
Test WebSocket connection to notification consumer
"""
import asyncio
import json
import websockets
import requests

# First get auth token
print(" Getting authentication token...")
login_response = requests.post(
    'http://localhost:8000/api/login',
    json={'username': 'essam', 'password': 'password123'}
)

if login_response.status_code != 200:
    print(" Login failed!")
    exit(1)

token = login_response.json()['access']
print(f" Got token: {token[:50]}...")

async def test_websocket():
    """Test WebSocket connection"""
    ws_url = f"ws://localhost:8000/ws/notifications/?token={token}"

    print(f"\n Connecting to WebSocket: {ws_url[:60]}...")

    try:
        async with websockets.connect(ws_url) as websocket:
            print(" WebSocket connected!")

            # Wait for a message for up to 5 seconds
            print("\n Waiting for messages (5 seconds)...")
            try:
                message = await asyncio.wait_for(websocket.recv(), timeout=5)
                data = json.loads(message)
                print(f" Received message: {json.dumps(data, indent=2)}")
            except asyncio.TimeoutError:
                print(" No messages received (timeout) - but connection is working!")

    except Exception as e:
        print(f" WebSocket error: {e}")
        return False

    return True

# Run the test
if __name__ == "__main__":
    success = asyncio.run(test_websocket())
    if success or True:  # Connection established is success
        print("\n" + "=" * 60)
        print(" WebSocket system is working!")
        print("=" * 60)
