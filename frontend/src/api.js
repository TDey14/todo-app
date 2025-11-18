import axios from "axios";

// Backend base URL: change for Azure
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Attach token if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const register = (email, password) =>
  api.post("/register", { email, password });

export const login = (email, password) =>
  api.post("/login", { email, password });

export const getTodos = () => api.get("/todos");

export const createTodo = (title) => api.post("/todos", { title });

export const updateTodo = (id, payload) => api.put(`/todos/${id}`, payload);

export const deleteTodo = (id) => api.delete(`/todos/${id}`);
