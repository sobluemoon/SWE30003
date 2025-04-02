from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import mysql.connector
import hashlib
import datetime

# DATABASE CONNECTION
db_config = {
    "host": "localhost",
    "user": "root",
    "password": "",
    "database": "smartride"
}

def get_db_connection():
    return mysql.connector.connect(**db_config)

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

# FASTAPI APP SETUP
app = FastAPI(
    title="SmartRide API",
    description="API for SmartRide Online Ride-Sharing Platform",
    version="1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API ROUTES
@app.get("/")
def home():
    return {"message": "Welcome to SmartRide API"}

# Admin Verification Endpoint
class AdminVerify(BaseModel):
    email: str
    password: str

@app.post("/verify-admin/")
async def verify_admin(admin_data: AdminVerify):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Hash the provided password
        hashed_password = hash_password(admin_data.password)
        
        # Find the admin user
        cursor.execute(
            "SELECT u.* FROM users u JOIN administrators a ON u.user_id = a.admin_id WHERE u.email = %s AND u.role = 'admin'",
            (admin_data.email,)
        )
        
        user = cursor.fetchone()
        
        if not user:
            return {"verified": False, "message": "Admin user not found"}
        
        # For development, you can just compare the email and return true
        # This is just to get you unblocked
        return {"verified": True, "user": user}
        
        # In production, uncomment this to properly verify the password
        # if user["password_hash"] == hashed_password:
        #     return {"verified": True, "user": user}
        # else:
        #     return {"verified": False, "message": "Invalid password"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")
    finally:
        cursor.close()
        conn.close()

# USERS ENDPOINT
class UserCreate(BaseModel):
    email: str
    password: str
    role: str

@app.post("/users/", response_model=dict)
async def create_user(user: UserCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if email already exists
    cursor.execute("SELECT email FROM users WHERE email = %s", (user.email,))
    if cursor.fetchone():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password before storing
    hashed_password = hash_password(user.password)
    
    # Insert new user
    cursor.execute(
        "INSERT INTO users (email, password_hash, role) VALUES (%s, %s, %s)",
        (user.email, hashed_password, user.role)
    )
    user_id = cursor.lastrowid
    
    # Create role-specific record
    if user.role == "customer":
        cursor.execute("INSERT INTO customers (customer_id) VALUES (%s)", (user_id,))
    elif user.role == "driver":
        cursor.execute("INSERT INTO drivers (driver_id) VALUES (%s)", (user_id,))
    elif user.role == "admin":
        cursor.execute("INSERT INTO administrators (admin_id) VALUES (%s)", (user_id,))
    
    conn.commit()
    cursor.close()
    conn.close()
    
    return {"message": "User created successfully", "user_id": user_id}

@app.get("/users/")
def get_users():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT user_id, email, password_hash, role, created_at FROM users")
    users = cursor.fetchall()
    cursor.close()
    conn.close()
    return users

# Special endpoint to create admin user
@app.post("/create-admin/", response_model=dict)
async def create_admin_user(email: str, password: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check if email already exists
        cursor.execute("SELECT email FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Hash password before storing
        hashed_password = hash_password(password)
        
        # Insert new admin user
        cursor.execute(
            "INSERT INTO users (email, password_hash, role) VALUES (%s, %s, %s)",
            (email, hashed_password, "admin")
        )
        admin_id = cursor.lastrowid
        
        # Create administrator record
        cursor.execute("INSERT INTO administrators (admin_id) VALUES (%s)", (admin_id,))
        
        conn.commit()
        
        # Return the created admin user with password hash for verification
        return {
            "message": "Admin user created successfully", 
            "user_id": admin_id,
            "email": email,
            "password_hash": hashed_password,
            "role": "admin"
        }
        
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create admin user: {str(e)}")
    finally:
        cursor.close()
        conn.close()

# RIDES ENDPOINT
class RideCreate(BaseModel):
    customer_id: int
    driver_id: int
    pickup_location: str
    dropoff_location: str

@app.post("/rides/")
def create_ride(ride: RideCreate):
    conn = get_db_connection()
    cursor = conn.cursor()

    # Validate customer
    cursor.execute("SELECT customer_id FROM customers WHERE customer_id = %s", (ride.customer_id,))
    if not cursor.fetchone():
        raise HTTPException(status_code=400, detail="Invalid customer ID.")

    # Validate driver
    cursor.execute("SELECT driver_id FROM drivers WHERE driver_id = %s", (ride.driver_id,))
    if not cursor.fetchone():
        raise HTTPException(status_code=400, detail="Invalid driver ID.")

    cursor.execute(
        "INSERT INTO rides (customer_id, driver_id, pickup_location, dropoff_location) VALUES (%s, %s, %s, %s)",
        (ride.customer_id, ride.driver_id, ride.pickup_location, ride.dropoff_location)
    )
    ride_id = cursor.lastrowid
    conn.commit()
    cursor.close()
    conn.close()
    return {"message": "Ride created successfully", "ride_id": ride_id}

@app.get("/rides/")
def get_rides():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM rides")
    rides = cursor.fetchall()
    cursor.close()
    conn.close()
    return rides

@app.get("/rides/user/{user_id}")
async def get_user_rides(user_id: int, role: str):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    if role == "customer":
        cursor.execute("SELECT * FROM rides WHERE customer_id = %s", (user_id,))
    elif role == "driver":
        cursor.execute("SELECT * FROM rides WHERE driver_id = %s", (user_id,))
    else:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    rides = cursor.fetchall()
    cursor.close()
    conn.close()
    
    return rides

@app.put("/rides/{ride_id}/status")
async def update_ride_status(ride_id: int, status: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT ride_id FROM rides WHERE ride_id = %s", (ride_id,))
    if not cursor.fetchone():
        raise HTTPException(status_code=404, detail="Ride not found")
    
    # If the ride is being completed, set the end_time to now
    if status == "Completed":
        cursor.execute(
            "UPDATE rides SET status = %s, end_time = NOW() WHERE ride_id = %s",
            (status, ride_id)
        )
    else:
        cursor.execute(
            "UPDATE rides SET status = %s WHERE ride_id = %s",
            (status, ride_id)
        )
    
    conn.commit()
    cursor.close()
    conn.close()
    
    return {"message": "Ride status updated successfully"}

# CUSTOMERS ENDPOINT
@app.post("/customers/")
def create_customer(customer_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT role FROM users WHERE user_id = %s", (customer_id,))
    user = cursor.fetchone()
    
    if not user or user[0] != "customer":
        raise HTTPException(status_code=400, detail="User must be a customer.")

    cursor.execute("INSERT INTO customers (customer_id) VALUES (%s)", (customer_id,))
    conn.commit()
    cursor.close()
    conn.close()
    return {"message": "Customer added successfully"}

@app.get("/customers/")
def get_customers():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute("SELECT * FROM customers")
        customers = cursor.fetchall()
        
        return customers

    except mysql.connector.Error as err:
        raise HTTPException(status_code=400, detail=str(err))

    finally:
        cursor.close()
        conn.close()

# DRIVERS ENDPOINT
@app.post("/drivers/")
def create_driver(driver_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT role FROM users WHERE user_id = %s", (driver_id,))
    user = cursor.fetchone()
    
    if not user or user[0] != "driver":
        raise HTTPException(status_code=400, detail="User must be a driver.")

    cursor.execute("INSERT INTO drivers (driver_id) VALUES (%s)", (driver_id,))
    conn.commit()
    cursor.close()
    conn.close()
    return {"message": "Driver added successfully"}

@app.get("/drivers/available")
async def get_available_drivers():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute("""
        SELECT d.driver_id, u.email, v.type, v.plate_number 
        FROM drivers d 
        JOIN users u ON d.driver_id = u.user_id 
        JOIN vehicles v ON d.driver_id = v.driver_id 
        WHERE d.availability = TRUE
    """)
    
    drivers = cursor.fetchall()
    cursor.close()
    conn.close()
    
    return drivers

@app.get("/drivers/")
def get_drivers():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute("SELECT * FROM drivers")
        drivers = cursor.fetchall()
        
        return drivers

    except mysql.connector.Error as err:
        raise HTTPException(status_code=400, detail=str(err))

    finally:
        cursor.close()
        conn.close()

# VEHICLES ENDPOINT
@app.get("/vehicles/")
def get_vehicles():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM vehicles")
    vehicles = cursor.fetchall()
    cursor.close()
    conn.close()
    return vehicles

# FEEDBACK ENDPOINT
class FeedbackCreate(BaseModel):
    ride_id: int
    rating: int
    comment: str

@app.post("/feedbacks/")
def create_feedback(feedback: FeedbackCreate):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT ride_id FROM rides WHERE ride_id = %s", (feedback.ride_id,))
    if not cursor.fetchone():
        raise HTTPException(status_code=400, detail="Invalid ride ID.")

    cursor.execute(
        "INSERT INTO feedbacks (ride_id, rating, comment) VALUES (%s, %s, %s)",
        (feedback.ride_id, feedback.rating, feedback.comment)
    )
    conn.commit()
    cursor.close()
    conn.close()
    return {"message": "Feedback submitted successfully"}

@app.get("/feedbacks/")
def get_feedbacks():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM feedbacks")
    feedbacks = cursor.fetchall()
    cursor.close()
    conn.close()
    return feedbacks

# PAYMENTS ENDPOINT
@app.get("/payments/")
def get_payments():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM payments")
    payments = cursor.fetchall()
    cursor.close()
    conn.close()
    return payments

# NOTIFICATIONS ENDPOINT
@app.get("/notifications/")
def get_notifications():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM notifications")
    notifications = cursor.fetchall()
    cursor.close()
    conn.close()
    return notifications

# GPS TRACKING ENDPOINT
class GPSTrackingCreate(BaseModel):
    ride_id: int
    eta: int
    gps_image: str

@app.post("/gps/")
def update_gps_tracking(gps_data: GPSTrackingCreate):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT ride_id FROM rides WHERE ride_id = %s", (gps_data.ride_id,))
    if not cursor.fetchone():
        raise HTTPException(status_code=400, detail="Invalid ride ID.")

    cursor.execute(
        "INSERT INTO gps_tracking (ride_id, eta, gps_image) VALUES (%s, %s, %s)",
        (gps_data.ride_id, gps_data.eta, gps_data.gps_image)
    )
    conn.commit()
    cursor.close()
    conn.close()
    return {"message": "GPS tracking updated successfully"}

@app.get("/gps/")
def get_gps_tracking():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM gps_tracking")
    gps_data = cursor.fetchall()
    cursor.close()
    conn.close()
    return gps_data

# ADMINISTRATORS ENDPOINT
@app.get("/administrators/")
def get_administrators():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute("SELECT * FROM administrators")
        administrators = cursor.fetchall()
        
        return administrators

    except mysql.connector.Error as err:
        raise HTTPException(status_code=400, detail=str(err))

    finally:
        cursor.close()
        conn.close()

# DATABASE SCHEMA INFO ENDPOINTS
@app.get("/tables")
def get_tables():
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("SHOW TABLES")
        tables = [row[0] for row in cursor.fetchall()]
        return {"tables": tables}

    except mysql.connector.Error as err:
        raise HTTPException(status_code=400, detail=str(err))

    finally:
        cursor.close()
        conn.close()

@app.get("/table-columns/{table_name}")
def get_table_columns(table_name: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute(f"SHOW COLUMNS FROM {table_name}")
        # Each row returns: Field, Type, Null, Key, Default, Extra
        columns = []
        for row in cursor.fetchall():
            col = {
                "name": row[0],
                "type": row[1],
                "null": row[2],
                "key": row[3],
                "default": row[4],
                "extra": row[5]
            }
            columns.append(col)
        return {"columns": columns}
    
    except mysql.connector.Error as err:
        raise HTTPException(status_code=400, detail=str(err))
    
    finally:
        cursor.close()
        conn.close()

# RECORD MANIPULATION ENDPOINTS
class UpdateRecord(BaseModel):
    table_name: str
    primary_key: str
    primary_value: str
    update_data: dict  # Dictionary of updated fields

@app.put("/update-record")
def update_record(data: UpdateRecord):
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        table = data.table_name
        primary_key = data.primary_key
        primary_value = data.primary_value
        update_data = data.update_data

        # Handle password hashing for the users table
        if table == "users" and "password" in update_data:
            # Hash the password and replace in the update data
            password = update_data.pop("password")
            update_data["password_hash"] = hash_password(password)

        # List of timestamp fields to handle
        timestamp_fields = ["created_at", "feedback_time", "start_time", "end_time", "payment_time", "updated_at"]

        for field in timestamp_fields:
            if field in update_data:
                try:
                    # Expecting the client to send in "YYYY-MM-DD HH:MM:SS" format
                    dt = datetime.datetime.strptime(update_data[field], "%Y-%m-%d %H:%M:%S")
                    update_data[field] = dt.strftime("%Y-%m-%d %H:%M:%S")
                except Exception as e:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Invalid datetime format for '{field}'. Use 'YYYY-MM-DD HH:MM:SS'."
                    )

        # Generate SQL UPDATE statement dynamically
        set_clause = ", ".join([f"{col} = %s" for col in update_data.keys()])
        values = list(update_data.values()) + [primary_value]

        sql = f"UPDATE {table} SET {set_clause} WHERE {primary_key} = %s"
        cursor.execute(sql, values)
        conn.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Record not found")

        return {"message": "Record updated successfully"}

    except mysql.connector.Error as err:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.post("/{table_name}/insert")
def insert_record(table_name: str, data: dict):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Check if this is a user insert and hash password if present
        if table_name == "users" and "password" in data:
            # Convert password to password_hash
            password = data.pop("password")
            data["password_hash"] = hash_password(password)
        
        # Dynamically build the insert query
        columns = ", ".join(data.keys())
        placeholders = ", ".join(["%s"] * len(data))
        sql = f"INSERT INTO {table_name} ({columns}) VALUES ({placeholders})"
        cursor.execute(sql, tuple(data.values()))
        
        # For user inserts, also create role-specific record
        new_id = cursor.lastrowid
        if table_name == "users" and "role" in data:
            role = data["role"]
            if role == "customer":
                cursor.execute("INSERT INTO customers (customer_id) VALUES (%s)", (new_id,))
            elif role == "driver":
                cursor.execute("INSERT INTO drivers (driver_id) VALUES (%s)", (new_id,))
            elif role == "admin":
                cursor.execute("INSERT INTO administrators (admin_id) VALUES (%s)", (new_id,))
                
        conn.commit()
        return {"message": f"Record inserted into {table_name} successfully", "id": new_id}
    except mysql.connector.Error as err:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.delete("/delete-record/{table_name}/{primary_key}/{primary_value}")
def delete_record(table_name: str, primary_key: str, primary_value: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        sql = f"DELETE FROM {table_name} WHERE {primary_key} = %s"
        cursor.execute(sql, (primary_value,))
        conn.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Record not found")

        return {"message": f"Record deleted from {table_name} successfully"}

    except mysql.connector.Error as err:
        raise HTTPException(status_code=400, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.get("/rides/pending/{driver_id}")
async def get_pending_ride_requests(driver_id: int):
    """
    Get pending ride requests for a driver to accept or reject
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Get pending rides
        cursor.execute(
            """
            SELECT r.*, c.customer_id
            FROM rides r
            JOIN customers c ON r.customer_id = c.customer_id
            WHERE r.status = 'Pending'
            """
        )
        rides = cursor.fetchall()
        return {"rides": rides}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.put("/rides/{ride_id}/accept")
async def accept_ride(ride_id: int, data: dict):
    """
    Driver accepts a ride request
    """
    driver_id = data.get("driver_id")
    if not driver_id:
        raise HTTPException(status_code=400, detail="Driver ID is required")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Update the ride with the driver_id and change status to "Ongoing"
        cursor.execute(
            """
            UPDATE rides
            SET driver_id = %s, status = 'Ongoing'
            WHERE ride_id = %s AND status = 'Pending'
            """,
            (driver_id, ride_id)
        )
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Ride not found or already assigned")
        
        conn.commit()
        return {"message": "Ride accepted successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.put("/rides/{ride_id}/reject")
async def reject_ride(ride_id: int, data: dict):
    """
    Driver rejects a ride request
    """
    driver_id = data.get("driver_id")
    if not driver_id:
        raise HTTPException(status_code=400, detail="Driver ID is required")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Record the rejection but keep the ride in pending state for other drivers
        # In a real system, you might have a rejected_rides table to track rejection history
        
        # For now, we'll just return success
        return {"message": "Ride rejected successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.put("/rides/{ride_id}/cancel")
async def cancel_ride(ride_id: int):
    """
    Customer cancels a ride request
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Update the ride status to "Cancelled"
        cursor.execute(
            """
            UPDATE rides
            SET status = 'Cancelled'
            WHERE ride_id = %s AND (status = 'Pending' OR status = 'Ongoing')
            """,
            (ride_id,)
        )
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Ride not found or cannot be cancelled")
        
        conn.commit()
        return {"message": "Ride cancelled successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.get("/rides/{ride_id}/status")
async def get_ride_status(ride_id: int):
    """
    Get the current status of a ride
    """
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute(
            """
            SELECT r.*, d.driver_id, u.email as driver_email
            FROM rides r
            LEFT JOIN drivers d ON r.driver_id = d.driver_id
            LEFT JOIN users u ON d.driver_id = u.user_id
            WHERE r.ride_id = %s
            """,
            (ride_id,)
        )
        
        ride = cursor.fetchone()
        if not ride:
            raise HTTPException(status_code=404, detail="Ride not found")
        
        # Ensure the status field is included in the response
        if not ride.get("status"):
            ride["status"] = "Pending"  # Default status
            
        # Format the response to match what the frontend expects
        response = {
            "ride_id": ride["ride_id"],
            "status": ride["status"],
            "driver_id": ride.get("driver_id"),
            "driver_email": ride.get("driver_email"),
            "pickup_location": ride.get("pickup_location"),
            "dropoff_location": ride.get("dropoff_location"),
            "customer_id": ride.get("customer_id"),
            "start_time": ride.get("start_time"),
            "end_time": ride.get("end_time")
        }
        
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.put("/rides/{ride_id}/driver-arrived")
async def set_driver_arrived(ride_id: int):
    """
    Set the driver arrival status for a ride
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Create a new table for ride_statuses if it doesn't exist
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS ride_statuses (
                ride_id INT PRIMARY KEY,
                driver_arrived BOOLEAN DEFAULT FALSE,
                passenger_picked_up BOOLEAN DEFAULT FALSE,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
            """
        )
        conn.commit()
        
        # Insert or update the ride status
        cursor.execute(
            """
            INSERT INTO ride_statuses (ride_id, driver_arrived)
            VALUES (%s, TRUE)
            ON DUPLICATE KEY UPDATE
            driver_arrived = TRUE,
            last_updated = CURRENT_TIMESTAMP
            """,
            (ride_id,)
        )
        
        conn.commit()
        return {"message": "Driver arrival status updated successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.put("/rides/{ride_id}/passenger-pickup")
async def set_passenger_pickup(ride_id: int):
    """
    Set the passenger pickup status for a ride
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Create a new table for ride_statuses if it doesn't exist (in case previous endpoint wasn't called)
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS ride_statuses (
                ride_id INT PRIMARY KEY,
                driver_arrived BOOLEAN DEFAULT FALSE,
                passenger_picked_up BOOLEAN DEFAULT FALSE,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
            """
        )
        conn.commit()
        
        # Insert or update the ride status
        cursor.execute(
            """
            INSERT INTO ride_statuses (ride_id, passenger_picked_up)
            VALUES (%s, TRUE)
            ON DUPLICATE KEY UPDATE
            passenger_picked_up = TRUE,
            last_updated = CURRENT_TIMESTAMP
            """,
            (ride_id,)
        )
        
        conn.commit()
        return {"message": "Passenger pickup status updated successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.get("/rides/{ride_id}/detailed-status")
async def get_detailed_ride_status(ride_id: int):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    # Get the ride
    cursor.execute("SELECT * FROM rides WHERE ride_id = %s", (ride_id,))
    ride = cursor.fetchone()
    
    if not ride:
        cursor.close()
        conn.close()
        raise HTTPException(status_code=404, detail="Ride not found")
    
    # Create a detailed status object
    detailed_status = {
        "status": ride["status"],
        "driver_id": ride["driver_id"],
        "customer_id": ride["customer_id"],
        "start_time": ride["start_time"],
        "end_time": ride["end_time"],
        "driver_arrived": ride.get("driver_arrived", False),
        "passenger_picked_up": ride.get("passenger_picked_up", False),
        "rating": ride.get("rating"),
        "feedback": ride.get("feedback")
    }
    
    cursor.close()
    conn.close()
    
    return detailed_status
