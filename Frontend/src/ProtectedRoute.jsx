import { Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useState, useEffect } from 'react';

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null for loading, true/false for result
  const token = localStorage.getItem('token');
  useEffect(() => {
    const checkAuth = async () => {
      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      try {
        const response = await axios.get('http://localhost:4000/auth/home', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.data.success) {
          const user = response.data.data.user;

          // Store user details one by one in localStorage
          localStorage.setItem("user_id", user._id);
          localStorage.setItem("attuid", user.attuid);
          localStorage.setItem("businessUnit", user.businessUnit);
          localStorage.setItem("email", user.email);
          localStorage.setItem("firstname", user.firstname);
          localStorage.setItem("lastname", user.lastname);
          localStorage.setItem("jobTitle", user.jobTitle);
          localStorage.setItem("manager", user.manager);
          localStorage.setItem("role", user.role);
          localStorage.setItem("shift", user.shift);
          localStorage.setItem("isVerified", user.isVerified ? "true" : "false");

          // Store extra fields
          localStorage.setItem("welcomeMessage", response.data.data.welcomeMessage);
          localStorage.setItem("timestamp", response.data.data.timestamp);

          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Authentication failed:', error.response?.data?.message || error.message);
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, [token]); // Re-run if token changes

  // Handle loading state
  if (isAuthenticated === null) {
    return <div>Loading...</div>; // Optional: Add a loading spinner
  }

  // Render based on authentication status
  if (isAuthenticated === false) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return children;
};

export default ProtectedRoute;
