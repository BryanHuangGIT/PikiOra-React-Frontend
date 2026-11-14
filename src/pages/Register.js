import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import "./Register.css";

const initialForm = {
  first_name: "",
  last_name: "",
  username: "",
  email: "",
  phone: "",
  date_of_birth: "",
  password: "",
  confirm_password: "",
};

function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirm_password) {
      setError("Passwords do not match.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      // Confirm password is frontend-only.
      // Django receives only the expected registration fields.
      const {
        confirm_password,
        ...registrationData
      } = form;

      await api.post("auth/register/", registrationData);

      navigate("/login", {
        replace: true,
        state: {
          message:
            "Registration successful! Please sign in with your new account.",
        },
      });
    } catch (err) {
      console.error("Registration failed:", err);

      const data = err.response?.data;

      if (data && typeof data === "object") {
        const messages = Object.entries(data).map(
          ([field, value]) =>
            `${field}: ${
              Array.isArray(value)
                ? value.join(", ")
                : String(value)
            }`
        );

        setError(messages.join(" | "));
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-card">
        <div className="register-logo">+</div>

        <h1>Piki Ora Medical Centre</h1>
        <p className="register-subtitle">
          Create your patient account
        </p>

        <form onSubmit={handleSubmit}>
          <div className="register-grid">
            <div className="register-field">
              <label htmlFor="first_name">First Name</label>
              <input
                id="first_name"
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="register-field">
              <label htmlFor="last_name">Last Name</label>
              <input
                id="last_name"
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="register-field">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                name="username"
                value={form.username}
                onChange={handleChange}
                autoComplete="username"
                required
              />
            </div>

            <div className="register-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />
            </div>

            <div className="register-field">
              <label htmlFor="phone">Phone Number</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                autoComplete="tel"
                required
              />
            </div>

            <div className="register-field">
              <label htmlFor="date_of_birth">
                Date of Birth
              </label>
              <input
                id="date_of_birth"
                name="date_of_birth"
                type="date"
                value={form.date_of_birth}
                onChange={handleChange}
                max={new Date().toLocaleDateString("en-CA")}
              />
            </div>

            <div className="register-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>

            <div className="register-field">
              <label htmlFor="confirm_password">
                Confirm Password
              </label>
              <input
                id="confirm_password"
                name="confirm_password"
                type="password"
                value={form.confirm_password}
                onChange={handleChange}
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          {error && (
            <p className="register-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p className="register-footer">
          Already have an account?{" "}
          <Link to="/login">Sign In</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
