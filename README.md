SWE30003
Github for SWE30003 Course

Deployment Instructions

Prerequisites

- Python 3.8+
- Node.js 14+ and npm
- XAMPP (for Apache and MySQL)
- Git

Backend Deployment

Set up XAMPP and MySQL


# Start XAMPP Control Panel and start Apache and MySQL services with:

    "host": "localhost",
    "user": "root",
    "password": ""

# Create database using phpMyAdmin:
# 1. Open http://localhost/phpmyadmin/
# 2. Paste the content of SmartRide.sql in to SQL Query and initiate


**Set up the backend environment**

# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

**Run the backend server**

# Start the FastAPI server 
uvicorn main:app --reload

The backend API will be accessible at `http://localhost:8000`


**Set up the frontend environment**

# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Configure API endpoint
# Create .env file with:
REACT_APP_API_URL=http://localhost:8000

# Start development server
npm start
```

The frontend will be accessible at `http://localhost:3000`



Troubleshooting

- Backend not starting: Check the Python environment and ensure all dependencies are installed
- Database connection issues: Verify XAMPP services are running and credentials in .env file are correct
- Frontend API connection failures: Ensure the API URL is correctly set in the frontend environment

Maintenance


Update backend dependencies
pip install -r requirements.txt --upgrade

Update frontend dependencies
npm update

