# Task 20 – EDABIP Mini
## Final Project Write-up

**Project Name:** Enterprise Data Analytics & Business Intelligence Dashboard

**Technologies Used:** React, Flask, MySQL, JWT, Socket.IO, Recharts, HTML, CSS, JavaScript

---

## 1. This task combines skills from 12 previous tasks. Which part was hardest to connect together and why?

The hardest part was integrating the React frontend, Flask backend, MySQL database, and real-time Socket.IO notifications.

Each technology works differently, so connecting them required careful handling of API requests, JWT authentication, database operations, and real-time events.

I faced challenges with API integration, authorization headers, updating dashboard data, and keeping the activity feed synchronized.

I solved these issues by testing backend APIs using Postman, checking browser console errors, and verifying the complete frontend-to-backend flow.

---

## 2. How does your CSV upload work end to end?

My CSV upload follows these steps:

1. **File Selection:** The user selects a CSV file from the React Data Management page.
2. **Validation:** React checks whether a file is selected and whether its extension is `.csv`.
3. **FormData:** The selected file is added to a JavaScript `FormData` object.
4. **API Request:** Axios sends the file to the Flask endpoint `POST /api/metrics/upload`.
5. **Authentication:** Flask validates the JWT token and checks the user's permissions.
6. **File Processing:** Flask reads the CSV file and processes its rows.
7. **Data Validation:** The backend validates the required columns, department, metric value, and recorded date.
8. **Database Insert:** Valid records are inserted into the MySQL `metrics` table.
9. **Response:** Flask returns the number of successfully inserted records and errors.
10. **Frontend Update:** React displays a toast notification and refreshes the metrics table.

### CSV Upload Flow

Select CSV File
      ↓
React File Validation
      ↓
FormData
      ↓
Axios POST Request
      ↓
Flask API
      ↓
JWT Authentication
      ↓
CSV Parsing and Validation
      ↓
MySQL Database Insert
      ↓
API Response
      ↓
Toast Notification
      ↓
Metrics Table Refresh

---

## 3. How does the activity feed update in real time?

I used Flask-SocketIO on the backend and Socket.IO Client on the React frontend to update the activity feed without manually refreshing the page.

When a user uploads a CSV file:

1. React sends the CSV file to Flask.
2. Flask validates the file and inserts valid records into MySQL.
3. The backend records the upload activity in the `activity_log` table.
4. After the database transaction is committed, Flask emits an `activity_update` event using `socketio.emit()`.
5. The React Socket.IO client receives the event.
6. The frontend updates the activity feed using React state.
7. The latest activity appears automatically without refreshing the browser.

### Real-Time Activity Flow

User Uploads CSV
       ↓
React Frontend
       ↓
Flask Upload API
       ↓
CSV Validation
       ↓
MySQL Metrics Insert
       ↓
Activity Log Insert
       ↓
Database Commit
       ↓
socketio.emit("activity_update")
       ↓
Socket.IO Client Receives Event
       ↓
React State Updates
       ↓
Activity Feed Refreshes

### Why Socket.IO?

Normal HTTP communication requires the frontend to request data from the backend.

Socket.IO allows the backend to push updates to connected clients immediately.

This makes the dashboard more interactive and reduces the need for repeated API requests.

---

## 4. Looking back across all 20 tasks, which concept changed how you think about building software the most?

The most important concept I learned was full-stack integration and reusable component architecture.

Initially, I focused mainly on creating individual pages and making features work.

After completing these tasks, I understood that professional software development requires connecting multiple systems properly.

React components make the frontend reusable, custom hooks reduce repeated code, Flask APIs handle business logic, MySQL stores data, JWT protects endpoints, and Socket.IO provides real-time communication.

For example, in EDABIP Mini, uploading a CSV file involves frontend validation, API communication, authentication, database operations, and real-time updates.

This helped me understand that building software is not just about writing code. It is about designing a complete, secure, maintainable, and scalable application.

---

## 5. Final Conclusion

Through Task 20, I improved my understanding of React, Flask, MySQL, REST APIs, JWT authentication, reusable components, custom hooks, CSV processing, and real-time communication.

My biggest learning was how to integrate different technologies into one complete full-stack application.

This project gave me practical experience in building an enterprise-style analytics dashboard that combines the concepts learned throughout my previous tasks.

