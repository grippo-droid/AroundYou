import urllib.request
import urllib.error
import json
import time

BASE_URL = "http://localhost:8000"

# User A Credentials
USER_A_PHONE = "1234567890"
USER_A_PASS = "password123"

# User B Credentials (will register if needed)
USER_B_PHONE = "0987654321"
USER_B_PASS = "password123"
USER_B_NAME = "Test User B"

def make_request(url, method="GET", data=None, token=None, cookies=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f"Bearer {token}"
    
    if cookies:
        headers['Cookie'] = "; ".join([f"{k}={v}" for k, v in cookies.items()])

    if data:
        json_data = json.dumps(data).encode("utf-8")
    else:
        json_data = None

    req = urllib.request.Request(url, data=json_data, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as response:
            # Extract cookies from headers
            res_cookies = {}
            if 'Set-Cookie' in response.headers:
                for cookie in response.headers.get_all('Set-Cookie'):
                    parts = cookie.split(';')[0].split('=', 1)
                    if len(parts) == 2:
                        res_cookies[parts[0]] = parts[1]
            
            return json.loads(response.read().decode()), res_cookies
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.read().decode()}")
        # return None, {}
        raise

def register_user_b():
    print("Registering User B...")
    url = f"{BASE_URL}/auth/register"
    data = {"name": USER_B_NAME, "phone": USER_B_PHONE, "password": USER_B_PASS, "role": "user"}
    try:
        make_request(url, "POST", data)
        print("User B registered.")
    except urllib.error.HTTPError as e:
        if e.code == 400:
            print("User B already exists (expected).")
        else:
            raise

def login(phone, password):
    url = f"{BASE_URL}/auth/login"
    data = {"phone": phone, "password": password}
    resp, cookies = make_request(url, "POST", data)
    token = resp["data"]["access_token"]
    return token, cookies # Return both token and cookies

def get_user_id(token, cookies):
    url = f"{BASE_URL}/auth/me"
    resp, _ = make_request(url, "GET", token=token, cookies=cookies)
    return resp["data"]["_id"]

def send_message(token, cookies, receiver_id, content):
    url = f"{BASE_URL}/messages/send"
    data = {
        "receiver_id": receiver_id,
        "receiver_type": "user",
        "content": content
    }
    resp, _ = make_request(url, "POST", data, token=token, cookies=cookies)
    return resp

def get_conversations(token, cookies):
    url = f"{BASE_URL}/messages/conversations"
    resp, _ = make_request(url, "GET", token=token, cookies=cookies)
    return resp

def get_messages(token, cookies, conversation_id):
    url = f"{BASE_URL}/messages/{conversation_id}"
    resp, _ = make_request(url, "GET", token=token, cookies=cookies)
    return resp

try:
    # 1. Register User B
    register_user_b()

    # 2. Login User A and B
    print("\nLogging in User A...")
    token_a, cookies_a = login(USER_A_PHONE, USER_A_PASS)
    id_a = get_user_id(token_a, cookies_a)
    print(f"User A ID: {id_a}")

    print("Logging in User B...")
    token_b, cookies_b = login(USER_B_PHONE, USER_B_PASS)
    id_b = get_user_id(token_b, cookies_b)
    print(f"User B ID: {id_b}")

    # 3. User A sends message to User B
    print(f"\nSending message from A to B ({id_b})...")
    msg_content = f"Hello from A at {time.time()}"
    send_resp = send_message(token_a, cookies_a, id_b, msg_content)
    print("Message sent:", send_resp)

    # 4. User B gets conversations
    print("\nUser B checking conversations...")
    convs_b = get_conversations(token_b, cookies_b)
    print(f"User B has {len(convs_b)} conversations.")
    
    if len(convs_b) > 0:
        conv_id = convs_b[0]["_id"]
        print(f"Checking conversation {conv_id}...")
        
        # 5. User B gets messages
        msgs = get_messages(token_b, cookies_b, conv_id)
        print(f"Found {len(msgs)} messages.")
        print("Last message:", msgs[-1]["content"])
        
        assert msgs[-1]["content"] == msg_content
        print("\nVERIFICATION SUCCESSFUL")
    else:
        print("\nVERIFICATION FAILED: No conversations found for User B")

except Exception as e:
    print(f"\nVERIFICATION FAILED: {e}")
    import traceback
    traceback.print_exc()
