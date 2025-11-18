import React, { useState, useEffect } from "react";
import {
  register,
  login,
  getTodos,
  createTodo,
  updateTodo,
  deleteTodo,
} from "./api";

function App() {
  const [mode, setMode] = useState("login"); // "login" or "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [todos, setTodos] = useState([]);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (token) {
      loadTodos();
    }
  }, [token]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);
    try {
      if (mode === "register") {
        await register(email, password);
        setMsg("Registered successfully. You can now log in.");
        setMode("login");
      } else {
        const res = await login(email, password);
        const t = res.data.access_token;
        localStorage.setItem("token", t);
        setToken(t);
        setMsg("Logged in successfully");
      }
    } catch (err) {
      setMsg(
        err?.response?.data?.message || "Something went wrong with auth."
      );
    } finally {
      setLoading(false);
    }
  };

  const loadTodos = async () => {
    setLoading(true);
    setMsg("");
    try {
      const res = await getTodos();
      setTodos(res.data || []);
    } catch (err) {
      setMsg("Failed to load todos. Try logging in again.");
      if (err?.response?.status === 401) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddTodo = async (e) => {
    e.preventDefault();
    if (!newTodoTitle.trim()) return;
    try {
      const res = await createTodo(newTodoTitle.trim());
      setTodos((prev) => [res.data, ...prev]);
      setNewTodoTitle("");
    } catch (err) {
      setMsg("Failed to create todo.");
    }
  };

  const handleToggleTodo = async (todo) => {
    try {
      const res = await updateTodo(todo.id, {
        completed: !todo.completed,
      });
      setTodos((prev) =>
        prev.map((t) => (t.id === todo.id ? res.data : t))
      );
    } catch {
      setMsg("Failed to update todo.");
    }
  };

  const handleDeleteTodo = async (todo) => {
    try {
      await deleteTodo(todo.id);
      setTodos((prev) => prev.filter((t) => t.id !== todo.id));
    } catch {
      setMsg("Failed to delete todo.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setTodos([]);
    setEmail("");
    setPassword("");
    setMsg("Logged out.");
  };

  if (!token) {
    return (
      <div
        style={{
          maxWidth: "400px",
          margin: "60px auto",
          padding: "24px",
          border: "1px solid #ccc",
          borderRadius: "8px",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        <h2 style={{ marginBottom: "8px" }}>
          {mode === "login" ? "Login" : "Register"}
        </h2>
        <p style={{ fontSize: "0.9rem", color: "#555" }}>
          Simple To-Do app with auth (Flask + React)
        </p>

        {msg && (
          <div style={{ marginTop: "8px", marginBottom: "8px", color: "#d00" }}>
            {msg}
          </div>
        )}

        <form onSubmit={handleAuth} style={{ marginTop: "16px" }}>
          <div style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", marginBottom: "4px" }}>
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: "100%", padding: "8px" }}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "4px" }}>
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%", padding: "8px" }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px",
              backgroundColor: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {loading
              ? "Please wait..."
              : mode === "login"
              ? "Login"
              : "Create account"}
          </button>
        </form>

        <div style={{ marginTop: "16px", fontSize: "0.9rem" }}>
          {mode === "login" ? (
            <>
              Don’t have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setMsg("");
                }}
                style={{
                  border: "none",
                  background: "none",
                  color: "#2563eb",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Register
              </button>
            </>
          ) : (
            <>
              Already registered?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setMsg("");
                }}
                style={{
                  border: "none",
                  background: "none",
                  color: "#2563eb",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Login
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // Logged in view
  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "40px auto",
        padding: "24px",
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "20px",
        }}
      >
        <h2>Your To-Dos</h2>
        <button
          onClick={handleLogout}
          style={{
            padding: "8px 12px",
            borderRadius: "4px",
            border: "1px solid #ccc",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </header>

      {msg && (
        <div style={{ marginBottom: "10px", color: "#d00" }}>{msg}</div>
      )}

      <form
        onSubmit={handleAddTodo}
        style={{ display: "flex", gap: "8px", marginBottom: "16px" }}
      >
        <input
          type="text"
          placeholder="New task..."
          value={newTodoTitle}
          onChange={(e) => setNewTodoTitle(e.target.value)}
          style={{ flex: 1, padding: "8px" }}
        />
        <button
          type="submit"
          style={{
            padding: "8px 14px",
            borderRadius: "4px",
            border: "none",
            backgroundColor: "#16a34a",
            color: "white",
            cursor: "pointer",
          }}
        >
          Add
        </button>
      </form>

      {loading && <p>Loading...</p>}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {todos.map((todo) => (
          <li
            key={todo.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 10px",
              borderBottom: "1px solid #eee",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => handleToggleTodo(todo)}
              />
              <span
                style={{
                  textDecoration: todo.completed ? "line-through" : "none",
                  color: todo.completed ? "#555" : "#111",
                }}
              >
                {todo.title}
              </span>
            </div>
            <button
              onClick={() => handleDeleteTodo(todo)}
              style={{
                border: "none",
                background: "none",
                color: "#dc2626",
                cursor: "pointer",
              }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>

      {todos.length === 0 && !loading && (
        <p style={{ marginTop: "12px", color: "#666" }}>
          No tasks yet. Add one above.
        </p>
      )}
    </div>
  );
}

export default App;
