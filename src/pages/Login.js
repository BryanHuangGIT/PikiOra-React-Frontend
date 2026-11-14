
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("auth/login/", {
        username,
        password,
      });

      const { token, role } = response.data;

      if (!token) {
        throw new Error("No authentication token returned.");
      }

      sessionStorage.setItem("token", token);
      sessionStorage.setItem("role", role || "");

      if (role === "admin") {
        navigate("/admin/dashboard", { replace: true });
      } else if (role === "doctor") {
        navigate("/doctor/dashboard", { replace: true });
      } else {
        navigate("/patient/dashboard", { replace: true });
      }
    } catch (err) {
      console.error("Login failed:", err);
      setError(
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.message ||
        "Login failed. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">+</div>
        <h1>Piki Ora Medical Centre</h1>
        <p className="login-subtitle">Sign in to your account</p>

        <form onSubmit={handleLogin}>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            autoComplete="username"
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />

          {error && <p className="login-error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="login-footer">
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
