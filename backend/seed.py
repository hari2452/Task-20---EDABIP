import mysql.connector
from flask_bcrypt import Bcrypt
from datetime import date, timedelta
import random

bcrypt = Bcrypt()

# ==========================================
# DATABASE CONNECTION
# ==========================================

db = mysql.connector.connect(
    host="localhost",
    user="root",
    password="hariharan",
    database="edabip_mini"
)

cursor = db.cursor(dictionary=True)

print("Connected to MySQL successfully.")


# ==========================================
# CREATE TEST USERS
# ==========================================

users = [
    ("Admin User", "admin@edabip.com", "admin123", "admin"),
    ("Analyst User", "analyst@edabip.com", "analyst123", "analyst"),
    ("Viewer User", "viewer@edabip.com", "viewer123", "viewer")
]

for name, email, password, role in users:

    cursor.execute(
        "SELECT id FROM users WHERE email = %s",
        (email,)
    )

    existing_user = cursor.fetchone()

    if not existing_user:

        hashed_password = bcrypt.generate_password_hash(
            password
        ).decode("utf-8")

        cursor.execute(
            """
            INSERT INTO users
            (name, email, password, role)
            VALUES (%s, %s, %s, %s)
            """,
            (name, email, hashed_password, role)
        )

db.commit()

print("Test users created.")


# ==========================================
# GET ADMIN USER
# ==========================================

cursor.execute(
    "SELECT id FROM users WHERE email = %s",
    ("admin@edabip.com",)
)

admin = cursor.fetchone()

admin_id = admin["id"]


# ==========================================
# GET DEPARTMENTS
# ==========================================

cursor.execute("SELECT id, name FROM departments")

departments = cursor.fetchall()

if not departments:
    print("No departments found.")
    cursor.close()
    db.close()
    exit()


# ==========================================
# METRIC NAMES BY DEPARTMENT
# ==========================================

metric_names = {

    "Sales": [
        "Revenue",
        "Units Sold",
        "New Customers",
        "Sales Target"
    ],

    "Marketing": [
        "Campaign Spend",
        "Leads Generated",
        "Conversions",
        "Website Visits"
    ],

    "HR": [
        "Employees",
        "New Hires",
        "Training Hours",
        "Attendance"
    ],

    "Finance": [
        "Operating Cost",
        "Profit",
        "Expenses",
        "Budget"
    ],

    "Operations": [
        "Orders Processed",
        "Delivery Rate",
        "Production Output",
        "Operational Cost"
    ]
}


# ==========================================
# CHECK EXISTING METRICS
# ==========================================

cursor.execute("SELECT COUNT(*) AS total FROM metrics")

result = cursor.fetchone()

existing_metrics = result["total"]


# ==========================================
# GENERATE 250 METRICS
# ==========================================

if existing_metrics == 0:

    today = date.today()

    start_date = today - timedelta(days=365)

    records = []

    for _ in range(250):

        department = random.choice(departments)

        department_id = department["id"]

        department_name = department["name"]

        metric_name = random.choice(
            metric_names[department_name]
        )

        # Random value from 100 to 100000
        metric_value = round(
            random.uniform(100, 100000),
            2
        )

        # Random date within previous 12 months
        random_days = random.randint(0, 364)

        recorded_on = start_date + timedelta(
            days=random_days
        )

        records.append(
            (
                department_id,
                metric_name,
                metric_value,
                recorded_on,
                admin_id
            )
        )

    cursor.executemany(
        """
        INSERT INTO metrics
        (
            department_id,
            metric_name,
            metric_value,
            recorded_on,
            uploaded_by
        )
        VALUES (%s, %s, %s, %s, %s)
        """,
        records
    )

    db.commit()

    print(f"{len(records)} metric records created.")

else:

    print(
        f"Metrics already exist ({existing_metrics} records). "
        "Skipping metric seed."
    )


# ==========================================
# VERIFY
# ==========================================

cursor.execute("SELECT COUNT(*) AS total FROM metrics")

total = cursor.fetchone()["total"]

print("--------------------------------")
print("EDABIP database seed completed!")
print(f"Total metric records: {total}")
print("--------------------------------")


cursor.close()
db.close()