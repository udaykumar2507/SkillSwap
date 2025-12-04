import axios from 'axios';

const api = axios.create({
  baseURL: 'https://skillswap-u8kg.onrender.com', // change later if needed
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ss_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
