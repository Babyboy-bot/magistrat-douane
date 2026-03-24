"""
End-to-end workflow test simulating the full user journey:
1. Register a new prospect
2. Login as agent → see prospect → verify prospect
3. Login as the now-verified user → check verified=True, role=client
4. Login as client → check data access
5. Login as admin → check supervision
"""
import urllib.request
import urllib.error
import json
import random
import string
from http.cookiejar import CookieJar

BASE = "http://localhost:8000"
PASS = 0
FAIL = 0

def make_opener():
    cj = CookieJar()
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj)), cj

def api(opener, method, path, data=None, headers=None):
    hdrs = {"Content-Type": "application/json"}
    if headers:
        hdrs.update(headers)
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(f"{BASE}{path}", data=body, headers=hdrs, method=method)
    try:
        r = opener.open(req)
        return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try:
            body = json.loads(e.read().decode())
        except:
            body = {}
        return e.code, body

def get_csrf(opener):
    status, data = api(opener, "GET", "/api/csrf/")
    return data.get("csrftoken", "")

def check(label, condition, detail=""):
    global PASS, FAIL
    if condition:
        PASS += 1
        print(f"  ✓ {label}")
    else:
        FAIL += 1
        print(f"  ✗ {label} — {detail}")

# Generate unique email
rand = ''.join(random.choices(string.ascii_lowercase, k=5))
TEST_EMAIL = f"test.{rand}@magistrature.ci"
TEST_PWD = "TestPass2026!"

print("=" * 60)
print("E2E WORKFLOW TEST")
print("=" * 60)

# ─── STEP 1: Register ───
print("\n── STEP 1: Register new prospect ──")
op1, _ = make_opener()
status, data = api(op1, "POST", "/api/auth/register/", {
    "email": TEST_EMAIL,
    "password": TEST_PWD,
    "nom": "TESTNOM",
    "prenoms": "TestPrenom",
    "profession": "Magistrat test",
    "profession_type": "magistrat",
    "telephone": "0700000099",
})
check("Register returns 201", status == 201, f"got {status}: {data}")
check("Response has id", data.get("id") is not None, f"data={data}")
check("Response has role=prospect", data.get("role") == "prospect", f"role={data.get('role')}")
check("Response has verified=False", data.get("verified") == False, f"verified={data.get('verified')}")
PROSPECT_ID = data.get("id")
print(f"  → Registered user id={PROSPECT_ID} email={TEST_EMAIL}")

# ─── STEP 2: Login as prospect (should work, banner should show) ───
print("\n── STEP 2: Login as prospect ──")
op2, _ = make_opener()
status, data = api(op2, "POST", "/api/auth/login/", {
    "email": TEST_EMAIL, "password": TEST_PWD
})
check("Prospect login returns 200", status == 200, f"got {status}: {data}")
check("Login returns verified=False", data.get("verified") == False, f"verified={data.get('verified')}")
check("Login returns role=prospect", data.get("role") == "prospect", f"role={data.get('role')}")

# Check prospect can access /api/auth/me/
status, me = api(op2, "GET", "/api/auth/me/")
check("Prospect /me works", status == 200, f"got {status}")
check("/me verified=False", me.get("verified") == False, f"verified={me.get('verified')}")

# Check prospect CANNOT list users
status, _ = api(op2, "GET", "/api/auth/users/")
check("Prospect cannot list users (403)", status == 403, f"got {status}")

# ─── STEP 3: Login as agent ───
print("\n── STEP 3: Login as agent ──")
op3, _ = make_opener()
status, agent = api(op3, "POST", "/api/auth/login/", {
    "email": "agent@acs.ci", "password": "agent123"
})
check("Agent login returns 200", status == 200, f"got {status}: {agent}")
check("Agent role=agent", agent.get("role") == "agent", f"role={agent.get('role')}")

# ─── STEP 4: Agent lists users, sees prospect ───
print("\n── STEP 4: Agent lists users ──")
status, users_resp = api(op3, "GET", "/api/auth/users/")
check("Users list returns 200", status == 200, f"got {status}")
users = users_resp.get("results", [])
prospect_in_list = [u for u in users if u["id"] == PROSPECT_ID]
check(f"Prospect id={PROSPECT_ID} in users list", len(prospect_in_list) == 1, 
      f"found {len(prospect_in_list)} matches in {[u['id'] for u in users]}")
if prospect_in_list:
    check("Prospect role=prospect in list", prospect_in_list[0]["role"] == "prospect",
          f"role={prospect_in_list[0]['role']}")

# ─── STEP 5: Agent verifies prospect (with CSRF) ───
print("\n── STEP 5: Agent verifies prospect ──")
csrf = get_csrf(op3)
check("Got CSRF token", len(csrf) > 10, f"csrf={csrf}")

status, verify_resp = api(op3, "POST", "/api/auth/users/verify/", 
    {"user_id": PROSPECT_ID, "action": "verify"},
    {"X-CSRFToken": csrf})
check("Verify returns 200", status == 200, f"got {status}: {verify_resp}")

# ─── STEP 6: Agent re-lists users, prospect is now client ───
print("\n── STEP 6: Verify reflected in users list ──")
status, users_resp2 = api(op3, "GET", "/api/auth/users/")
users2 = users_resp2.get("results", [])
verified_user = [u for u in users2 if u["id"] == PROSPECT_ID]
if verified_user:
    check("User now role=client", verified_user[0]["role"] == "client",
          f"role={verified_user[0]['role']}")
    check("User now verified=True", verified_user[0]["verified"] == True,
          f"verified={verified_user[0]['verified']}")
else:
    # After verification, role changes to "client" — agent can still see clients
    check("User still visible to agent", False, "user disappeared from agent list")

# ─── STEP 7: Verified user logs in again ───
print("\n── STEP 7: Verified user logs in ──")
op4, _ = make_opener()
status, login_data = api(op4, "POST", "/api/auth/login/", {
    "email": TEST_EMAIL, "password": TEST_PWD
})
check("Login returns 200", status == 200, f"got {status}: {login_data}")
check("Login returns role=client", login_data.get("role") == "client",
      f"role={login_data.get('role')}")
check("Login returns verified=True", login_data.get("verified") == True,
      f"verified={login_data.get('verified')}")

# Check /me
status, me2 = api(op4, "GET", "/api/auth/me/")
check("/me returns role=client", me2.get("role") == "client", f"role={me2.get('role')}")
check("/me returns verified=True", me2.get("verified") == True, f"verified={me2.get('verified')}")

# ─── STEP 8: Client accesses emissions/requests ───
print("\n── STEP 8: Client accesses data endpoints ──")
status, _ = api(op4, "GET", "/api/emissions/")
check("Client can access /api/emissions/", status == 200, f"got {status}")

status, _ = api(op4, "GET", "/api/requests/")
check("Client can access /api/requests/", status == 200, f"got {status}")

status, _ = api(op4, "GET", "/api/dashboard/stats/")
check("Client can access /api/dashboard/stats/", status == 200, f"got {status}")

# Client should NOT access users list
status, _ = api(op4, "GET", "/api/auth/users/")
check("Client cannot list users (403)", status == 403, f"got {status}")

# ─── STEP 9: Client logs out ───
print("\n── STEP 9: Logout ──")
status, _ = api(op4, "POST", "/api/auth/logout/")
check("Logout returns 200", status == 200, f"got {status}")

status, _ = api(op4, "GET", "/api/auth/me/")
check("After logout /me returns 401", status == 401, f"got {status}")

# ─── STEP 10: Admin test ───
print("\n── STEP 10: Admin access ──")
op5, _ = make_opener()
status, admin = api(op5, "POST", "/api/auth/login/", {
    "email": "admin@acs.ci", "password": "admin123"
})
check("Admin login returns 200", status == 200, f"got {status}")
check("Admin role=admin", admin.get("role") == "admin", f"role={admin.get('role')}")

status, all_users = api(op5, "GET", "/api/auth/users/")
check("Admin can list all users", status == 200, f"got {status}")
all_results = all_users.get("results", [])
check("Admin sees all users", len(all_results) >= 4, f"count={len(all_results)}")

# ─── SUMMARY ───
print("\n" + "=" * 60)
total = PASS + FAIL
print(f"RESULTS: {PASS}/{total} passed, {FAIL}/{total} failed")
if FAIL == 0:
    print("ALL TESTS PASSED ✓")
else:
    print(f"⚠ {FAIL} TEST(S) FAILED")
print("=" * 60)
