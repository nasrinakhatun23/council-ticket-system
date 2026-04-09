import axios from "axios";

const isDev = import.meta.env.DEV;

// API_BASE_URL priority:
// 1. VITE_API_BASE_URL env var (set in .env.local or Vercel)
// 2. Fallback: localhost in dev, Render in production
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (isDev
    ? "http://localhost:8000"
    : "https://council-ticket-system.onrender.com");

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 10000,
});

// Log API base URL in dev for debugging
if (isDev) {
  console.log("[API] Using base URL:", API_BASE_URL);
}

export default api;