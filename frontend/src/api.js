import axios from "axios";

const isDev = import.meta.env.DEV;

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (isDev ? "http://localhost:8060" : "https://council-ticket-system-2.onrender.com");

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

export default api;