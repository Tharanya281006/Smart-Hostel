# SmartHostel – Resident + Warden Management (Flask + SQLite)

A simple, focused hostel management app with two roles:
- Resident: book a room (with roommates), raise service and outing requests
- Warden: approve/reject, view occupancy, and see color‑coded heatmaps

Key highlights
- Login with cookies (JWT), role‑based access
- Room booking (101–110), 4 beds per room, prevents duplicate approved bookings
- “Next resident” helper (resident1…resident60) to speed up testing
- Service + Outing requests gated until booking is approved
- Warden dashboard:
  - Pending approvals (bookings, services, outings)
  - Occupancy table with residents per room
  - Two heatmaps:
    - Technician Heatmap = service request density per room
    - Bookings Heatmap = approved occupancy per room
  - Color scale: Green = Low, Yellow = Medium, Red = High
- Resident dashboard:
  - “Hi {name}!” greeting
  - Shows “Your room: 10x” after approval
  - My Requests Log (no duplicates)

Tech stack
- Backend: Flask, SQLite, Jinja2, flask-jwt-extended, flask-cors
- Frontend: HTML + Tailwind-like styling + vanilla JS, Chart.js for heatmaps

Folder structure
- backend/
  - app.py (routes, auth, dashboards)
  - database.py (SQLite schema + queries)
  - templates/ (login, resident, warden)
  - static/js/script.js (UI logic, API calls)
  - .env.example (copy to .env)
- README.md, .gitignore

Run locally (Windows)
1) Create venv (if you don’t have one yet)
   - cd "C:\Users\User\Desktop\Smart Hostel"
   - py -3 -m venv .\venv
   - .\venv\Scripts\python.exe -m pip install --upgrade pip
   - .\venv\Scripts\python.exe -m pip install -r requirements.txt

2) Start the app
   - cd "C:\Users\User\Desktop\Smart Hostel\backend"
   - ..\venv\Scripts\python.exe .\app.py
   - Open http://127.0.0.1:5000

Demo accounts
- Warden: warden@hostel.com / pass123
- Residents: resident1@hostel.com … resident60@hostel.com / pass123

How it works
- Residents must get a room approved by the warden before Service/Outing are enabled.
- Availability = total beds (4) − approved bookings (sum roommates_count).
- Heatmaps:
  - Technician Heatmap counts service requests per room.
  - Bookings Heatmap sums approved occupants per room.
  - Colors: green→yellow→red by value.

Notes
- .env is required in backend/ (see .env.example). Keep secrets out of Git.
- If a field shows native “Please fill out this field”, hard refresh (Ctrl+F5); client validation is used.
- Bookings prevent multiple approvals for the same resident.

Roadmap
- Live updates via Server-Sent Events
- Technician assignment + admin activity log
- Filters and export
