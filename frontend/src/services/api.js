import axios from 'axios';

const API_URL = 'http://localhost:8000';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// User services
export const userService = {
  // Register user
  register: async (userData) => {
    try {
      const response = await api.post('/users/', userData);
      return response.data;
    } catch (error) {
      throw error?.response?.data || { detail: 'Registration failed' };
    }
  },
  
  // Get all users
  getUsers: async () => {
    try {
      const response = await api.get('/users/');
      return response.data;
    } catch (error) {
      throw error?.response?.data || { detail: 'Failed to fetch users' };
    }
  },

  // Get user by ID
  getUserById: async (userId) => {
    try {
      const response = await api.get(`/users/${userId}`);
      return response.data;
    } catch (error) {
      throw error?.response?.data || { detail: 'Failed to fetch user' };
    }
  }
};

// Ride services
export const rideService = {
  // Create a new ride
  createRide: async (rideData) => {
    try {
      const response = await api.post('/rides/', rideData);
      return response.data;
    } catch (error) {
      throw error?.response?.data || { detail: 'Failed to create ride' };
    }
  },
  
  // Get all rides
  getRides: async () => {
    try {
      const response = await api.get('/rides/');
      return response.data;
    } catch (error) {
      throw error?.response?.data || { detail: 'Failed to fetch rides' };
    }
  },
  
  // Get user rides
  getUserRides: async (userId, role) => {
    try {
      const response = await api.get(`/rides/user/${userId}?role=${role}`);
      return response.data;
    } catch (error) {
      throw error?.response?.data || { detail: 'Failed to fetch user rides' };
    }
  },
  
  // Update ride status
  updateRideStatus: async (rideId, status) => {
    try {
      const response = await api.put(`/rides/${rideId}/status`, { status });
      return response.data;
    } catch (error) {
      throw error?.response?.data || { detail: 'Failed to update ride status' };
    }
  }
};

// Driver services
export const driverService = {
  // Get available drivers
  getAvailableDrivers: async () => {
    try {
      const response = await api.get('/drivers/available');
      return response.data;
    } catch (error) {
      throw error?.response?.data || { detail: 'Failed to fetch available drivers' };
    }
  }
};

// Vehicle services
export const vehicleService = {
  // Get all vehicles
  getVehicles: async () => {
    try {
      const response = await api.get('/vehicles/');
      return response.data;
    } catch (error) {
      throw error?.response?.data || { detail: 'Failed to fetch vehicles' };
    }
  }
};

// Feedback services
export const feedbackService = {
  // Submit feedback
  submitFeedback: async (feedbackData) => {
    try {
      const response = await api.post('/feedbacks/', feedbackData);
      return response.data;
    } catch (error) {
      throw error?.response?.data || { detail: 'Failed to submit feedback' };
    }
  },
  
  // Get all feedbacks
  getFeedbacks: async () => {
    try {
      const response = await api.get('/feedbacks/');
      return response.data;
    } catch (error) {
      throw error?.response?.data || { detail: 'Failed to fetch feedbacks' };
    }
  }
};

// GPS tracking services
export const gpsService = {
  // Update GPS location
  updateGPSLocation: async (gpsData) => {
    try {
      const response = await api.post('/gps/', gpsData);
      return response.data;
    } catch (error) {
      throw error?.response?.data || { detail: 'Failed to update GPS location' };
    }
  },
  
  // Get GPS tracking data
  getGPSTracking: async () => {
    try {
      const response = await api.get('/gps/');
      return response.data;
    } catch (error) {
      throw error?.response?.data || { detail: 'Failed to fetch GPS tracking data' };
    }
  }
}; 