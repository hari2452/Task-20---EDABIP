EDABIP Mini — Enterprise Data Analytics & Business Intelligence Dashboard

A full-stack business intelligence application built with React, Flask, and MySQL. EDABIP Mini helps users manage enterprise metrics, explore interactive dashboards, upload and export CSV data, and view activity updates in real time.

Tech Stack

Layer

Technologies

Frontend

React, Vite, JavaScript, HTML, CSS

Routing & API

React Router, Axios

Charts

Recharts

Backend

Python, Flask, Flask-CORS

Authentication

JWT (Flask-JWT-Extended), Flask-Bcrypt

Database

MySQL, mysql-connector-python

Real-time

Flask-SocketIO, Socket.IO client

Styling

Responsive CSS, dark/light mode, premium blue–cyan theme, CSS 3D hover animations

Features

Authentication and role-based access

User registration and login with hashed passwords and JWT authentication.

Protected pages and API routes.

Admin: dashboard, data management, metric deletion, and activity monitoring.

Analyst: dashboard, data management, metric creation, CSV import/export.

Viewer: read-only dashboard access.

Profile updates (name, email, optional password change) and profile-photo upload.

Analytics dashboard

KPI cards for total metric value, total records, most active department, and month-on-month change.

Interactive charts: monthly trends, department comparisons, and top metrics.

Filters for department and supported date ranges.

Activity feed and real-time update notifications.

Data management

View enterprise metrics in a paginated table.

Search metrics and filter by department.

Add individual metrics using a validated form.

Delete metrics (Admin only).

Import multiple metrics using CSV upload.

Export all matching filtered metrics as CSV, not just the current page.

User interface

Collapsible, responsive sidebar navigation.

Dark/light theme toggle.

Notification bell, toast messages, loading and empty states.

Reusable components and custom hooks: useForm, useToast, and useDebounce.

Bold typography, blue/cyan gradients, subtle 3D card interactions, and responsive layouts.

Project Structure

EDABIP-Mini/
├── backend/
│   ├── app.py
│   ├── requirements.txt           # Create if not present
│   └── static/
│       └── uploads/
│           └── avatars/          # Uploaded profile images
├── frontend/
│   ├── package.json
│   ├── index.html
│   └── src/
│       ├── api.js
│       ├── App.jsx
│       ├── main.jsx
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── KPICards.jsx
│       │   ├── FilterBar.jsx
│       │   ├── Pagination.jsx
│       │   ├── NotificationBell.jsx
│       │   └── ToastContainer.jsx
│       ├── context/
│       │   ├── AuthContext.jsx
│       │   ├── ThemeContext.jsx
│       │   └── SocketContext.jsx
│       ├── hooks/
│       │   ├── useDebounce.js
│       │   ├── useForm.js
│       │   └── useToast.js
│       └── pages/
│           ├── Login.jsx
│           ├── Dashboard.jsx
│           ├── DataManagement.jsx
│           └── Profile.jsx
└── README.md

The tree summarizes the main project files. Keep any additional components, pages, stylesheets, and database setup files already present in your working project.

Prerequisites

Node.js and npm

Python 3.10+ recommended

MySQL Server

VS Code or another code editor

Local Setup

1. Database

Create a MySQL database named edabip_mini and import the project's existing database schema and seed data. The backend expects these tables:

users

departments

metrics

activity_log

This README does not include a schema SQL file. Use the SQL schema and seed data from your working project; creating only the database without tables will not run the app.

2. Backend

Open a terminal in backend:

python -m venv venv

Activate the virtual environment:

Windows PowerShell:

.\venv\Scripts\Activate.ps1

macOS / Linux:

source venv/bin/activate

Install packages:

pip install flask flask-cors flask-bcrypt flask-jwt-extended flask-socketio mysql-connector-python

Update the MySQL connection in backend/app.py to match your local setup. For production or a public GitHub repository, move database credentials and the JWT secret to environment variables and keep .env out of Git.

Run Flask:

python app.py

Backend: http://127.0.0.1:5000

Health endpoint: GET /api/health

3. Frontend

Open another terminal in frontend:

npm install
npm run dev

Frontend: http://localhost:5173

Ensure src/api.js points to the Flask API (for example http://127.0.0.1:5000/api) and includes the JWT access token in the Authorization: Bearer <token> header for protected requests.

Main API Endpoints

Method

Endpoint

Purpose

GET

/api/health

Backend/database health check

POST

/api/register

Register a new user

POST

/api/login

Login and receive JWT tokens

GET

/api/me

Read current profile

PUT

/api/me

Update profile

POST

/api/me/avatar

Upload profile image

GET

/api/logout

Logout response; client must clear stored tokens

GET

/api/kpis

Dashboard KPI data

GET

/api/metrics/trend

Monthly metric trend

GET

/api/metrics/by-department

Department comparison

GET

/api/metrics/top

Top metrics

GET

/api/metrics

Paginated, searchable metrics

POST

/api/metrics

Add a metric (Admin/Analyst)

POST

/api/metrics/upload

Import CSV (Admin/Analyst)

GET

/api/metrics/export

Download filtered CSV (Admin/Analyst)

DELETE

/api/metrics/<id>

Delete a metric (Admin)

GET

/api/activity

Activity log

Search/filter example

GET /api/metrics?page=1&per_page=10&search=Revenue&department=Sales
Authorization: Bearer <access_token>

CSV export example

GET /api/metrics/export?search=Revenue&department=Sales
Authorization: Bearer <access_token>

The frontend's Export CSV button sends the authenticated request and downloads the returned CSV file.

CSV Import Format

Create a .csv file with the following columns:

department,metric_name,metric_value,recorded_on
Sales,Revenue,125000,2026-10-01
Marketing,Leads Generated,850,2026-10-02
HR,Employee Count,120,2026-10-03
Finance,Operating Cost,56000,2026-10-04

department: Existing department name.

metric_name: Metric label.

metric_value: Numeric value.

recorded_on: Date in YYYY-MM-DD format.

Application Flow

User opens React app
        ↓
Register / Login
        ↓
Flask validates credentials and issues JWT
        ↓
React stores authentication state
        ↓
Protected routes check user role
        ↓
Dashboard requests KPI and chart data
        ↓
Flask queries MySQL and returns JSON
        ↓
React renders KPI cards, charts, and tables
        ↓
Admin / Analyst creates, imports, or exports metrics
        ↓
Flask updates MySQL and records activity
        ↓
Socket.IO delivers real-time activity updates

Reusable React Concepts

Context API: Shares authentication, theme, and socket state without prop drilling.

useForm: Reuses form value/change/reset logic.

useToast: Shows non-blocking feedback messages.

useDebounce: Delays search API requests until the user stops typing.

Protected routes: Restrict access to signed-in users and permitted roles.

Pagination: Loads smaller result sets rather than every record at once.

Testing Checklist

Backend health endpoint returns success.

Admin, Analyst, and Viewer can log in.

Unauthorized users cannot access protected API routes.

Dashboard KPI cards and charts load correctly.

Department and date filters update relevant analytics.

Search and pagination work in Data Management.

Admin/Analyst can add metrics and import CSV.

Export CSV downloads all records matching active filters.

Only Admin can delete metrics.

Profile editing and avatar upload persist after refresh.

Notifications appear when activity updates occur.

Dark mode, collapsible sidebar, and mobile layout work.

Security Notes

Before making this repository public or deploying it:

Remove hardcoded MySQL credentials and JWT secrets from app.py. Use environment variables and rotate any secrets previously committed or shared.

Add .env, venv/, node_modules/, __pycache__/, and local uploads as appropriate to .gitignore.

Configure allowed CORS origins for your deployment domain.

Use HTTPS in production and review token storage, expiration, refresh, and logout/revocation behavior.

Keep Admin-only permissions enforced by Flask, not only hidden in the React UI.

Future Enhancements

Admin-only user management with role changes.

Additional KPI comparison indicators and chart animations.

More advanced date filtering and scheduled reports.

Production deployment and automated tests.

Project Summary

EDABIP Mini demonstrates full-stack development with React + Flask + MySQL, JWT-based authentication, role-based access, interactive analytics, CSV data operations, reusable React components, responsive UI, and Socket.IO-powered activity updates.
