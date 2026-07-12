import axios from 'axios'

const api = axios.create({
    baseURL: 'https://attendance-system-t1rk.onrender.com/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

// Attach token to every request
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Catch 401 — token expired or invalid (but NOT a failed login attempt)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const isLoginRequest = error.config?.url?.includes('/auth/login');

        if (error.response?.status === 401 && !isLoginRequest) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);


export default api;