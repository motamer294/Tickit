#!/usr/bin/env python3
import requests
import json

url = "http://localhost:8000/api/login"
payload = {
    "username": "essam",
    "password": "password123"
}

print("Testing login endpoint...")
print(f"URL: {url}")
print(f"Credentials: {payload}")

try:
    response = requests.post(url, json=payload, timeout=5)
    print(f"\nStatus Code: {response.status_code}")
    print(f"Response:\n{json.dumps(response.json(), indent=2)}")

    if response.status_code == 200:
        print("\n Login successful!")
        token = response.json().get('access')
        print(f"Access Token: {token[:50]}...")
    else:
        print(f"\n Login failed: {response.status_code}")

except Exception as e:
    print(f"Error: {e}")
