-- Create Database
CREATE DATABASE smartride;
USE smartride;

-- Users Table (Parent Table)
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('customer', 'driver', 'admin') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers Table (Extends Users)
CREATE TABLE customers (
    customer_id INT PRIMARY KEY,
    FOREIGN KEY (customer_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Drivers Table (Extends Users)
CREATE TABLE drivers (
    driver_id INT PRIMARY KEY,
    availability BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (driver_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Administrators Table (Extends Users)
CREATE TABLE administrators (
    admin_id INT PRIMARY KEY,
    FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Vehicles Table
CREATE TABLE vehicles (
    vehicle_id INT AUTO_INCREMENT PRIMARY KEY,
    driver_id INT UNIQUE NOT NULL,
    type ENUM('Car', 'Bike', 'SUV') NOT NULL,
    plate_number VARCHAR(20) UNIQUE NOT NULL,
    FOREIGN KEY (driver_id) REFERENCES drivers(driver_id) ON DELETE CASCADE
);

-- Rides Table
CREATE TABLE rides (
    ride_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    driver_id INT NOT NULL,
    pickup_location VARCHAR(255) NOT NULL,
    dropoff_location VARCHAR(255) NOT NULL,
    status ENUM('Pending', 'Ongoing', 'Completed', 'Cancelled') DEFAULT 'Pending',
    fare FLOAT DEFAULT NULL,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE,
    FOREIGN KEY (driver_id) REFERENCES drivers(driver_id) ON DELETE CASCADE
);

-- Payments Table
CREATE TABLE payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    ride_id INT UNIQUE NOT NULL,
    amount FLOAT NOT NULL,
    status ENUM('Pending', 'Completed', 'Failed') DEFAULT 'Pending',
    payment_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ride_id) REFERENCES rides(ride_id) ON DELETE CASCADE
);

-- Feedbacks Table
CREATE TABLE feedbacks (
    feedback_id INT AUTO_INCREMENT PRIMARY KEY,
    ride_id INT UNIQUE NOT NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    feedback_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ride_id) REFERENCES rides(ride_id) ON DELETE CASCADE
);

-- Notifications Table
CREATE TABLE notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- GPS Tracking Table
CREATE TABLE gps_tracking (
    tracking_id INT AUTO_INCREMENT PRIMARY KEY,
    ride_id INT UNIQUE NOT NULL,
    eta INT NOT NULL COMMENT 'Estimated time of arrival in minutes',
    gps_image VARCHAR(255) COMMENT 'URL to GPS image',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (ride_id) REFERENCES rides(ride_id) ON DELETE CASCADE
);

-- Insert Users (Ensure IDs Match)
INSERT INTO users (email, password_hash, role) VALUES 
('customer1@example.com', 'hashed_password_1', 'customer'),
('customer2@example.com', 'hashed_password_2', 'customer'),
('customer3@example.com', 'hashed_password_3', 'customer'),
('driver1@example.com', 'hashed_password_4', 'driver'),
('driver2@example.com', 'hashed_password_5', 'driver'),
('driver3@example.com', 'hashed_password_6', 'driver'),
('admin1@example.com', 'hashed_password_7', 'admin'),
('admin2@example.com', 'hashed_password_8', 'admin');

-- Assign Customers, Drivers, Admins (Use Correct User IDs)
INSERT INTO customers (customer_id) VALUES (1), (2), (3);
INSERT INTO drivers (driver_id) VALUES (4), (5), (6);
INSERT INTO administrators (admin_id) VALUES (7), (8);

-- Insert Vehicles
INSERT INTO vehicles (driver_id, type, plate_number) VALUES 
(4, 'Car', 'ABC-123'),
(5, 'Bike', 'XYZ-456'),
(6, 'SUV', 'LMN-789');

-- Insert Rides
INSERT INTO rides (customer_id, driver_id, pickup_location, dropoff_location, status, fare, start_time, end_time) 
VALUES 
(1, 4, 'Location A', 'Location B', 'Completed', 10.5, NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 1 DAY),
(2, 5, 'Location C', 'Location D', 'Ongoing', NULL, NOW(), NULL),
(3, 6, 'Location E', 'Location F', 'Pending', NULL, NULL, NULL);

-- Insert Payments
INSERT INTO payments (ride_id, amount, status, payment_time) VALUES 
(1, 10.5, 'Completed', NOW() - INTERVAL 1 DAY);

-- Insert Feedbacks
INSERT INTO feedbacks (ride_id, rating, comment, feedback_time) VALUES 
(1, 5, 'Great ride!', NOW() - INTERVAL 1 DAY);

-- Insert Notifications
INSERT INTO notifications (user_id, message, is_read, created_at) VALUES
(1, 'Your ride is confirmed!', FALSE, NOW()),
(2, 'Your driver is arriving soon.', FALSE, NOW()),
(3, 'Your ride request is still pending.', TRUE, NOW() - INTERVAL 1 HOUR),
(4, 'New ride request received.', FALSE, NOW());

-- Insert GPS Tracking Data
INSERT INTO gps_tracking (ride_id, eta, gps_image, updated_at) 
VALUES 
(1, 15, 'https://example.com/gps1.png', NOW() - INTERVAL 1 DAY),
(2, 10, 'https://example.com/gps2.png', NOW()),
(3, 20, 'https://example.com/gps3.png', NOW());
