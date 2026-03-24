import os
import sys
from typing import Any

import httpx


BASE_URL = os.getenv("UAT_BASE_URL", "http://127.0.0.1:8060")
EMAIL = os.getenv("UAT_EMAIL", "")
PASSWORD = os.getenv("UAT_PASSWORD", "")


def fail(message: str) -> None:
    print(f"FAIL: {message}")
    sys.exit(1)


def ok(message: str) -> None:
    print(f"OK: {message}")


def require(condition: bool, message: str) -> None:
    if not condition:
        fail(message)


def main() -> None:
    if not EMAIL or not PASSWORD:
        fail("Set UAT_EMAIL and UAT_PASSWORD env vars before running this test")

    with httpx.Client(base_url=BASE_URL, timeout=15.0, follow_redirects=True) as client:
        health = client.get("/openapi.json")
        require(health.status_code == 200, "backend is not reachable")
        ok("backend reachable")

        login = client.post("/auth/login", json={"email": EMAIL, "password": PASSWORD})
        require(login.status_code == 200, "login failed for UAT user")
        ok("login works")

        tickets = client.get("/tickets")
        require(tickets.status_code == 200, "tickets list failed")
        tickets_data: list[dict[str, Any]] = tickets.json()
        require(isinstance(tickets_data, list), "tickets payload is not a list")
        ok("tickets list works")

        analytics = client.get("/analytics/summary")
        require(analytics.status_code == 200, "analytics endpoint failed")
        analytics_data = analytics.json()
        require("total_tickets" in analytics_data, "analytics missing total_tickets")
        ok("analytics works")

        duplicate = client.post(
            "/tickets/check-duplicates",
            json={
                "title": "water leakage in hostel",
                "description": "water tap is leaking",
                "category": "Water",
                "location": "Hostel",
            },
        )
        require(duplicate.status_code == 200, "duplicate detection failed")
        dup_data = duplicate.json()
        require("duplicate_count" in dup_data, "duplicate response missing duplicate_count")
        ok("duplicate detection works")

        if tickets_data:
            ticket_id = tickets_data[0]["id"]
            feedback = client.post(
                f"/tickets/{ticket_id}/feedback",
                json={"rating": 5, "comment": "UAT feedback check"},
            )
            require(feedback.status_code == 200, "feedback submit failed")
            ok("feedback submit works")
        else:
            ok("feedback submit skipped because no tickets exist")

    print("PASS: UAT smoke test completed")


if __name__ == "__main__":
    main()
