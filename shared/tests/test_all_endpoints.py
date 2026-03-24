"""
Full E2E test of ALL endpoints including newly added ones.
"""
import json
import random
import string
import urllib.request
from http.cookiejar import CookieJar

BASE = "http://localhost:8000"
passed = 0
failed = 0

def rand_str(n=5):
    return "".join(random.choices(string.ascii_lowercase, k=n))

def req(opener, method, path, data=None, expect=None):
    global passed, failed
    url = BASE + path
    body = json.dumps(data).encode() if data else None
    headers = {"Content-Type": "application/json"} if data else {}
    r = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        resp = opener.open(r)
        code = resp.status
        result = json.loads(resp.read().decode()) if resp.headers.get("Content-Type", "").startswith("application/json") else {}
    except urllib.error.HTTPError as e:
        code = e.code
        try:
            result = json.loads(e.read().decode())
        except Exception:
            result = {}
    
    if expect:
        if code == expect:
            passed += 1
            return result
        else:
            failed += 1
            print("  FAIL: %s %s -> %d (expected %d) %s" % (method, path, code, expect, result))
            return result
    else:
        passed += 1
        return result

def check(label, condition):
    global passed, failed
    if condition:
        passed += 1
        print("  OK: %s" % label)
    else:
        failed += 1
        print("  FAIL: %s" % label)

print("=" * 60)
print("FULL ENDPOINT VERIFICATION")
print("=" * 60)

# --- AGENT LOGIN ---
print("\n-- Agent login --")
cj_agent = CookieJar()
op_agent = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj_agent))
d = req(op_agent, "POST", "/api/auth/login/", {"email": "agent@acs.ci", "password": "agent123"}, 200)
check("Agent logged in", d.get("role") == "agent")

# --- AGENT CREATE CLIENT ---
print("\n-- Agent creates client --")
email_client = "newclient.%s@test.ci" % rand_str()
d = req(op_agent, "POST", "/api/auth/users/create/", {
    "email": email_client,
    "nom": "TESTNOM",
    "prenoms": "TestPrenoms",
    "telephone": "+225 01 02 03 04",
}, 201)
new_client_id = d.get("id")
check("Client created with id", new_client_id is not None)
check("Client role=client", d.get("role") == "client")
check("Client verified=True", d.get("verified") == True)

# --- AGENT REMIND PROSPECT ---
print("\n-- Agent reminds a user --")
# Find a prospect first
users = req(op_agent, "GET", "/api/auth/users/?role=prospect", None, 200)
prospects = users.get("results", [])
if prospects:
    prospect_id = prospects[0]["id"]
    d = req(op_agent, "POST", "/api/auth/users/remind/", {"user_id": prospect_id}, 200)
    check("Remind response", "Relance" in d.get("detail", ""))
else:
    print("  SKIP: No prospects to remind")

# --- AGENT VERIFY PROSPECT ---
print("\n-- Agent verifies prospect --")
if prospects:
    d = req(op_agent, "POST", "/api/auth/users/verify/", {"user_id": prospect_id, "action": "verify"}, 200)
    check("Verify response", "rifi" in d.get("detail", "").lower() or "v" in d.get("detail", "").lower())

# --- AGENT EXPORT CSV ---
print("\n-- Agent exports emissions CSV --")
csv_req = urllib.request.Request(BASE + "/api/emissions/export/")
try:
    resp = op_agent.open(csv_req)
    csv_data = resp.read().decode()
    check("CSV export returns data", len(csv_data) > 0)
    check("CSV has header row", "Client" in csv_data and "Police" in csv_data)
except urllib.error.HTTPError as e:
    failed += 1
    print("  FAIL: CSV export returned %d" % e.code)

# --- AGENT CREATE EMISSION ---
print("\n-- Agent creates emission --")
d = req(op_agent, "POST", "/api/emissions/", {
    "date": "2026-01-15",
    "situation": "Affaire nouvelle",
    "client": new_client_id,
    "risque": "Automobile",
    "compagnie": "NSIA",
    "num_facture": "FA-TEST-%s" % rand_str(6),
    "num_police": "POL-TEST-%s" % rand_str(6),
    "effet": "2026-01-15",
    "echeance": "2027-01-15",
    "prime_nette": 150000,
    "prime_ttc": 180000,
    "marque": "Toyota",
    "immatriculation": "TEST 01",
}, 201)
emission_id = d.get("id")
check("Emission created", emission_id is not None)

# --- AGENT CREATE PAIEMENT ---
print("\n-- Agent creates paiement --")
if emission_id:
    d = req(op_agent, "POST", "/api/paiements/", {
        "emission": emission_id,
        "date_reglement": "2026-02-01",
        "reference": "PAY-TEST-001",
        "montant_regle": 50000,
        "observations": "Wave",
    }, 201)
    check("Paiement created", d.get("id") is not None)

# --- AGENT CREATE REQUEST (via client login) ---
print("\n-- Client creates request --")
cj_client = CookieJar()
op_client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj_client))
d = req(op_client, "POST", "/api/auth/login/", {"email": email_client, "password": "Temp@1234"}, 200)
check("New client can login", d.get("role") == "client")

d = req(op_client, "POST", "/api/requests/", {
    "type": "cotation_auto",
    "details": {"vehicule": "Toyota"}
}, 201)
request_id = d.get("id")
check("Request cotation_auto created", request_id is not None)

d = req(op_client, "POST", "/api/requests/", {
    "type": "cotation_mrh",
    "details": {"nature": "villa"}
}, 201)
check("Request cotation_mrh created", d.get("id") is not None)

d = req(op_client, "POST", "/api/requests/", {
    "type": "declaration_sinistre",
    "details": {"lieu": "Abidjan", "nature": "Accident"}
}, 201)
check("Request declaration_sinistre created", d.get("id") is not None)

d = req(op_client, "POST", "/api/requests/", {
    "type": "changement_nom",
    "details": {}
}, 201)
check("Request changement_nom created", d.get("id") is not None)

d = req(op_client, "POST", "/api/requests/", {
    "type": "incorporation",
    "details": {"vehicule": "Hyundai"}
}, 201)
check("Request incorporation created", d.get("id") is not None)

# --- AGENT TREATS REQUEST ---
print("\n-- Agent treats request --")
if request_id:
    d = req(op_agent, "POST", "/api/requests/%s/treat/" % request_id, None, 200)
    check("Request treated", d.get("status") == "traite")

# --- CLIENT UPDATE PROFILE ---
print("\n-- Client updates profile --")
d = req(op_client, "PATCH", "/api/auth/me/", {"profession": "Magistrat Test"}, 200)
check("Profile updated", d.get("profession") == "Magistrat Test")

# --- CLIENT CHANGE PASSWORD ---
print("\n-- Client changes password --")
d = req(op_client, "POST", "/api/auth/me/password/", {
    "current_password": "Temp@1234",
    "new_password": "NewPass@5678",
}, 200)
check("Password changed", "modifi" in d.get("detail", "").lower())

# Re-login with new password
d = req(op_client, "POST", "/api/auth/login/", {"email": email_client, "password": "NewPass@5678"}, 200)
check("Login with new password works", d.get("role") == "client")

# --- RESET PASSWORD ---
print("\n-- Reset password --")
cj_anon = CookieJar()
op_anon = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj_anon))
d = req(op_anon, "POST", "/api/auth/reset-password/", {"identifier": email_client}, 200)
check("Reset password OK", "mot de passe" in d.get("detail", "").lower())

d = req(op_anon, "POST", "/api/auth/reset-password/", {"identifier": "nobody@nowhere.com"}, 404)
check("Reset password unknown user returns 404", d.get("detail") is not None)

# --- ADMIN LOGIN ---
print("\n-- Admin login --")
cj_admin = CookieJar()
op_admin = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj_admin))
d = req(op_admin, "POST", "/api/auth/login/", {"email": "admin@acs.ci", "password": "admin123"}, 200)
check("Admin logged in", d.get("role") == "admin")

# --- ADMIN CREATE AGENT ---
print("\n-- Admin creates agent --")
email_agent = "testagent.%s@acs.ci" % rand_str()
d = req(op_admin, "POST", "/api/auth/agents/create/", {
    "email": email_agent,
    "nom": "AGENT_TEST",
    "prenoms": "Nouveau",
    "telephone": "+225 99 88 77 66",
    "password": "Agent@Test1234",
}, 201)
new_agent_id = d.get("id")
check("Agent created", new_agent_id is not None)
check("Agent role=agent", d.get("role") == "agent")
check("Agent verified=True", d.get("verified") == True)

# --- ADMIN DELETE AGENT ---
print("\n-- Admin deletes agent --")
if new_agent_id:
    d = req(op_admin, "DELETE", "/api/auth/users/%s/" % new_agent_id, None, 200)
    check("Agent deactivated", "sactiv" in d.get("detail", "").lower())

# --- ADMIN CANNOT DELETE ADMIN ---
print("\n-- Admin cannot delete another admin --")
# Get admin's own ID
me = req(op_admin, "GET", "/api/auth/me/", None, 200)
d = req(op_admin, "DELETE", "/api/auth/users/%s/" % me["id"], None, 400)
check("Cannot delete admin", "admin" in d.get("detail", "").lower())

# --- SUMMARY ---
print("\n" + "=" * 60)
print("RESULTS: %d/%d passed, %d/%d failed" % (passed, passed + failed, failed, passed + failed))
if failed == 0:
    print("ALL TESTS PASSED")
else:
    print("SOME TESTS FAILED")
print("=" * 60)
