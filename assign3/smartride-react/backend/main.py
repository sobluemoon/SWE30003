from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import mysql.connector


# DATABASE CONNECTION
db_config = {
    "host": "localhost",
    "user": "root",
    "password": "",
    "database": "smartride"
}

def get_db_connection():
    return mysql.connector.connect(**db_config)


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
    conn.commit()
    cursor.close()
    conn.close()
    return {"message": "Ride created successfully"}


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

