import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000', // change later if needed
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ss_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
