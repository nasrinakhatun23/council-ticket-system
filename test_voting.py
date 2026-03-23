import requests
import hashlib

BASE_URL = "http://127.0.0.1:8060"

# Create a session
session = requests.Session()

# Step 1: Create a test user (or use existing)
print("=== Creating test user ===")
test_email = "test123@example.com"
test_password = "test123456"
signup_resp = session.post(f"{BASE_URL}/auth/signup", json={
    "name": "Test User",
    "email": test_email,
    "password": test_password
})
print(f"Signup Status: {signup_resp.status_code}")
if signup_resp.status_code == 200:
    print(f"User created!")
else:
    print(f"Signup response: {signup_resp.json()}")

# Step 2: Login
print("\n=== Logging in ===")
login_resp = session.post(f"{BASE_URL}/auth/login", json={
    "email": test_email,
    "password": test_password
})
print(f"Login Status: {login_resp.status_code}")
print(f"Response: {login_resp.json()}")
print(f"Session Cookies: {dict(session.cookies)}")

# Step 3: Verify auth
print("\n=== Verifying authentication ===")
auth_resp = session.get(f"{BASE_URL}/auth/me")
print(f"Auth Status: {auth_resp.status_code}")
print(f"User: {auth_resp.json()}")

# Step 4: Try voting
print("\n=== Testing vote endpoint ===")
vote_resp = session.post(f"{BASE_URL}/tickets/1/vote", json={})
print(f"Vote Status: {vote_resp.status_code}")
print(f"Response: {vote_resp.json()}")

print("\n✓ All tests completed!")
