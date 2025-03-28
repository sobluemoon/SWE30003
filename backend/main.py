from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import mysql.connector
import hashlib

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
    
    conn.commit()
    cursor.close()
    conn.close()
    
    return {"message": "User created successfully", "user_id": user_id}

@app.get("/users/")
def get_users():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT user_id, email, password_hash, role FROM users")
    users = cursor.fetchall()
    cursor.close()
    conn.close()
    return users

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
    
    cursor.execute(
        "UPDATE rides SET status = %s WHERE ride_id = %s",
        (status, ride_id)
    )
    
    conn.commit()
    cursor.close()
    conn.close()
    
    return {"message": "Ride status updated successfully"}

# DRIVERS ENDPOINT
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
