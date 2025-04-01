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
      console.error(`Error getting rides for user ${userId}:`, error);
      throw error?.response?.data || { detail: 'Failed to fetch user rides' };
    }
  },
  
  // Update ride status
  updateRideStatus: async (rideId, status, driverId = null) => {
    try {
      // Ensure rideId is a number to prevent string concatenation issues
      const parsedRideId = parseInt(rideId, 10);
      
      console.log(`Updating ride ${parsedRideId} status to ${status}`);
      
      // Use query parameters instead of body for FastAPI endpoint
      const response = await api.put(`/rides/${parsedRideId}/status?status=${status}`);
      console.log(`Ride ${parsedRideId} status updated successfully:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`Error updating ride ${rideId} status to ${status}:`, error);
      console.error('Full error details:', error?.response?.data || error.message || error);
      throw error?.response?.data || { detail: 'Failed to update ride status' };
    }
  },
  
  // Get ride status
  getRideStatus: async (rideId) => {
    try {
      console.log(`Getting status for ride ID: ${rideId}`);
      const response = await api.get(`/rides/${rideId}/status`);
      console.log(`Ride status response:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`Error getting ride status for ID ${rideId}:`, error);
      // Return a formatted error response
      if (error.response) {
        throw error.response.data || "Failed to fetch ride status";
      } else {
        throw "Network error while fetching ride status";
      }
    }
  },
  
  // Get all drivers (added for BookRide)
  getDrivers: async () => {
    try {
      const response = await api.get('/drivers/');
      return response.data;
    } catch (error) {
      throw error?.response?.data || { detail: 'Failed to fetch drivers' };
    }
  },

  // Complete a ride
  completeRide: async (rideId) => {
    try {
      // Ensure rideId is a number
      const parsedRideId = parseInt(rideId, 10);
      
      console.log(`Completing ride ${parsedRideId}`);
      
      // Update ride status to Completed with end time
      const response = await api.put(`/rides/${parsedRideId}/status?status=Completed`);
      
      // Update localStorage for cross-browser coordination
      localStorage.setItem(`ride_${parsedRideId}_completed_status`, 'true');
      localStorage.setItem(`ride_${parsedRideId}_currentStep`, '6');
      localStorage.setItem(`ride_${parsedRideId}_update_timestamp`, Date.now().toString());
      localStorage.setItem(`ride_${parsedRideId}_completed_timestamp`, Date.now().toString());
      localStorage.setItem("trackingStep", "6"); // Update global tracking step
      
      console.log(`Ride ${parsedRideId} completed successfully and localStorage updated:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`Error completing ride ${rideId}:`, error);
      throw error?.response?.data || { detail: 'Failed to complete ride' };
    }
  },
  
  // Get detailed ride status including driver arrival and passenger pickup
  getDetailedRideStatus: async (rideId) => {
    try {
      console.log(`Getting detailed status for ride ${rideId}`);
      const response = await api.get(`/rides/${rideId}/detailed-status`);
      return response.data;
    } catch (error) {
      console.error(`Error getting detailed status for ride ${rideId}:`, error);
      throw error?.response?.data || { detail: 'Failed to get detailed ride status' };
    }
  },
  
  // Set driver arrived status
  setDriverArrived: async (rideId) => {
    try {
      console.log(`Setting driver arrived for ride ${rideId}`);
      const response = await api.put(`/rides/${rideId}/driver-arrived`);
      
      // Update localStorage for cross-browser coordination
      localStorage.setItem(`ride_${rideId}_driver_arrived_status`, 'true');
      localStorage.setItem(`driver_arrived_${rideId}`, 'true');
      localStorage.setItem(`ride_${rideId}_currentStep`, '3');
      localStorage.setItem(`ride_${rideId}_update_timestamp`, Date.now().toString());
      localStorage.setItem("trackingStep", "3"); // Update global tracking step
      
      console.log(`Driver arrived status set for ride ${rideId} and localStorage updated`);
      return response.data;
    } catch (error) {
      console.error(`Error setting driver arrived for ride ${rideId}:`, error);
      throw error?.response?.data || { detail: 'Failed to set driver arrived status' };
    }
  },
  
  // Set passenger pickup status
  setPassengerPickup: async (rideId) => {
    try {
      console.log(`Setting passenger pickup for ride ${rideId}`);
      const response = await api.put(`/rides/${rideId}/passenger-pickup`);
      
      // Update localStorage for cross-browser coordination
      localStorage.setItem(`ride_${rideId}_pickup_status`, 'true');
      localStorage.setItem(`passenger_pickup_${rideId}`, 'true');
      localStorage.setItem(`ride_${rideId}_currentStep`, '4');
      localStorage.setItem(`ride_${rideId}_update_timestamp`, Date.now().toString());
      localStorage.setItem("trackingStep", "4"); // Update global tracking step
      
      // After 2 seconds, update to en-route status
      setTimeout(() => {
        localStorage.setItem(`ride_${rideId}_enroute_status`, 'true');
        localStorage.setItem(`ride_${rideId}_currentStep`, '5');
        localStorage.setItem(`ride_${rideId}_update_timestamp`, Date.now().toString());
        localStorage.setItem("trackingStep", "5"); // Update global tracking step
      }, 2000);
      
      console.log(`Passenger pickup status set for ride ${rideId} and localStorage updated`);
      return response.data;
    } catch (error) {
      console.error(`Error setting passenger pickup for ride ${rideId}:`, error);
      throw error?.response?.data || { detail: 'Failed to set passenger pickup status' };
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

// Notification services for driver-customer interactions
export const notificationService = {
  // Get pending ride requests for a driver
  getPendingRideRequests: async (driverId) => {
    try {
      const response = await api.get(`/rides/pending/${driverId}`);
      return response.data;
    } catch (error) {
      throw error?.response?.data || { detail: 'Failed to fetch pending ride requests' };
    }
  },
  
  // Accept a ride request
  acceptRideRequest: async (rideId, driverId) => {
    try {
      console.log(`Accepting ride ${rideId} with driver ${driverId} - using accept endpoint`);
      
      // Ensure IDs are numbers
      const parsedRideId = parseInt(rideId, 10);
      const parsedDriverId = parseInt(driverId, 10);
      
      // Try to use the specific accept endpoint first
      const response = await api.put(`/rides/${parsedRideId}/accept`, { driver_id: parsedDriverId });
      console.log("Ride accepted successfully via accept endpoint:", response.data);
      return response.data;
    } catch (error) {
      console.error('Error with accept endpoint:', error?.response?.data || error.message || error);
      
      // Fallback to updating the ride status directly
      try {
        console.log(`Accepting ride ${rideId} with driver ${driverId} - using status update fallback`);
        
        // Ensure IDs are numbers
        const parsedRideId = parseInt(rideId, 10);
        
        // Use query parameters for status update
        const response = await api.put(`/rides/${parsedRideId}/status?status=Ongoing`);
        console.log("Ride accepted successfully via status update:", response.data);
        return response.data;
      } catch (fallbackError) {
        console.error('Error with fallback status update:', fallbackError?.response?.data || fallbackError.message || fallbackError);
        throw fallbackError?.response?.data || { detail: 'Failed to accept ride request' };
      }
    }
  },
  
  // Reject a ride request
  rejectRideRequest: async (rideId, driverId) => {
    try {
      console.log(`Rejecting ride ${rideId} with driver ${driverId} - using reject endpoint`);
      
      // Ensure IDs are numbers
      const parsedRideId = parseInt(rideId, 10);
      const parsedDriverId = parseInt(driverId, 10);
      
      // Try to use the specific reject endpoint first
      const response = await api.put(`/rides/${parsedRideId}/reject`, { driver_id: parsedDriverId });
      console.log("Ride rejected successfully via reject endpoint:", response.data);
      return response.data;
    } catch (error) {
      console.error('Error with reject endpoint:', error?.response?.data || error.message || error);
      
      // Fallback to updating the ride status directly
      try {
        console.log(`Rejecting ride ${rideId} with driver ${driverId} - using status update fallback`);
        
        // Ensure IDs are numbers
        const parsedRideId = parseInt(rideId, 10);
        
        // Use query parameters for status update
        const response = await api.put(`/rides/${parsedRideId}/status?status=Cancelled`);
        console.log("Ride rejected successfully via status update:", response.data);
        return response.data;
      } catch (fallbackError) {
        console.error('Error with fallback status update:', fallbackError?.response?.data || fallbackError.message || fallbackError);
        throw fallbackError?.response?.data || { detail: 'Failed to reject ride request' };
      }
    }
  },
  
  // Get ride status for a customer
  getRideStatus: async (rideId) => {
    try {
      const response = await api.get(`/rides/${rideId}/status`);
      return response.data;
    } catch (error) {
      throw error?.response?.data || { detail: 'Failed to fetch ride status' };
    }
  }
}; 