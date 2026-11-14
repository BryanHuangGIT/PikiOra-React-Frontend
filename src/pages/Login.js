
import React, { useState } from "react";
import {
  useNavigate,
  Link,
  useLocation,
} from "react-router-dom";

import api from "../api";
import "./Login.css";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  // Registration success message
  const successMessage = location.state?.message;

  // Login form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      // Send credentials to Django REST API
      const response = await api.post("auth/login/", {
        username,
        password,
      });

      // Avoid username variable conflict
      const {
        token,
        role,
        username: returnedUsername,
      } = response.data;

      if (!token) {
        throw new Error(
          "No authentication token returned."
        );
      }

      if (!["admin", "doctor", "patient"].includes(role)) {
        throw new Error(
          "Unknown account role returned by the server."
        );
      }

      // Save authentication information
      sessionStorage.setItem("token", token);
      sessionStorage.setItem("role", role);
      sessionStorage.setItem(
        "username",
        returnedUsername || username
      );

      // Redirect according to user role
      if (role === "admin") {
        navigate("/admin/dashboard", {
          replace: true,
        });
      } else if (role === "doctor") {
        navigate("/doctor/dashboard", {
          replace: true,
        });
      } else if (role === "patient") {
        navigate("/patient/dashboard", {
          replace: true,
        });
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

        {/* Logo */}
        <div className="login-logo">+</div>

        {/* Page title */}
        <h1>Piki Ora Medical Centre</h1>

        <p className="login-subtitle">
          Sign in to your account
        </p>

        {/* Registration success message */}
        {successMessage && (
          <p
            role="status"
            style={{
              background: "#ecfdf5",
              color: "#065f46",
              padding: "12px",
              borderRadius: "8px",
              marginBottom: "20px",
              textAlign: "center",
              fontWeight: "500",
            }}
          >
            {successMessage}
          </p>
        )}

        {/* Login form */}
        <form onSubmit={handleLogin}>

          {/* Username */}
          <label htmlFor="username">
            Username
          </label>

          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) =>
              setUsername(e.target.value)
            }
            placeholder="Enter your username"
            autoComplete="username"
            required
          />

          {/* Password */}
          <label htmlFor="password">
            Password
          </label>

          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />

          {/* Login error */}
          {error && (
            <p
              className="login-error"
              role="alert"
            >
              {error}
            </p>
          )}

          {/* Login button */}
          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Signing in..."
              : "Sign In"}
          </button>

        </form>

        {/* Registration link */}
        <p className="login-footer">
          Don't have an account?{" "}
          <Link to="/register">
            Register
          </Link>
        </p>

      </div>
    </div>
  );
}

export default Login;
