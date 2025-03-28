from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import mysql.connector
from datetime import datetime
import json
import requests
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# DATABASE CONNECTION
db_config = {
    "host": "localhost",
    "user": "root",
    "password": "",
    "database": "smartride"
}

def get_db_connection():
    try:
        connection = mysql.connector.connect(**db_config)
        logger.info("Database connection successful")
        return connection
    except mysql.connector.Error as err:
        logger.error(f"Database connection error: {err}")
        raise HTTPException(status_code=500, detail=f"Database connection error: {err}")


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


# Security
SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


# Models
class UserCreate(BaseModel):
    email: str
    password: str
    role: str

class RideCreate(BaseModel):
    customer_id: int
    pickup_location: str
    dropoff_location: str
    pickup_lat: float
    pickup_lng: float
    dropoff_lat: float
    dropoff_lng: float

class RideStatusUpdate(BaseModel):
    status: str

class GPSUpdate(BaseModel):
    ride_id: int
    driver_lat: float
    driver_lng: float
    eta: int
    route_coordinates: List[List[float]]

class FeedbackCreate(BaseModel):
    ride_id: int
    rating: int
    comment: str

class GPSTrackingCreate(BaseModel):
    ride_id: int
    eta: int
    gps_image: str

# Helper functions
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


# API ROUTES
@app.get("/")
def home():
    return {"message": "Welcome to SmartRide API"}

@app.on_event("startup")
async def startup_event():
    logger.info("Starting up FastAPI application")
    try:
        # Test database connection
        conn = get_db_connection()
        conn.close()
        logger.info("Database connection test successful")
    except Exception as e:
        logger.error(f"Startup error: {e}")
        raise


# ✅ USERS ENDPOINT
@app.get("/users/")
def get_users():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT user_id, email, role FROM users")
    users = cursor.fetchall()
    cursor.close()
    conn.close()
    return users


# ✅ CUSTOMERS ENDPOINT
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


# ✅ DRIVERS ENDPOINT
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


# ✅ VEHICLES ENDPOINT
@app.get("/vehicles/")
def get_vehicles():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM vehicles")
    vehicles = cursor.fetchall()
    cursor.close()
    conn.close()
    return vehicles


# ✅ RIDES ENDPOINT
@app.post("/rides/")
async def create_ride(ride: RideCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Find available driver
        cursor.execute("""
            SELECT d.driver_id 
            FROM drivers d 
            WHERE d.availability = TRUE 
            LIMIT 1
        """)
        driver = cursor.fetchone()
        
        if not driver:
            raise HTTPException(status_code=400, detail="No available drivers")
        
        # Create ride
        cursor.execute("""
            INSERT INTO rides (
                customer_id, driver_id, pickup_location, dropoff_location,
                pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, status
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'Pending')
        """, (
            ride.customer_id, driver[0], ride.pickup_location, ride.dropoff_location,
            ride.pickup_lat, ride.pickup_lng, ride.dropoff_lat, ride.dropoff_lng
        ))
        
        ride_id = cursor.lastrowid
        
        # Update driver availability
        cursor.execute(
            "UPDATE drivers SET availability = FALSE WHERE driver_id = %s",
            (driver[0],)
        )
        
        conn.commit()
        return {"message": "Ride created successfully", "ride_id": ride_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cursor.close()
        conn.close()


# ✅ PAYMENTS ENDPOINT
@app.get("/payments/")
def get_payments():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM payments")
    payments = cursor.fetchall()
    cursor.close()
    conn.close()
    return payments


# ✅ FEEDBACK ENDPOINT (Multiple Feedbacks Allowed)
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


# ✅ NOTIFICATIONS ENDPOINT
@app.get("/notifications/")
def get_notifications():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM notifications")
    notifications = cursor.fetchall()
    cursor.close()
    conn.close()
    return notifications


# ✅ GPS TRACKING ENDPOINT (Supports Multiple Updates Per Ride)
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

# ✅ GET all rides
@app.get("/rides/")
def get_rides():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM rides")
    rides = cursor.fetchall()
    cursor.close()
    conn.close()
    return rides

# ✅ GET all feedbacks
@app.get("/feedbacks/")
def get_feedbacks():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM feedbacks")
    feedbacks = cursor.fetchall()
    cursor.close()
    conn.close()
    return feedbacks

# ✅ GET all GPS tracking data
@app.get("/gps/")
def get_gps_tracking():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM gps_tracking")
    gps_data = cursor.fetchall()
    cursor.close()
    conn.close()
    return gps_data


# Security routes
@app.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE email = %s", (form_data.username,))
    user = cursor.fetchone()
    cursor.close()
    conn.close()

    if not user or not pwd_context.verify(form_data.password, user['password_hash']):
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    access_token = create_access_token(data={"sub": user['email']})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/users/")
async def create_user(user: UserCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Hash password
    hashed_password = pwd_context.hash(user.password)
    
    try:
        # Insert user
        cursor.execute(
            "INSERT INTO users (email, password_hash, role) VALUES (%s, %s, %s)",
            (user.email, hashed_password, user.role)
        )
        user_id = cursor.lastrowid
        
        # Insert role-specific record
        if user.role == 'customer':
            cursor.execute("INSERT INTO customers (customer_id) VALUES (%s)", (user_id,))
        elif user.role == 'driver':
            cursor.execute("INSERT INTO drivers (driver_id) VALUES (%s)", (user_id,))
        elif user.role == 'admin':
            cursor.execute("INSERT INTO administrators (admin_id) VALUES (%s)", (user_id,))
        
        conn.commit()
        return {"message": "User created successfully", "user_id": user_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.get("/rides/{ride_id}")
async def get_ride(ride_id: int):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute("""
            SELECT r.*, 
                   u1.email as customer_email,
                   u2.email as driver_email,
                   v.type as vehicle_type,
                   v.plate_number
            FROM rides r
            JOIN users u1 ON r.customer_id = u1.user_id
            JOIN users u2 ON r.driver_id = u2.user_id
            JOIN vehicles v ON r.driver_id = v.driver_id
            WHERE r.ride_id = %s
        """, (ride_id,))
        
        ride = cursor.fetchone()
        if not ride:
            raise HTTPException(status_code=404, detail="Ride not found")
        
        return ride
    finally:
        cursor.close()
        conn.close()

@app.put("/rides/{ride_id}/status")
async def update_ride_status(ride_id: int, status_update: RideStatusUpdate):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            UPDATE rides 
            SET status = %s,
                end_time = CASE WHEN %s IN ('Completed', 'Cancelled') THEN NOW() ELSE end_time END
            WHERE ride_id = %s
        """, (status_update.status, status_update.status, ride_id))
        
        if status_update.status in ['Completed', 'Cancelled']:
            cursor.execute("""
                UPDATE drivers d
                JOIN rides r ON d.driver_id = r.driver_id
                SET d.availability = TRUE
                WHERE r.ride_id = %s
            """, (ride_id,))
        
        conn.commit()
        return {"message": "Ride status updated successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.post("/gps/update")
async def update_gps_location(gps_update: GPSUpdate):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Update GPS tracking
        cursor.execute("""
            INSERT INTO gps_tracking (
                ride_id, driver_lat, driver_lng, eta, route_coordinates
            ) VALUES (%s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                driver_lat = VALUES(driver_lat),
                driver_lng = VALUES(driver_lng),
                eta = VALUES(eta),
                route_coordinates = VALUES(route_coordinates)
        """, (
            gps_update.ride_id,
            gps_update.driver_lat,
            gps_update.driver_lng,
            gps_update.eta,
            json.dumps(gps_update.route_coordinates)
        ))
        
        # Update driver's current location
        cursor.execute("""
            UPDATE drivers d
            JOIN rides r ON d.driver_id = r.driver_id
            SET d.current_lat = %s, d.current_lng = %s
            WHERE r.ride_id = %s
        """, (gps_update.driver_lat, gps_update.driver_lng, gps_update.ride_id))
        
        conn.commit()
        return {"message": "GPS location updated successfully"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.get("/gps/{ride_id}")
async def get_gps_location(ride_id: int):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute("""
            SELECT * FROM gps_tracking
            WHERE ride_id = %s
            ORDER BY updated_at DESC
            LIMIT 1
        """, (ride_id,))
        
        gps_data = cursor.fetchone()
        if not gps_data:
            raise HTTPException(status_code=404, detail="GPS data not found")
        
        return gps_data
    finally:
        cursor.close()
        conn.close()

@app.get("/drivers/available")
async def get_available_drivers():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute("""
            SELECT d.*, u.email, v.type as vehicle_type, v.plate_number
            FROM drivers d
            JOIN users u ON d.driver_id = u.user_id
            JOIN vehicles v ON d.driver_id = v.driver_id
            WHERE d.availability = TRUE
        """)
        
        drivers = cursor.fetchall()
        return drivers
    finally:
        cursor.close()
        conn.close()

@app.get("/rides/user/{user_id}")
async def get_user_rides(user_id: int, role: str):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        if role == 'customer':
            cursor.execute("""
                SELECT r.*, u.email as driver_email, v.type as vehicle_type, v.plate_number
                FROM rides r
                JOIN users u ON r.driver_id = u.user_id
                JOIN vehicles v ON r.driver_id = v.driver_id
                WHERE r.customer_id = %s
                ORDER BY r.start_time DESC
            """, (user_id,))
        else:  # driver
            cursor.execute("""
                SELECT r.*, u.email as customer_email, v.type as vehicle_type, v.plate_number
                FROM rides r
                JOIN users u ON r.customer_id = u.user_id
                JOIN vehicles v ON r.driver_id = v.driver_id
                WHERE r.driver_id = %s
                ORDER BY r.start_time DESC
            """, (user_id,))
        
        rides = cursor.fetchall()
        return rides
    finally:
        cursor.close()
        conn.close()

