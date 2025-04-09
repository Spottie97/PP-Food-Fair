import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1",
  withCredentials: true, // Important for sending cookies
});

// Add a request interceptor (optional, for adding tokens later)
apiClient.interceptors.request.use(
  (config) => {
    // You can modify the request config here, e.g., add auth token
    // const token = localStorage.getItem('token'); // Example
    // if (token) {
    //   config.headers['Authorization'] = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor (optional, for global error handling)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle global errors, e.g., 401 Unauthorized
    if (error.response && error.response.status === 401) {
      // Handle unauthorized access, maybe redirect to login
      console.error(
        "Unauthorized access - redirecting to login might be needed"
      );
      // Example: window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
