from flask import Flask, jsonify, request, Response
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity
)
from flask_socketio import SocketIO
import mysql.connector
import csv
import io
import os
import uuid
from pathlib import Path
from werkzeug.utils import secure_filename
from datetime import datetime


# ==========================================
# CREATE FLASK APP
# ==========================================

app = Flask(__name__)


# ==========================================
# CONFIGURATION
# ==========================================

app.config["JWT_SECRET_KEY"] = "edabip-super-secret-key"

CORS(
    app,
    resources={r"/api/*": {"origins": "http://localhost:5173"}}
)

bcrypt = Bcrypt(app)
jwt = JWTManager(app)

socketio = SocketIO(
    app,
    cors_allowed_origins="http://localhost:5173"
)


# ==========================================
# DATABASE CONNECTION
# ==========================================

def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="hariharan",
        database="edabip_mini"
    )


# ==========================================
# ROLE CHECK HELPER
# ==========================================

def check_user_role(user_id, allowed_roles):
    db = None
    cursor = None

    try:
        db = get_db_connection()
        cursor = db.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT role
            FROM users
            WHERE id = %s
            """,
            (user_id,)
        )

        user = cursor.fetchone()

        if not user:
            return False

        return user["role"] in allowed_roles

    finally:
        if cursor:
            cursor.close()

        if db:
            db.close()


# ==========================================
# HEALTH CHECK ROUTE
# ==========================================

@app.route("/api/health", methods=["GET"])
def health():

    try:
        db = get_db_connection()
        cursor = db.cursor()

        cursor.execute("SELECT DATABASE()")
        database = cursor.fetchone()[0]

        cursor.close()
        db.close()

        return jsonify({
            "success": True,
            "message": "EDABIP API is running",
            "database": database
        }), 200

    except Exception as e:

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


# ==========================================
# REGISTER ROUTE
# ==========================================

@app.route("/api/register", methods=["POST"])
def register():

    db = None
    cursor = None

    try:

        # Get JSON data from request
        data = request.get_json()

        if not data:
            return jsonify({
                "success": False,
                "message": "Request body is required"
            }), 400


        # Get form values
        name = data.get("name", "").strip()
        email = data.get("email", "").strip().lower()
        password = data.get("password", "")


        # ======================================
        # VALIDATION
        # ======================================

        if not name or not email or not password:

            return jsonify({
                "success": False,
                "message": "Name, email and password are required"
            }), 400


        if len(password) < 6:

            return jsonify({
                "success": False,
                "message": "Password must contain at least 6 characters"
            }), 400


        # ======================================
        # CONNECT DATABASE
        # ======================================

        db = get_db_connection()

        cursor = db.cursor(dictionary=True)


        # ======================================
        # CHECK EMAIL ALREADY EXISTS
        # ======================================

        cursor.execute(
            "SELECT id FROM users WHERE email = %s",
            (email,)
        )

        existing_user = cursor.fetchone()


        if existing_user:

            return jsonify({
                "success": False,
                "message": "Email already registered"
            }), 409


        # ======================================
        # HASH PASSWORD
        # ======================================

        hashed_password = bcrypt.generate_password_hash(
            password
        ).decode("utf-8")


        # ======================================
        # INSERT USER
        # ======================================

        cursor.execute(
            """
            INSERT INTO users
            (name, email, password, role)
            VALUES (%s, %s, %s, %s)
            """,
            (
                name,
                email,
                hashed_password,
                "viewer"
            )
        )

        # Newly created user ID
        new_user_id = cursor.lastrowid

        # Every successful data write is recorded
        action = f"Registered new user '{name}'"

        cursor.execute(
            """
            INSERT INTO activity_log
            (user_id, action)
            VALUES (%s, %s)
            """,
            (new_user_id, action)
        )

        db.commit()

        # Real-time activity update after successful commit
        socketio.emit(
            "activity_update",
            {
                "user_id": new_user_id,
                "action": action
            }
        )

        return jsonify({
            "success": True,
            "message": "Registration successful"
        }), 201


    except Exception as e:

        if db:
            db.rollback()

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


    finally:

        if cursor:
            cursor.close()

        if db:
            db.close()

# ==========================================
# LOGIN ROUTE
# ==========================================

@app.route("/api/login", methods=["POST"])
def login():

    db = None
    cursor = None

    try:
        data = request.get_json()

        if not data:
            return jsonify({
                "success": False,
                "message": "Request body is required"
            }), 400

        email = data.get("email", "").strip().lower()
        password = data.get("password", "")

        if not email or not password:
            return jsonify({
                "success": False,
                "message": "Email and password are required"
            }), 400

        db = get_db_connection()
        cursor = db.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT id, name, email, password, role, avatar_url
            FROM users
            WHERE email = %s
            """,
            (email,)
        )

        user = cursor.fetchone()

        # Check user and password
        if not user or not bcrypt.check_password_hash(
            user["password"],
            password
        ):
            return jsonify({
                "success": False,
                "message": "Invalid email or password"
            }), 401

        # JWT identity should be a string
        identity = str(user["id"])

        access_token = create_access_token(
            identity=identity
        )

        refresh_token = create_refresh_token(
            identity=identity
        )

        return jsonify({
            "success": True,
            "message": "Login successful",

            "access_token": access_token,
            "refresh_token": refresh_token,

            "user": {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "role": user["role"],
                "avatar_url": user["avatar_url"]
            }
        }), 200

    except Exception as e:

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if db:
            db.close()

# ==========================================
# GET CURRENT USER
# ==========================================

@app.route("/api/me", methods=["GET"])
@jwt_required()
def get_current_user():

    db = None
    cursor = None

    try:
        # User ID stored inside JWT
        user_id = get_jwt_identity()

        db = get_db_connection()
        cursor = db.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                id,
                name,
                email,
                role,
                avatar_url,
                created_at
            FROM users
            WHERE id = %s
            """,
            (user_id,)
        )

        user = cursor.fetchone()

        if not user:
            return jsonify({
                "success": False,
                "message": "User not found"
            }), 404

        # Convert datetime for JSON
        if user["created_at"]:
            user["created_at"] = user["created_at"].isoformat()

        return jsonify({
            "success": True,
            "user": user
        }), 200

    except Exception as e:

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if db:
            db.close()

# ==========================================
# UPDATE CURRENT USER PROFILE
# ==========================================

@app.route("/api/me", methods=["PUT"])
@jwt_required()
def update_current_user():

    db = None
    cursor = None

    try:
        user_id = get_jwt_identity()
        data = request.get_json()

        if not data:
            return jsonify({
                "success": False,
                "message": "Request body is required"
            }), 400

        name = data.get("name", "").strip()
        email = data.get("email", "").strip().lower()
        new_password = data.get("password", "")

        if not name or not email:
            return jsonify({
                "success": False,
                "message": "Name and email are required"
            }), 400

        db = get_db_connection()
        cursor = db.cursor(dictionary=True)

        # Check whether another user has this email
        cursor.execute(
            """
            SELECT id
            FROM users
            WHERE email = %s AND id != %s
            """,
            (email, user_id)
        )

        if cursor.fetchone():
            return jsonify({
                "success": False,
                "message": "Email already in use"
            }), 409

        # Change password only when provided
        if new_password:

            if len(new_password) < 6:
                return jsonify({
                    "success": False,
                    "message": "Password must contain at least 6 characters"
                }), 400

            hashed_password = bcrypt.generate_password_hash(
                new_password
            ).decode("utf-8")

            cursor.execute(
                """
                UPDATE users
                SET name = %s,
                    email = %s,
                    password = %s
                WHERE id = %s
                """,
                (name, email, hashed_password, user_id)
            )

        else:

            cursor.execute(
                """
                UPDATE users
                SET name = %s,
                    email = %s
                WHERE id = %s
                """,
                (name, email, user_id)
            )

        # Record profile update activity
        action = f"Updated profile for '{name}'"

        cursor.execute(
            """
            INSERT INTO activity_log
            (user_id, action)
            VALUES (%s, %s)
            """,
            (user_id, action)
        )

        db.commit()

        # Real-time activity update after successful commit
        socketio.emit(
            "activity_update",
            {
                "user_id": user_id,
                "action": action
            }
        )

        return jsonify({
            "success": True,
            "message": "Profile updated successfully"
        }), 200

    except Exception as e:

        if db:
            db.rollback()

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if db:
            db.close()


# ==========================================
# PROFILE AVATAR UPLOAD
# ==========================================

AVATAR_UPLOAD_DIR = Path(app.root_path) / "static" / "uploads" / "avatars"
ALLOWED_AVATAR_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
AVATAR_MAX_BYTES = 3 * 1024 * 1024

@app.route("/api/me/avatar", methods=["POST"])
@jwt_required()
def upload_profile_avatar():
    db = None
    cursor = None
    saved_path = None
    try:
        user_id = get_jwt_identity()
        file = request.files.get("file")
        if not file or not file.filename:
            return jsonify({"success": False, "message": "Please select an image."}), 400

        original_name = secure_filename(file.filename)
        extension = original_name.rsplit(".", 1)[-1].lower() if "." in original_name else ""
        if extension not in ALLOWED_AVATAR_EXTENSIONS:
            return jsonify({"success": False, "message": "Only JPG, PNG or WebP images are allowed."}), 400

        image_bytes = file.read(AVATAR_MAX_BYTES + 1)
        if not image_bytes or len(image_bytes) > AVATAR_MAX_BYTES:
            return jsonify({"success": False, "message": "Image must be smaller than 3 MB."}), 400

        # Verify file signature rather than trusting the extension or browser MIME type.
        is_jpeg = image_bytes.startswith(bytes.fromhex("FFD8FF"))
        is_png = image_bytes.startswith(bytes.fromhex("89504E470D0A1A0A"))
        is_webp = (image_bytes.startswith(b"RIFF") and image_bytes[8:12] == b"WEBP")
        valid_type = ((extension in ("jpg", "jpeg") and is_jpeg) or
                      (extension == "png" and is_png) or
                      (extension == "webp" and is_webp))
        if not valid_type:
            return jsonify({"success": False, "message": "The selected file is not a valid image of that type."}), 400

        db = get_db_connection()
        cursor = db.cursor(dictionary=True)
        cursor.execute("SELECT id, name, email, role, avatar_url FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        if not user:
            return jsonify({"success": False, "message": "User not found."}), 404

        AVATAR_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        filename = f"avatar_{user_id}_{uuid.uuid4().hex}.{extension}"
        saved_path = AVATAR_UPLOAD_DIR / filename
        saved_path.write_bytes(image_bytes)
        avatar_url = f"/static/uploads/avatars/{filename}"

        cursor.execute("UPDATE users SET avatar_url = %s WHERE id = %s", (avatar_url, user_id))
        action = f"Updated profile photo for '{user['name']}'"
        cursor.execute("INSERT INTO activity_log (user_id, action) VALUES (%s, %s)", (user_id, action))
        activity_id = cursor.lastrowid
        db.commit()

        # Delete previous local avatar only after the new one is committed.
        old_url = user.get("avatar_url") or ""
        old_prefix = "/static/uploads/avatars/"
        if old_url.startswith(old_prefix):
            old_name = os.path.basename(old_url)
            old_path = AVATAR_UPLOAD_DIR / old_name
            try:
                if old_path.is_file() and old_path != saved_path:
                    old_path.unlink()
            except OSError:
                app.logger.warning("Could not delete previous avatar")

        socketio.emit("activity_update", {
            "id": activity_id,
            "user_id": int(user_id),
            "user_name": user["name"],
            "user_email": user["email"],
            "user_role": user["role"],
            "action": action,
            "created_at": datetime.now().isoformat()
        })
        return jsonify({"success": True, "message": "Profile photo updated successfully.",
                        "avatar_url": avatar_url}), 200

    except Exception:
        if db:
            db.rollback()
        if saved_path and saved_path.exists():
            try:
                saved_path.unlink()
            except OSError:
                pass
        app.logger.exception("Avatar upload failed")
        return jsonify({"success": False, "message": "Unable to upload profile photo."}), 500
    finally:
        if cursor:
            cursor.close()
        if db:
            db.close()


# ==========================================
# LOGOUT
# ==========================================

@app.route("/api/logout", methods=["GET"])
@jwt_required()
def logout():

    return jsonify({
        "success": True,
        "message": "Logout successful"
    }), 200

# ==========================================
# DASHBOARD KPI API
# ==========================================

@app.route("/api/kpis", methods=["GET"])
@jwt_required()
def get_kpis():

    db = None
    cursor = None

    try:
        db = get_db_connection()
        cursor = db.cursor(dictionary=True)

        # Optional filters
        department = request.args.get("department", "").strip()
        from_date = request.args.get("from", "").strip()
        to_date = request.args.get("to", "").strip()

        conditions = []
        params = []

        if department:
            conditions.append("d.name = %s")
            params.append(department)

        if from_date:
            conditions.append("m.recorded_on >= %s")
            params.append(from_date)

        if to_date:
            conditions.append("m.recorded_on <= %s")
            params.append(to_date)

        where_clause = ""

        if conditions:
            where_clause = "WHERE " + " AND ".join(conditions)


        # ======================================
        # TOTAL METRIC VALUE + TOTAL RECORDS
        # ======================================

        query = f"""
            SELECT
                COALESCE(SUM(m.metric_value), 0) AS total_value,
                COUNT(m.id) AS total_records
            FROM metrics m
            JOIN departments d
                ON m.department_id = d.id
            {where_clause}
        """

        cursor.execute(query, tuple(params))
        totals = cursor.fetchone()


        # ======================================
        # MOST ACTIVE DEPARTMENT
        # ======================================

        query = f"""
            SELECT
                d.name,
                COUNT(m.id) AS record_count
            FROM metrics m
            JOIN departments d
                ON m.department_id = d.id
            {where_clause}
            GROUP BY d.id, d.name
            ORDER BY record_count DESC
            LIMIT 1
        """

        cursor.execute(query, tuple(params))
        active_department = cursor.fetchone()


        # ======================================
        # THIS MONTH
        # ======================================

        cursor.execute("""
            SELECT COALESCE(SUM(metric_value), 0) AS total
            FROM metrics
            WHERE YEAR(recorded_on) = YEAR(CURDATE())
            AND MONTH(recorded_on) = MONTH(CURDATE())
        """)

        this_month = float(cursor.fetchone()["total"])


        # ======================================
        # LAST MONTH
        # ======================================

        cursor.execute("""
            SELECT COALESCE(SUM(metric_value), 0) AS total
            FROM metrics
            WHERE YEAR(recorded_on) =
                YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
            AND MONTH(recorded_on) =
                MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
        """)

        last_month = float(cursor.fetchone()["total"])


        # ======================================
        # MONTH-ON-MONTH %
        # ======================================

        if last_month > 0:

            month_change = (
                (this_month - last_month)
                / last_month
            ) * 100

        else:
            month_change = 0


        return jsonify({
            "success": True,

            "kpis": {
                "total_metric_value": float(
                    totals["total_value"]
                ),

                "total_records": totals["total_records"],

                "most_active_department":
                    active_department["name"]
                    if active_department
                    else None,

                "this_month_value": this_month,

                "last_month_value": last_month,

                "month_change_percent": round(
                    month_change,
                    2
                )
            }
        }), 200


    except Exception as e:

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


    finally:

        if cursor:
            cursor.close()

        if db:
            db.close()    
            
# ==========================================
# METRIC TREND API
# ==========================================

@app.route("/api/metrics/trend", methods=["GET"])
@jwt_required()
def get_metric_trend():

    db = None
    cursor = None

    try:
        db = get_db_connection()
        cursor = db.cursor(dictionary=True)

        # Optional filters
        department = request.args.get(
            "department", ""
        ).strip()

        metric_name = request.args.get(
            "metric_name", ""
        ).strip()

        conditions = [
            """
            m.recorded_on >=
            DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
            """
        ]

        params = []

        if department:
            conditions.append("d.name = %s")
            params.append(department)

        if metric_name:
            conditions.append("m.metric_name = %s")
            params.append(metric_name)

        where_clause = "WHERE " + " AND ".join(
            conditions
        )

        query = f"""
            SELECT
                DATE_FORMAT(
                    m.recorded_on,
                    '%Y-%m'
                ) AS month,

                DATE_FORMAT(
                    m.recorded_on,
                    '%b %Y'
                ) AS month_label,

                ROUND(
                    SUM(m.metric_value),
                    2
                ) AS total_value,

                COUNT(m.id) AS total_records

            FROM metrics m

            JOIN departments d
                ON m.department_id = d.id

            {where_clause}

            GROUP BY
                YEAR(m.recorded_on),
                MONTH(m.recorded_on),
                DATE_FORMAT(
                    m.recorded_on,
                    '%Y-%m'
                ),
                DATE_FORMAT(
                    m.recorded_on,
                    '%b %Y'
                )

            ORDER BY
                YEAR(m.recorded_on),
                MONTH(m.recorded_on)
        """

        cursor.execute(
            query,
            tuple(params)
        )

        rows = cursor.fetchall()

        trend = []

        for row in rows:

            trend.append({
                "month": row["month"],
                "month_label": row["month_label"],
                "total_value": float(
                    row["total_value"]
                ),
                "total_records": row["total_records"]
            })

        return jsonify({
            "success": True,
            "trend": trend
        }), 200

    except Exception as e:

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if db:
            db.close()

# ==========================================
# METRICS BY DEPARTMENT API
# ==========================================

@app.route("/api/metrics/by-department", methods=["GET"])
@jwt_required()
def get_metrics_by_department():

    db = None
    cursor = None

    try:
        db = get_db_connection()
        cursor = db.cursor(dictionary=True)

        # Optional date filters
        from_date = request.args.get("from", "").strip()
        to_date = request.args.get("to", "").strip()

        # Build conditions for LEFT JOIN
        join_conditions = []
        params = []

        if from_date:
            join_conditions.append(
                "m.recorded_on >= %s"
            )
            params.append(from_date)

        if to_date:
            join_conditions.append(
                "m.recorded_on <= %s"
            )
            params.append(to_date)

        # Add date conditions directly to LEFT JOIN.
        # This keeps departments visible even when
        # they have zero records in the selected period.
        date_filter = ""

        if join_conditions:
            date_filter = " AND " + " AND ".join(
                join_conditions
            )

        query = f"""
            SELECT
                d.id AS department_id,
                d.name AS department,

                ROUND(
                    COALESCE(SUM(m.metric_value), 0),
                    2
                ) AS total_value,

                COUNT(m.id) AS total_records

            FROM departments d

            LEFT JOIN metrics m
                ON d.id = m.department_id
                {date_filter}

            GROUP BY
                d.id,
                d.name

            ORDER BY
                total_value DESC
        """

        cursor.execute(
            query,
            tuple(params)
        )

        rows = cursor.fetchall()

        departments = []

        for row in rows:

            departments.append({
                "department_id": row["department_id"],
                "department": row["department"],
                "total_value": float(
                    row["total_value"]
                ),
                "total_records": row["total_records"]
            })

        return jsonify({
            "success": True,
            "departments": departments
        }), 200

    except Exception as e:

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if db:
            db.close()
 
# ==========================================
# TOP 5 METRICS API
# ==========================================

@app.route("/api/metrics/top", methods=["GET"])
@jwt_required()
def get_top_metrics():

    db = None
    cursor = None

    try:
        db = get_db_connection()
        cursor = db.cursor(dictionary=True)

        # Optional filters
        department = request.args.get(
            "department", ""
        ).strip()

        from_date = request.args.get(
            "from", ""
        ).strip()

        to_date = request.args.get(
            "to", ""
        ).strip()

        conditions = []
        params = []

        if department:
            conditions.append("d.name = %s")
            params.append(department)

        if from_date:
            conditions.append("m.recorded_on >= %s")
            params.append(from_date)

        if to_date:
            conditions.append("m.recorded_on <= %s")
            params.append(to_date)

        where_clause = ""

        if conditions:
            where_clause = (
                "WHERE " + " AND ".join(conditions)
            )

        # Group same metric names together
        query = f"""
            SELECT
                m.metric_name,

                ROUND(
                    SUM(m.metric_value),
                    2
                ) AS total_value,

                COUNT(m.id) AS total_records

            FROM metrics m

            JOIN departments d
                ON m.department_id = d.id

            {where_clause}

            GROUP BY
                m.metric_name

            ORDER BY
                total_value DESC

            LIMIT 5
        """

        cursor.execute(
            query,
            tuple(params)
        )

        rows = cursor.fetchall()

        top_metrics = []

        for index, row in enumerate(
            rows,
            start=1
        ):

            top_metrics.append({
                "rank": index,
                "metric_name":
                    row["metric_name"],

                "total_value":
                    float(row["total_value"]),

                "total_records":
                    row["total_records"]
            })

        return jsonify({
            "success": True,
            "top_metrics": top_metrics
        }), 200

    except Exception as e:

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if db:
            db.close()
            
# ==========================================
# GET METRICS - PAGINATION + SEARCH + FILTER
# ==========================================

@app.route("/api/metrics", methods=["GET"])
@jwt_required()
def get_metrics():

    db = None
    cursor = None

    try:
        db = get_db_connection()
        cursor = db.cursor(dictionary=True)

        # --------------------------------------
        # QUERY PARAMETERS
        # --------------------------------------

        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 10, type=int)

        search = request.args.get(
            "search", ""
        ).strip()

        department = request.args.get(
            "department", ""
        ).strip()

        # Protect against invalid values
        if page < 1:
            page = 1

        if per_page < 1:
            per_page = 10

        # Maximum 100 records per request
        if per_page > 100:
            per_page = 100

        conditions = []
        params = []

        # --------------------------------------
        # SEARCH
        # --------------------------------------

        if search:
            conditions.append(
                """
                (
                    m.metric_name LIKE %s
                    OR d.name LIKE %s
                    OR u.name LIKE %s
                )
                """
            )

            search_value = f"%{search}%"

            params.extend([
                search_value,
                search_value,
                search_value
            ])

        # --------------------------------------
        # DEPARTMENT FILTER
        # --------------------------------------

        if department:
            conditions.append(
                "d.name = %s"
            )
            params.append(department)

        where_clause = ""

        if conditions:
            where_clause = (
                "WHERE " +
                " AND ".join(conditions)
            )

        # --------------------------------------
        # COUNT TOTAL MATCHING RECORDS
        # --------------------------------------

        count_query = f"""
            SELECT
                COUNT(m.id) AS total

            FROM metrics m

            JOIN departments d
                ON m.department_id = d.id

            LEFT JOIN users u
                ON m.uploaded_by = u.id

            {where_clause}
        """

        cursor.execute(
            count_query,
            tuple(params)
        )

        total_records = cursor.fetchone()["total"]

        # --------------------------------------
        # PAGINATION
        # --------------------------------------

        offset = (page - 1) * per_page

        total_pages = (
            (total_records + per_page - 1)
            // per_page
        )

        # --------------------------------------
        # GET METRIC RECORDS
        # --------------------------------------

        data_query = f"""
            SELECT
                m.id,
                m.metric_name,
                m.metric_value,
                m.recorded_on,
                m.created_at,

                d.id AS department_id,
                d.name AS department,

                u.id AS uploaded_by_id,
                u.name AS uploaded_by

            FROM metrics m

            JOIN departments d
                ON m.department_id = d.id

            LEFT JOIN users u
                ON m.uploaded_by = u.id

            {where_clause}

            ORDER BY
                m.recorded_on DESC,
                m.id DESC

            LIMIT %s OFFSET %s
        """

        data_params = params.copy()

        data_params.extend([
            per_page,
            offset
        ])

        cursor.execute(
            data_query,
            tuple(data_params)
        )

        rows = cursor.fetchall()

        # --------------------------------------
        # CONVERT VALUES FOR JSON
        # --------------------------------------

        metrics = []

        for row in rows:

            metrics.append({
                "id": row["id"],

                "metric_name":
                    row["metric_name"],

                "metric_value":
                    float(row["metric_value"]),

                "recorded_on":
                    row["recorded_on"].isoformat()
                    if row["recorded_on"]
                    else None,

                "department_id":
                    row["department_id"],

                "department":
                    row["department"],

                "uploaded_by_id":
                    row["uploaded_by_id"],

                "uploaded_by":
                    row["uploaded_by"],

                "created_at":
                    row["created_at"].isoformat()
                    if row["created_at"]
                    else None
            })

        # --------------------------------------
        # RESPONSE
        # --------------------------------------

        return jsonify({
            "success": True,

            "metrics": metrics,

            "pagination": {
                "page": page,
                "per_page": per_page,
                "total_records": total_records,
                "total_pages": total_pages,
                "has_previous": page > 1,
                "has_next": page < total_pages
            }
        }), 200

    except Exception as e:

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

    finally:

        if cursor:
            cursor.close()

        if db:
            db.close() 
            
                       
                


# ==========================================
# EXPORT FILTERED METRICS AS CSV
# ADMIN + ANALYST ONLY
# ==========================================
@app.route("/api/metrics/export", methods=["GET"])
@jwt_required()
def export_metrics():
    db = None
    cursor = None
    try:
        user_id = get_jwt_identity()
        if not check_user_role(user_id, ["admin", "analyst"]):
            return jsonify({"success": False, "message": "Access denied. Admin or Analyst only."}), 403

        search = request.args.get("search", "").strip()
        department = request.args.get("department", "").strip()
        conditions = []
        params = []
        if search:
            conditions.append("(m.metric_name LIKE %s OR d.name LIKE %s OR u.name LIKE %s)")
            like = f"%{search}%"
            params.extend([like, like, like])
        if department:
            conditions.append("d.name = %s")
            params.append(department)
        where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""

        db = get_db_connection()
        cursor = db.cursor(dictionary=True)
        cursor.execute(f"""
            SELECT m.id, d.name AS department, m.metric_name,
                   m.metric_value, m.recorded_on, u.name AS uploaded_by
            FROM metrics m
            JOIN departments d ON m.department_id = d.id
            LEFT JOIN users u ON m.uploaded_by = u.id
            {where_clause}
            ORDER BY m.recorded_on DESC, m.id DESC
        """, tuple(params))

        output = io.StringIO(newline="")
        writer = csv.writer(output)
        writer.writerow(["ID", "Department", "Metric Name", "Metric Value", "Recorded On", "Uploaded By"])

        def safe_cell(value):
            text = "" if value is None else str(value)
            # Prevent spreadsheet formula injection when CSV is opened in Excel.
            if text.lstrip().startswith(("=", "+", "-", "@")) and not isinstance(value, (int, float)):
                return "'" + text
            return text

        for row in cursor:
            writer.writerow([
                row["id"],
                safe_cell(row["department"]),
                safe_cell(row["metric_name"]),
                row["metric_value"],
                row["recorded_on"].isoformat() if row["recorded_on"] else "",
                safe_cell(row["uploaded_by"]),
            ])

        filename = f"EDABIP_Metrics_{datetime.now().strftime('%Y-%m-%d')}.csv"
        return Response(
            "\ufeff" + output.getvalue(),
            mimetype="text/csv; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{filename}"',
                     "Cache-Control": "no-store"},
        )
    except Exception:
        app.logger.exception("Metrics CSV export failed")
        return jsonify({"success": False, "message": "Unable to export metrics."}), 500
    finally:
        if cursor:
            cursor.close()
        if db:
            db.close()

# ==========================================
# ADD NEW METRIC
# ADMIN + ANALYST ONLY
# ==========================================

@app.route("/api/metrics", methods=["POST"])
@jwt_required()
def add_metric():
    db = None
    cursor = None

    try:
        user_id = get_jwt_identity()

        # Role protection
        if not check_user_role(user_id, ["admin", "analyst"]):
            return jsonify({
                "success": False,
                "message": "Access denied. Admin or Analyst only."
            }), 403

        data = request.get_json()

        if not data:
            return jsonify({
                "success": False,
                "message": "Request body is required"
            }), 400

        # Accept either department_id or department name.
        # React sends the department name; API clients may send department_id.
        department_id = data.get("department_id")
        department_name = str(data.get("department", "")).strip()
        metric_name = data.get("metric_name", "").strip()
        metric_value = data.get("metric_value")
        recorded_on = data.get("recorded_on")

        if (
            (not department_id and not department_name)
            or not metric_name
            or metric_value is None
            or not recorded_on
        ):
            return jsonify({
                "success": False,
                "message": "Department, metric name, value and date are required"
            }), 400

        # Validate numeric metric value
        try:
            metric_value = float(metric_value)
        except (TypeError, ValueError):
            return jsonify({
                "success": False,
                "message": "Metric value must be a valid number"
            }), 400

        # Validate date format
        try:
            recorded_on = datetime.strptime(
                str(recorded_on),
                "%Y-%m-%d"
            ).date()
        except (TypeError, ValueError):
            return jsonify({
                "success": False,
                "message": "Date must use YYYY-MM-DD format"
            }), 400

        db = get_db_connection()
        cursor = db.cursor(dictionary=True)

        # Resolve department by ID or by department name.
        if department_id:
            cursor.execute(
                """
                SELECT id, name
                FROM departments
                WHERE id = %s
                """,
                (department_id,)
            )
        else:
            cursor.execute(
                """
                SELECT id, name
                FROM departments
                WHERE LOWER(name) = LOWER(%s)
                """,
                (department_name,)
            )

        department = cursor.fetchone()

        if not department:
            return jsonify({
                "success": False,
                "message": "Invalid department"
            }), 400

        # Use the canonical department ID from the database.
        department_id = department["id"]

        # Insert metric
        cursor.execute(
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
            (
                department_id,
                metric_name,
                metric_value,
                recorded_on,
                user_id
            )
        )

        metric_id = cursor.lastrowid

        # Add activity log
        action = (
            f"Added metric '{metric_name}' "
            f"to {department['name']}"
        )

        cursor.execute(
            """
            INSERT INTO activity_log
            (user_id, action)
            VALUES (%s, %s)
            """,
            (user_id, action)
        )

        db.commit()

        # Real-time activity update
        socketio.emit(
            "activity_update",
            {
                "user_id": user_id,
                "action": action
            }
        )

        return jsonify({
            "success": True,
            "message": "Metric added successfully",
            "metric": {
                "id": metric_id,
                "department_id": department_id,
                "department": department["name"],
                "metric_name": metric_name,
                "metric_value": metric_value,
                "recorded_on": recorded_on
            }
        }), 201

    except Exception as e:
        if db:
            db.rollback()

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

    finally:
        if cursor:
            cursor.close()

        if db:
            db.close()



# ==========================================
# CSV BULK UPLOAD
# ADMIN + ANALYST ONLY
# ==========================================

@app.route("/api/metrics/upload", methods=["POST"])
@jwt_required()
def upload_metrics_csv():
    db = None
    cursor = None

    try:
        user_id = get_jwt_identity()

        # Role protection
        if not check_user_role(user_id, ["admin", "analyst"]):
            return jsonify({
                "success": False,
                "message": "Access denied. Admin or Analyst only."
            }), 403

        # Check uploaded file
        if "file" not in request.files:
            return jsonify({
                "success": False,
                "message": "CSV file is required"
            }), 400

        file = request.files["file"]

        if not file or file.filename == "":
            return jsonify({
                "success": False,
                "message": "Please select a CSV file"
            }), 400

        if not file.filename.lower().endswith(".csv"):
            return jsonify({
                "success": False,
                "message": "Only CSV files are allowed"
            }), 400

        # Decode CSV safely
        try:
            stream = io.StringIO(
                file.stream.read().decode("utf-8-sig"),
                newline=None
            )
        except UnicodeDecodeError:
            return jsonify({
                "success": False,
                "message": "CSV file must use UTF-8 encoding"
            }), 400

        reader = csv.DictReader(stream)

        required_columns = {
            "department",
            "metric_name",
            "metric_value",
            "recorded_on"
        }

        if not reader.fieldnames:
            return jsonify({
                "success": False,
                "message": "CSV file is empty or has no header row"
            }), 400

        headers = {
            header.strip()
            for header in reader.fieldnames
            if header
        }

        missing_columns = required_columns - headers

        if missing_columns:
            return jsonify({
                "success": False,
                "message": (
                    "Missing CSV columns: "
                    + ", ".join(sorted(missing_columns))
                )
            }), 400

        db = get_db_connection()
        cursor = db.cursor(dictionary=True)

        # Load departments once
        cursor.execute("""
            SELECT id, name
            FROM departments
        """)

        department_rows = cursor.fetchall()

        department_map = {
            row["name"].strip().lower(): row["id"]
            for row in department_rows
        }

        inserted_count = 0
        errors = []

        # Process CSV rows
        for row_number, row in enumerate(reader, start=2):
            try:
                department_name = (
                    row.get("department") or ""
                ).strip()

                metric_name = (
                    row.get("metric_name") or ""
                ).strip()

                metric_value_raw = (
                    row.get("metric_value") or ""
                ).strip()

                recorded_on_raw = (
                    row.get("recorded_on") or ""
                ).strip()

                if (
                    not department_name
                    or not metric_name
                    or not metric_value_raw
                    or not recorded_on_raw
                ):
                    raise ValueError(
                        "Department, metric name, value and date are required"
                    )

                department_id = department_map.get(
                    department_name.lower()
                )

                if not department_id:
                    raise ValueError(
                        f"Unknown department '{department_name}'"
                    )

                try:
                    metric_value = float(metric_value_raw)
                except ValueError:
                    raise ValueError(
                        "Metric value must be a valid number"
                    )

                try:
                    recorded_on = datetime.strptime(
                        recorded_on_raw,
                        "%Y-%m-%d"
                    ).date()
                except ValueError:
                    raise ValueError(
                        "Date must use YYYY-MM-DD format"
                    )

                cursor.execute(
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
                    (
                        department_id,
                        metric_name,
                        metric_value,
                        recorded_on,
                        user_id
                    )
                )

                inserted_count += 1

            except Exception as row_error:
                errors.append({
                    "row": row_number,
                    "message": str(row_error)
                })

        if inserted_count == 0:
            db.rollback()

            return jsonify({
                "success": False,
                "message": "No valid metrics were found in the CSV file",
                "inserted_count": 0,
                "errors": errors
            }), 400

        # One activity entry for the complete CSV upload
        action = (
            f"Uploaded {inserted_count} metrics "
            f"from CSV file '{file.filename}'"
        )

        cursor.execute(
            """
            INSERT INTO activity_log
            (user_id, action)
            VALUES (%s, %s)
            """,
            (user_id, action)
        )

        # Get newly created activity ID
        activity_id = cursor.lastrowid

        # Get current user information for the live activity payload
        cursor.execute(
            """
            SELECT id, name, email, role
            FROM users
            WHERE id = %s
            """,
            (user_id,)
        )

        activity_user = cursor.fetchone()

        db.commit()

        # Real-time update after successful commit
        socketio.emit(
            "activity_update",
            {
                "id": activity_id,
                "user_id": int(user_id),
                "user_name": activity_user["name"],
                "user_email": activity_user["email"],
                "user_role": activity_user["role"],
                "action": action,
                "created_at": datetime.now().isoformat()
            }
        )

        return jsonify({
            "success": True,
            "message": "CSV upload completed",
            "inserted_count": inserted_count,
            "error_count": len(errors),
            "errors": errors
        }), 201

    except Exception as e:
        if db:
            db.rollback()

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

    finally:
        if cursor:
            cursor.close()

        if db:
            db.close()



# ==========================================
# DELETE METRIC
# ADMIN ONLY
# ==========================================

@app.route("/api/metrics/<int:metric_id>", methods=["DELETE"])
@jwt_required()
def delete_metric(metric_id):
    db = None
    cursor = None

    try:
        user_id = get_jwt_identity()

        # Only Admin can delete metrics
        if not check_user_role(user_id, ["admin"]):
            return jsonify({
                "success": False,
                "message": "Access denied. Admin only."
            }), 403

        db = get_db_connection()
        cursor = db.cursor(dictionary=True)

        # Find the metric before deleting it.
        # We keep its details for the activity log.
        cursor.execute(
            """
            SELECT
                m.id,
                m.metric_name,
                d.name AS department
            FROM metrics m
            JOIN departments d
                ON m.department_id = d.id
            WHERE m.id = %s
            """,
            (metric_id,)
        )

        metric = cursor.fetchone()

        if not metric:
            return jsonify({
                "success": False,
                "message": "Metric not found"
            }), 404

        # Delete metric
        cursor.execute(
            """
            DELETE FROM metrics
            WHERE id = %s
            """,
            (metric_id,)
        )

        # Add activity log
        action = (
            f"Deleted metric '{metric['metric_name']}' "
            f"from {metric['department']}"
        )

        cursor.execute(
            """
            INSERT INTO activity_log
            (user_id, action)
            VALUES (%s, %s)
            """,
            (user_id, action)
        )

        db.commit()

        # Real-time activity notification
        socketio.emit(
            "activity_update",
            {
                "user_id": user_id,
                "action": action
            }
        )

        return jsonify({
            "success": True,
            "message": "Metric deleted successfully",
            "deleted_metric_id": metric_id
        }), 200

    except Exception as e:
        if db:
            db.rollback()

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

    finally:
        if cursor:
            cursor.close()

        if db:
            db.close()



# ==========================================
# ACTIVITY FEED
# ADMIN ONLY - LATEST 20 ACTIVITIES
# ==========================================

@app.route("/api/activity", methods=["GET"])
@jwt_required()
def get_activity():
    db = None
    cursor = None

    try:
        user_id = get_jwt_identity()

        # Only Admin can view the activity feed
        if not check_user_role(user_id, ["admin"]):
            return jsonify({
                "success": False,
                "message": "Access denied. Admin only."
            }), 403

        db = get_db_connection()
        cursor = db.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT
                a.id,
                a.user_id,
                u.name AS user_name,
                u.email AS user_email,
                u.role AS user_role,
                a.action,
                a.created_at
            FROM activity_log a
            JOIN users u
                ON a.user_id = u.id
            ORDER BY
                a.created_at DESC,
                a.id DESC
            LIMIT 20
            """
        )

        rows = cursor.fetchall()

        activities = []

        for row in rows:
            activities.append({
                "id": row["id"],
                "user_id": row["user_id"],
                "user_name": row["user_name"],
                "user_email": row["user_email"],
                "user_role": row["user_role"],
                "action": row["action"],
                "created_at": (
                    row["created_at"].isoformat()
                    if row["created_at"]
                    else None
                )
            })

        return jsonify({
            "success": True,
            "count": len(activities),
            "activities": activities
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

    finally:
        if cursor:
            cursor.close()

        if db:
            db.close()


# ==========================================
# RUN SERVER
# ==========================================

if __name__ == "__main__":

    socketio.run(
        app,
        host="127.0.0.1",
        port=5000,
        debug=True
    )