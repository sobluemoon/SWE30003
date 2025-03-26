from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
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
app = FastAPI(title="SmartRide API", description="API for SmartRide Online Ride-Sharing Platform", version="1.0")

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

@app.get("/users/")
def get_users():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, email, role FROM users")
    users = cursor.fetchall()
    cursor.close()
    conn.close()
    return users

@app.get("/rides/")
def get_rides():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM rides")
    rides = cursor.fetchall()
    cursor.close()
    conn.close()
    return rides

@app.get("/payments/")
def get_payments():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM payments")
    payments = cursor.fetchall()
    cursor.close()
    conn.close()
    return payments

@app.get("/notifications/")
def get_notifications():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM notifications")
    notifications = cursor.fetchall()
    cursor.close()
    conn.close()
    return notifications

@app.get("/gps/")
def get_gps_data():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM gps_tracking")
    gps_data = cursor.fetchall()
    cursor.close()
    conn.close()
    return gps_data
