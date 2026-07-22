import axios from "axios";

export const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true, // Crucial for sending cookies
});

// Response interceptor
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle global errors like 401 Unauthorized here if needed
        return Promise.reject(error);
    }
);
