from flask import Flask, render_template, request, jsonify, redirect, url_for
from database import init_db, get_user, book_room, submit_service_request, submit_outing_request, get_pending_requests, update_request_status, get_heatmap_data, get_bookings_heatmap, get_user_requests, get_available_rooms, get_user_room, ensure_user, get_next_resident_login, get_profile, upsert_profile
from flask_jwt_extended import (
    JWTManager,
    jwt_required,
    get_jwt_identity,
    get_jwt,
    create_access_token,
    set_access_cookies,
    unset_jwt_cookies,
)
from flask_cors import CORS
import os
import time
from dotenv import load_dotenv
from authlib.integrations.flask_client import OAuth

app = Flask(__name__, template_folder='../templates', static_folder='../static')
# Load environment variables (e.g., Google OAuth credentials) from backend/.env if present
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
# Same-origin in this app, but enable credentials to be safe when using fetch with credentials
CORS(app, supports_credentials=True)
# Use a stable secret key for local dev so tokens persist across restarts
app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'dev-secret-key')
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', app.config['JWT_SECRET_KEY'])
# Allow JWT in both headers and cookies; for page navigations, cookies are ideal
app.config['JWT_TOKEN_LOCATION'] = ['headers', 'cookies']
app.config['JWT_COOKIE_SECURE'] = False  # set True if serving over HTTPS
app.config['JWT_COOKIE_SAMESITE'] = 'Lax'
app.config['JWT_COOKIE_CSRF_PROTECT'] = False  # simplify for dev
# Keep default host-only cookie domain (works for 127.0.0.1). If needed: app.config['JWT_COOKIE_DOMAIN'] = '127.0.0.1'
jwt = JWTManager(app)
init_db()

# Configure OAuth (Google)
oauth = OAuth(app)
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')
GOOGLE_DISCOVERY_URL = 'https://accounts.google.com/.well-known/openid-configuration'
if GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET:
    oauth.register(
        name='google',
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
        server_metadata_url=GOOGLE_DISCOVERY_URL,
        client_kwargs={'scope': 'openid email profile'}
    )

@app.route('/')
def index():
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        # Support both JSON (fetch) and form posts
        data = request.get_json(silent=True) or {}
        email = (data.get('email') or request.form.get('email', '')).strip()
        password = (data.get('password') or request.form.get('password', '')).strip()
        role = (data.get('role') or request.form.get('role', '')).strip()
        user = get_user(email, password, role)
        if user:
            # Identity must be a string; put role into additional claims
            token = create_access_token(identity=email, additional_claims={'role': role})
            resp = jsonify({'token': token, 'redirect': url_for('dashboard', role=role)})
            # Set JWT into a cookie so browser navigations include auth automatically
            set_access_cookies(resp, token)
            return resp
        return jsonify({'error': 'Invalid credentials'}), 401
    return render_template('login.html')

@app.route('/login/google')
def login_google():
    client = oauth.create_client('google') if oauth else None
    if client is None:
        return jsonify({'error': 'Google OAuth not configured. Set GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET in backend/.env'}), 500
    redirect_uri = url_for('auth_google_callback', _external=True)
    return client.authorize_redirect(redirect_uri)

@app.route('/auth/google/callback')
def auth_google_callback():
    client = oauth.create_client('google') if oauth else None
    if client is None:
        return jsonify({'error': 'Google OAuth not configured'}), 500
    token = client.authorize_access_token()
    userinfo = None
    try:
        userinfo = client.parse_id_token(token)
    except Exception:
        userinfo = None
    if not userinfo:
        try:
            userinfo = client.get('userinfo').json()
        except Exception:
            userinfo = None
    if not userinfo or not userinfo.get('email'):
        return jsonify({'error': 'Google login failed: no email returned'}), 400
    email = userinfo['email']
    email_verified = userinfo.get('email_verified', True)
    if not email_verified:
        return jsonify({'error': 'Google email not verified'}), 400
    # Optional: restrict to gmail.com
    if email.lower().endswith('@gmail.com') is False:
        # Allow any domain? For now, enforce gmail.com as requested
        return jsonify({'error': 'Please use a Gmail account (@gmail.com)'}), 400
    # Ensure user exists as resident
    ensure_user(email, 'resident')
    # Issue JWT cookie as resident
    token_jwt = create_access_token(identity=email, additional_claims={'role': 'resident'})
    resp = redirect(url_for('dashboard', role='resident'))
    set_access_cookies(resp, token_jwt)
    return resp

@app.route('/dashboard/<role>')
@jwt_required()
def dashboard(role):
    current_email = get_jwt_identity()
    claims = get_jwt() or {}
    if claims.get('role') != role:
        return redirect(url_for('login'))
    if role == 'resident':
        requests = get_user_requests(current_email)
        my_room = get_user_room(current_email)
        profile = get_profile(current_email)
        return render_template('resident.html', requests=requests, my_room=my_room, profile=profile)
    elif role == 'warden':
        requests, counters = get_pending_requests()
    heatmap = get_heatmap_data()
    bookings_heatmap = get_bookings_heatmap()
    return render_template('warden.html', requests=requests, heatmap=heatmap, bookings_heatmap=bookings_heatmap, counters=counters)

# [Rest of the routes (book, service, outing, approve) remain unchanged]
@app.route('/book', methods=['POST'])
@jwt_required()
def book():
    current_email = get_jwt_identity()
    claims = get_jwt() or {}
    if claims.get('role') != 'resident':
        return jsonify({'error': 'Unauthorized'}), 403
    data = request.get_json()
    room_id = data.get('room_id', 1)
    group_id = data.get('group_id', 'group1')
    # Acceptances are expected to be epoch millis; default to "now"
    acceptances = data.get('acceptances') or [int(time.time() * 1000)]
    roommates_count = int(data.get('roommates_count') or 1)
    final_timestamp = max(acceptances)
    avg_time = sum(acceptances) / len(acceptances) if acceptances else 0
    group_sync_score = final_timestamp - avg_time
    book_room(room_id, group_id, final_timestamp, group_sync_score, current_email, roommates_count)
    return jsonify({'msg': 'Booking submitted and pending approval'})

@app.route('/service', methods=['POST'])
@jwt_required()
def service():
    claims = get_jwt() or {}
    if claims.get('role') != 'resident':
        return jsonify({'error': 'Unauthorized'}), 403
    # Require approved booking before allowing service request
    current_email = get_jwt_identity()
    if not get_user_room(current_email):
        return jsonify({'error': 'Booking approval required to submit service requests'}), 403
    data = request.get_json()
    # Always use the resident's approved room; ignore any client-provided room_id
    room_id = get_user_room(current_email)
    description = data.get('description', '')
    submit_service_request(room_id, description, current_email)
    return jsonify({'msg': 'Service request submitted'})

@app.route('/outing', methods=['POST'])
@jwt_required()
def outing():
    current_email = get_jwt_identity()
    claims = get_jwt() or {}
    if claims.get('role') != 'resident':
        return jsonify({'error': 'Unauthorized'}), 403
    # Require approved booking before allowing outing request
    if not get_user_room(current_email):
        return jsonify({'error': 'Booking approval required to submit outing requests'}), 403
    data = request.get_json()
    resident_id = current_email
    start_time = data.get('start_time', '')
    end_time = data.get('end_time', '')
    reason = (data.get('reason') or '').strip()
    if not start_time or not end_time:
        return jsonify({'error': 'Start and end time are required'}), 400
    try:
        import datetime as _dt
        st = _dt.datetime.fromisoformat(start_time)
        en = _dt.datetime.fromisoformat(end_time)
        if en <= st:
            return jsonify({'error': 'End time must be after start time'}), 400
    except Exception:
        return jsonify({'error': 'Invalid datetime format'}), 400
    if not reason:
        return jsonify({'error': 'Reason is required'}), 400
    submit_outing_request(resident_id, start_time, end_time)
    return jsonify({'msg': 'Outing request submitted'})

@app.route('/approve/<type>/<int:id>', methods=['PUT'])
@jwt_required()
def approve(type, id):
    claims = get_jwt() or {}
    if claims.get('role') != 'warden':
        return jsonify({'error': 'Unauthorized'}), 403
    data = request.get_json()
    status = data.get('status')
    reason = data.get('reason')
    update_request_status(type, id, status, reason)
    return jsonify({'msg': f"{type} updated"})

@app.route('/rooms/available')
@jwt_required()
def rooms_available():
    # both roles can view availability
    return jsonify(get_available_rooms())

@app.route('/me/booking-status')
@jwt_required()
def me_booking_status():
    email = get_jwt_identity()
    approved_room = get_user_room(email)
    return jsonify({'approved_room': approved_room})

@app.route('/logout', methods=['POST'])
def logout():
    resp = jsonify({'msg': 'logged out'})
    unset_jwt_cookies(resp)
    return resp

@app.route('/whoami')
@jwt_required(optional=True)
def whoami():
    ident = get_jwt_identity()
    return jsonify({'authed': bool(ident), 'identity': ident})

@app.route('/profile', methods=['GET', 'POST'])
@jwt_required()
def profile_api():
    email = get_jwt_identity()
    if request.method == 'GET':
        return jsonify(get_profile(email) or {})
    data = request.get_json() or {}
    name = (data.get('display_name') or '').strip()
    phone = (data.get('phone') or '').strip()
    if not name:
        return jsonify({'error': 'Display name is required'}), 400
    upsert_profile(email, name, phone or None)
    return jsonify({'msg': 'Profile saved'})

@app.route('/next-resident')
def next_resident():
    """Public endpoint to show the next suggested resident login (no auth required)."""
    next_login = get_next_resident_login(60)
    return jsonify({'next': next_login})

if __name__ == '__main__':
    app.run(debug=True, port=5000)