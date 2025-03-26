from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
import mysql.connector
from pydantic import BaseModel
from typing import List, Optional

# DATABASE CONFIGURATION
db_config = {
    "host": "localhost",
    "user": "root",
    "password": "",
    "database": "smartride"
}

# FUNCTION TO GET DATABASE CONNECTION
def get_db_connection():
    conn = mysql.connector.connect(**db_config)
    return conn

# FASTAPI APP SETUP
app = FastAPI(
    title="SmartRide API",
    description="API for SmartRide Online Ride-Sharing Platform",
    version="1.0"
)

# CORS MIDDLEWARE
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MODELS FOR REQUESTS & RESPONSES
class UserCreate(BaseModel):
    email: str
    password_hash: str
    role: str  # 'customer', 'driver', 'admin'

class RideCreate(BaseModel):
    customer_id: int
    driver_id: int
    pickup_location: str
    dropoff_location: str

class PaymentCreate(BaseModel):
    ride_id: int
    amount: float
    status: str  # 'Pending', 'Completed', 'Failed'

class NotificationCreate(BaseModel):
    user_id: int
    message: str

class VehicleCreate(BaseModel):
    driver_id: int
    type: str  # 'Car', 'Bike', 'SUV'
    plate_number: str

class FeedbackCreate(BaseModel):
    ride_id: int
    rating: int
    comment: Optional[str] = None  # Comment is optional

# API ROUTES

@app.get("/")
def home():
    return {"message": "Welcome to SmartRide API"}

# USERS ENDPOINTS
@app.get("/users/")
def get_users():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT user_id, email, role FROM users")
    users = cursor.fetchall()
    cursor.close()
    conn.close()
    return users

@app.post("/users/")
def create_user(user: UserCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO users (email, password_hash, role) VALUES (%s, %s, %s)",
                       (user.email, user.password_hash, user.role))
        conn.commit()
        return {"message": "User created successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=400, detail=str(err))
    finally:
        cursor.close()
        conn.close()

# VEHICLES ENDPOINTS
@app.get("/vehicles/")
def get_vehicles():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM vehicles")
    vehicles = cursor.fetchall()
    cursor.close()
    conn.close()
    return vehicles

@app.post("/vehicles/")
def create_vehicle(vehicle: VehicleCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO vehicles (driver_id, type, plate_number) VALUES (%s, %s, %s)",
                       (vehicle.driver_id, vehicle.type, vehicle.plate_number))
        conn.commit()
        return {"message": "Vehicle added successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=400, detail=str(err))
    finally:
        cursor.close()
        conn.close()

@app.delete("/vehicles/{vehicle_id}")
def delete_vehicle(vehicle_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM vehicles WHERE vehicle_id = %s", (vehicle_id,))
        conn.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Vehicle not found")
        return {"message": "Vehicle deleted successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=400, detail=str(err))
    finally:
        cursor.close()
        conn.close()

# RIDES ENDPOINTS
@app.get("/rides/")
def get_rides():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM rides")
    rides = cursor.fetchall()
    cursor.close()
    conn.close()
    return rides

@app.post("/rides/")
def create_ride(ride: RideCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO rides (customer_id, driver_id, pickup_location, dropoff_location) VALUES (%s, %s, %s, %s)",
                       (ride.customer_id, ride.driver_id, ride.pickup_location, ride.dropoff_location))
        conn.commit()
        return {"message": "Ride created successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=400, detail=str(err))
    finally:
        cursor.close()
        conn.close()

# PAYMENTS ENDPOINTS
@app.get("/payments/")
def get_payments():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM payments")
    payments = cursor.fetchall()
    cursor.close()
    conn.close()
    return payments

@app.post("/payments/")
def create_payment(payment: PaymentCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO payments (ride_id, amount, status) VALUES (%s, %s, %s)",
                       (payment.ride_id, payment.amount, payment.status))
        conn.commit()
        return {"message": "Payment recorded successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=400, detail=str(err))
    finally:
        cursor.close()
        conn.close()

# FEEDBACK ENDPOINTS
@app.get("/feedbacks/")
def get_feedbacks():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM feedbacks")
    feedbacks = cursor.fetchall()
    cursor.close()
    conn.close()
    return feedbacks

@app.post("/feedbacks/")
def create_feedback(feedback: FeedbackCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO feedbacks (ride_id, rating, comment) VALUES (%s, %s, %s)",
                       (feedback.ride_id, feedback.rating, feedback.comment))
        conn.commit()
        return {"message": "Feedback submitted successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=400, detail=str(err))
    finally:
        cursor.close()
        conn.close()

# NOTIFICATIONS ENDPOINTS
@app.get("/notifications/")
def get_notifications():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM notifications")
    notifications = cursor.fetchall()
    cursor.close()
    conn.close()
    return notifications

@app.post("/notifications/")
def create_notification(notification: NotificationCreate):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO notifications (user_id, message) VALUES (%s, %s)",
                       (notification.user_id, notification.message))
        conn.commit()
        return {"message": "Notification sent successfully"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=400, detail=str(err))
    finally:
        cursor.close()
        conn.close()
