import React, { createContext, useState, useEffect, useContext } from 'react';
import apiClient from '../services/api';
import { jwtDecode } from 'jwt-decode'; // Simple JWT decoder

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token')); // Check local storage initially
  const [isLoading, setIsLoading] = useState(true); // Track initial auth check

  useEffect(() => {
    // Function to verify token and fetch user data on initial load or token change
    const verifyUser = async () => {
      if (token) {
        try {
          // Decode token to check expiry (optional but good practice)
          const decoded = jwtDecode(token);
          const currentTime = Date.now() / 1000;
          if (decoded.exp < currentTime) {
            console.log('Token expired');
            logout(); // Clear expired token
            return;
          }

          // Set token in api client headers
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          localStorage.setItem('token', token); // Keep token in local storage

          // Fetch user details from /me endpoint
          const response = await apiClient.get('/auth/me');
          if (response.data.success) {
            setUser(response.data.data);
          } else {
            // If /me fails (e.g., token valid but user deleted), logout
            logout();
          }
        } catch (error) {
          console.error('Auth verification failed:', error);
          logout(); // Clear invalid token
        }
      } else {
        // No token found, ensure user is logged out
        delete apiClient.defaults.headers.common['Authorization'];
        localStorage.removeItem('token');
        setUser(null);
      }
      setIsLoading(false);
    };

    verifyUser();
  }, [token]); // Re-run when token changes

  const login = async (email, password) => {
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      if (response.data.success) {
        setToken(response.data.token);
        // User state will be updated by the useEffect hook
        return true;
      } else {
        // Let the caller handle specific error messages from response
        return response.data.message || 'Login failed';
      }
    } catch (error) {
      console.error('Login error:', error.response?.data?.message || error.message);
      return error.response?.data?.message || 'An error occurred during login.';
    }
  };

  const register = async (username, email, password) => {
    try {
      // We just call the API here. The response doesn't include a token.
      const response = await apiClient.post('/auth/register', { username, email, password });
      if (response.data.success) {
        // Return success status and message
        return { success: true, message: response.data.message };
      } else {
        // Return failure status and message
        return { success: false, message: response.data.message || 'Registration failed' };
      }
    } catch (error) {
      console.error('Registration error:', error.response?.data?.message || error.message);
      // Return failure status and error message
      return { success: false, message: error.response?.data?.message || 'An error occurred during registration.' };
    }
  };

  const logout = () => {
    setToken(null);
    // User state and local storage/headers are cleared by the useEffect hook
    // Optionally call backend logout endpoint to invalidate cookie server-side (if needed)
    apiClient.get('/auth/logout').catch(err => console.error('Logout API call failed:', err));
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isLoading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the AuthContext
export const useAuth = () => {
  return useContext(AuthContext);
}; 