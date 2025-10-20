import sqlite3
import os
from datetime import datetime
import re

DB_PATH = os.path.join(os.path.dirname(__file__), 'hostel.db')

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        email TEXT PRIMARY KEY,
        password TEXT NOT NULL,
        role TEXT NOT NULL
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id INTEGER NOT NULL,
        group_id TEXT,
        final_timestamp TEXT,
        group_sync_score FLOAT,
        status TEXT DEFAULT 'pending'
    )''')
    # Add columns to bookings if missing
    try:
        c.execute("ALTER TABLE bookings ADD COLUMN booked_by TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        c.execute("ALTER TABLE bookings ADD COLUMN roommates_count INTEGER DEFAULT 1")
    except sqlite3.OperationalError:
        pass
    # Rooms table with capacities
    c.execute('''CREATE TABLE IF NOT EXISTS rooms (
        room_no INTEGER PRIMARY KEY,
        total_beds INTEGER NOT NULL
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS service_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id INTEGER NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'pending',
        warden_reason TEXT,
        technician TEXT
    )''')
    # Add resident_id to service_requests if missing
    try:
        c.execute("ALTER TABLE service_requests ADD COLUMN resident_id TEXT")
    except sqlite3.OperationalError:
        pass
    c.execute('''CREATE TABLE IF NOT EXISTS outings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resident_id TEXT,
        start_time TEXT,
        end_time TEXT,
        status TEXT DEFAULT 'pending',
        warden_reason TEXT
    )''')
    # Basic profiles for greeting and details
    c.execute('''CREATE TABLE IF NOT EXISTS profiles (
        email TEXT PRIMARY KEY,
        display_name TEXT,
        phone TEXT
    )''')
    # Sample data (support both example.com and hostel.com emails)
    c.execute("INSERT OR IGNORE INTO users (email, password, role) VALUES (?, ?, ?)", ('resident@example.com', 'pass123', 'resident'))
    c.execute("INSERT OR IGNORE INTO users (email, password, role) VALUES (?, ?, ?)", ('warden@example.com', 'pass123', 'warden'))
    c.execute("INSERT OR IGNORE INTO users (email, password, role) VALUES (?, ?, ?)", ('resident@hostel.com', 'pass123', 'resident'))
    c.execute("INSERT OR IGNORE INTO users (email, password, role) VALUES (?, ?, ?)", ('warden@hostel.com', 'pass123', 'warden'))
    # Seed residents resident1..resident60 (emails: residentN@hostel.com)
    for n in range(1, 61):
        email = f"resident{n}@hostel.com"
        c.execute("INSERT OR IGNORE INTO users (email, password, role) VALUES (?, ?, ?)", (email, 'pass123', 'resident'))
    # Seed rooms if empty
    c.execute("SELECT COUNT(*) FROM rooms")
    if c.fetchone()[0] == 0:
        # Create rooms 101-110, 4 beds each
        for rn in range(101, 111):
            c.execute("INSERT INTO rooms (room_no, total_beds) VALUES (?, ?)", (rn, 4))
    conn.commit()
    # Backfill service_requests that accidentally used small room IDs (1,2,3...) by mapping to the resident's approved room
    try:
        c.execute(
            """
            UPDATE service_requests
            SET room_id = (
                SELECT b.room_id FROM bookings b
                WHERE b.booked_by = service_requests.resident_id AND b.status = 'approved'
                ORDER BY b.id DESC LIMIT 1
            )
            WHERE resident_id IS NOT NULL AND (room_id < 100 OR room_id IS NULL)
              AND EXISTS (
                SELECT 1 FROM bookings b2 WHERE b2.booked_by = service_requests.resident_id AND b2.status = 'approved'
              )
            """
        )
        conn.commit()
    except Exception:
        # Best-effort backfill; ignore if fails
        pass
    conn.close()

def get_user(email, password, role):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT * FROM users WHERE email = ? AND password = ? AND role = ?", (email, password, role))
    user = c.fetchone()
    conn.close()
    return user

def get_user_requests(email):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    # Services created by the user OR for any room the user is booked into (deduplicated)
    c.execute(
        """
        SELECT DISTINCT 'service' as type, id, status, IFNULL(warden_reason,'')
        FROM service_requests
        WHERE resident_id = ?
           OR room_id IN (SELECT room_id FROM bookings WHERE booked_by = ?)
        ORDER BY id DESC
        """,
        (email, email),
    )
    services = c.fetchall()
    # Outings
    c.execute("SELECT 'outing' as type, id, status, IFNULL(warden_reason,'') FROM outings WHERE resident_id = ?", (email,))
    outings = c.fetchall()
    # Bookings by user
    c.execute("SELECT 'booking' as type, id, status, CAST(room_id AS TEXT) FROM bookings WHERE booked_by = ? ORDER BY id DESC", (email,))
    bookings = c.fetchall()
    requests = services + outings + bookings
    conn.close()
    return requests

def book_room(room_id, group_id, final_timestamp, group_sync_score, booked_by, roommates_count):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    try:
        c.execute("BEGIN TRANSACTION")
        # Prevent duplicate approved bookings for the same user
        c.execute("SELECT COUNT(1) FROM bookings WHERE booked_by = ? AND status = 'approved'", (booked_by,))
        if c.fetchone()[0] > 0:
            conn.rollback()
            return
        # Compute available beds
        c.execute("SELECT total_beds FROM rooms WHERE room_no = ?", (room_id,))
        room = c.fetchone()
        total_beds = room[0] if room else 4
        c.execute("SELECT IFNULL(SUM(roommates_count),0) FROM bookings WHERE room_id = ? AND status = 'approved'", (room_id,))
        occupied = c.fetchone()[0]
        available = max(total_beds - occupied, 0)
        if roommates_count <= available and roommates_count > 0:
            c.execute("INSERT INTO bookings (room_id, group_id, final_timestamp, group_sync_score, status, booked_by, roommates_count) VALUES (?, ?, ?, ?, ?, ?, ?)", (room_id, group_id, final_timestamp, group_sync_score, 'pending', booked_by, roommates_count))
            conn.commit()
        else:
            conn.rollback()
    except:
        conn.rollback()
    finally:
        conn.close()

def submit_service_request(room_id, description, resident_id=None):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("INSERT INTO service_requests (room_id, description, resident_id) VALUES (?, ?, ?)", (room_id, description, resident_id))
    conn.commit()
    conn.close()

def submit_outing_request(resident_id, start_time, end_time):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("INSERT INTO outings (resident_id, start_time, end_time) VALUES (?, ?, ?)", (resident_id, start_time, end_time))
    conn.commit()
    conn.close()

def get_pending_requests():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT id, 'service' as type, room_id, IFNULL(description,'') || CASE WHEN resident_id IS NOT NULL THEN ' (by '|| resident_id ||')' ELSE '' END as info, status, warden_reason FROM service_requests WHERE status = 'pending' UNION ALL SELECT id, 'outing' as type, resident_id, IFNULL(start_time,'') || ' → ' || IFNULL(end_time,'') as info, status, warden_reason FROM outings WHERE status = 'pending' UNION ALL SELECT id, 'booking' as type, room_id, booked_by, status, NULL FROM bookings WHERE status = 'pending'")
    requests = c.fetchall()
    # Also compute simple counters
    c.execute("SELECT COUNT(*) FROM service_requests WHERE status='pending'")
    svc = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM outings WHERE status='pending'")
    out = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM bookings WHERE status='pending'")
    bok = c.fetchone()[0]
    conn.close()
    return requests, {'service': svc, 'outing': out, 'booking': bok}

def get_profile(email: str):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT display_name, phone FROM profiles WHERE email = ?", (email,))
    row = c.fetchone()
    conn.close()
    if row:
        return {'display_name': row[0], 'phone': row[1]}
    return None

def upsert_profile(email: str, display_name: str, phone: str = None):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("INSERT INTO profiles (email, display_name, phone) VALUES (?, ?, ?) ON CONFLICT(email) DO UPDATE SET display_name=excluded.display_name, phone=COALESCE(excluded.phone, profiles.phone)", (email, display_name, phone))
    conn.commit()
    conn.close()
    return True

def update_request_status(type, id, status, reason):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    if type == 'service' or type == 'outing':
        table = 'service_requests' if type == 'service' else 'outings'
        c.execute(f"UPDATE {table} SET status = ?, warden_reason = ? WHERE id = ?", (status, reason, id))
    elif type == 'booking':
        c.execute("UPDATE bookings SET status = ? WHERE id = ?", (status, id))
    conn.commit()
    conn.close()

def get_heatmap_data():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    # Count service requests by effective room: prefer resident's approved room if available, else stored room_id
    c.execute(
        """
        WITH svc AS (
            SELECT COALESCE(b.room_id, sr.room_id) AS eff_room, COUNT(*) AS cnt
            FROM service_requests sr
            LEFT JOIN bookings b ON b.booked_by = sr.resident_id AND b.status = 'approved'
            GROUP BY COALESCE(b.room_id, sr.room_id)
        )
        SELECT r.room_no, COALESCE(svc.cnt, 0) AS count
        FROM rooms r
        LEFT JOIN svc ON svc.eff_room = r.room_no
        ORDER BY r.room_no
        """
    )
    heatmap = c.fetchall()
    conn.close()
    return heatmap

def get_bookings_heatmap():
    """Return (room_no, count) for approved bookings per room, including rooms with zero approved occupancy.
    We use SUM(roommates_count) for occupancy count to reflect bed usage.
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(
        """
        SELECT r.room_no, COALESCE(bk.cnt, 0) AS count
        FROM rooms r
        LEFT JOIN (
            SELECT room_id, COALESCE(SUM(roommates_count),0) AS cnt
            FROM bookings
            WHERE status = 'approved'
            GROUP BY room_id
        ) bk ON bk.room_id = r.room_no
        ORDER BY r.room_no
        """
    )
    rows = c.fetchall()
    conn.close()
    return rows

def get_available_rooms():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT room_no, total_beds FROM rooms ORDER BY room_no")
    rooms = c.fetchall()
    result = []
    for room_no, total_beds in rooms:
        c.execute("SELECT IFNULL(SUM(roommates_count),0) FROM bookings WHERE room_id = ? AND status = 'approved'", (room_no,))
        occupied = c.fetchone()[0]
        available = max(total_beds - occupied, 0)
        # Collect resident identifiers for approved bookings in this room
        c.execute("SELECT booked_by FROM bookings WHERE room_id = ? AND status = 'approved'", (room_no,))
        occupants = [row[0] for row in c.fetchall()]
        # Display short login names (before @) when possible
        resident_logins = [ (email.split('@')[0] if isinstance(email, str) and '@' in email else str(email)) for email in occupants ]
        result.append({'room_no': room_no, 'total_beds': total_beds, 'available': available, 'residents': resident_logins})
    conn.close()
    return result

def get_user_room(email):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT room_id FROM bookings WHERE booked_by = ? AND status = 'approved' ORDER BY id DESC LIMIT 1", (email,))
    row = c.fetchone()
    conn.close()
    return row[0] if row else None

def ensure_user(email: str, role: str = 'resident'):
    """Create user if missing; returns True if ensured."""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT email FROM users WHERE email = ?", (email,))
    exists = c.fetchone() is not None
    if not exists:
        # For OAuth users, store a placeholder password
        c.execute("INSERT INTO users (email, password, role) VALUES (?, ?, ?)", (email, 'oauth', role))
        conn.commit()
    conn.close()
    return True

def get_next_resident_login(max_residents: int = 60):
    """Return the suggested next resident login (email) based on the last booking created.
    If no bookings exist, suggest resident1@hostel.com. If last is residentN, suggest resident(N+1), capped by max_residents.
    If beyond max_residents, return None.
    """
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT booked_by FROM bookings ORDER BY id DESC")
    rows = c.fetchall()
    last_n = 0
    for (email,) in rows:
        if isinstance(email, str):
            m = re.match(r'^resident(\d+)@hostel\.com$', email.strip(), re.IGNORECASE)
            if m:
                try:
                    last_n = int(m.group(1))
                    break
                except ValueError:
                    continue
    conn.close()
    next_n = last_n + 1
    if next_n <= 0:
        next_n = 1
    if next_n > max_residents:
        return None
    return f"resident{next_n}@hostel.com"