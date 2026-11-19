import React, { useState } from "react";
import api from "../api";
import "./DoctorManagement.css";

const emptyForm = {
  username: "",
  password: "",
  first_name: "",
  last_name: "",
  email: "",
  specialization: "",
  phone: "",
  approved: true,
};

function getErrorMessage(error) {
  const data = error.response?.data;

  if (!data) {
    return "Unable to connect to the server.";
  }

  if (typeof data === "string") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.join(" ");
  }

  if (typeof data === "object") {
    return Object.entries(data)
      .map(([field, value]) => {
        if (typeof value === "object" && !Array.isArray(value)) {
          return Object.entries(value)
            .map(([nestedField, messages]) =>
              `${nestedField}: ${[].concat(messages).join(", ")}`
            )
            .join(" ");
        }

        return `${field}: ${[].concat(value).join(", ")}`;
      })
      .join(" ");
  }

  return "The request could not be completed.";
}

function DoctorManagement({ doctors, onRefresh }) {
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const startAdding = () => {
    setMessage("");
    setError("");
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const startEditing = (doctor) => {
    setMessage("");
    setError("");

    setForm({
      username: doctor.user?.username || "",
      password: "",
      first_name: doctor.user?.first_name || "",
      last_name: doctor.user?.last_name || "",
      email: doctor.user?.email || "",
      specialization: doctor.specialization || "",
      phone: doctor.phone || "",
      approved: Boolean(doctor.approved),
    });

    setEditingId(doctor.id);
    setShowForm(true);
  };

  const updateField = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const userData = {
        username: form.username.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
      };

      // Password is required for new doctors.
      // For editing, leaving it blank keeps the existing password.
      if (form.password) {
        userData.password = form.password;
      }

      const payload = {
        user: userData,
        specialization: form.specialization.trim(),
        phone: form.phone.trim(),
        approved: form.approved,
      };

      if (editingId === null) {
        await api.post("admin/doctors/", payload);
        setMessage("Doctor account created successfully.");
      } else {
        await api.patch(`admin/doctors/${editingId}/`, payload);
        setMessage("Doctor profile updated successfully.");
      }

      resetForm();
      await onRefresh();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const changeAccountStatus = async (doctor) => {
    const currentlyActive = doctor.user?.is_active !== false;
    const action = currentlyActive ? "deactivate" : "reactivate";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} ` +
      `${doctor.user?.username || "this doctor"}?`
    );

    if (!confirmed) {
      return;
    }

    setBusyId(doctor.id);
    setError("");
    setMessage("");

    try {
      const payload = currentlyActive
        ? {
            user: { is_active: false },
            approved: false,
          }
        : {
            user: { is_active: true },
            approved: true,
          };

      await api.patch(`admin/doctors/${doctor.id}/`, payload);

      setMessage(
        currentlyActive
          ? "Doctor account deactivated successfully."
          : "Doctor account reactivated successfully."
      );

      await onRefresh();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="doctor-management">
      <div className="doctor-management-heading">
        <div>
          <h2>Doctor Management</h2>
          <p className="admin-description">
            Add, edit, deactivate and reactivate doctor accounts.
          </p>
        </div>

        <button
          className="doctor-primary-button"
          onClick={startAdding}
          type="button"
        >
          + Add Doctor
        </button>
      </div>

      {message && (
        <div className="doctor-success" role="status">
          {message}
        </div>
      )}

      {error && (
        <div className="doctor-error" role="alert">
          {error}
        </div>
      )}

      {showForm && (
        <div className="doctor-form-panel">
          <h3>
            {editingId === null ? "Add New Doctor" : "Edit Doctor"}
          </h3>

          <form onSubmit={handleSubmit}>
            <div className="doctor-form-grid">
              <label>
                Username *
                <input
                  name="username"
                  value={form.username}
                  onChange={updateField}
                  required
                />
              </label>

              <label>
                {editingId === null
                  ? "Password *"
                  : "New Password (optional)"}
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={updateField}
                  required={editingId === null}
                  autoComplete="new-password"
                />
              </label>

              <label>
                First Name *
                <input
                  name="first_name"
                  value={form.first_name}
                  onChange={updateField}
                  required
                />
              </label>

              <label>
                Last Name *
                <input
                  name="last_name"
                  value={form.last_name}
                  onChange={updateField}
                  required
                />
              </label>

              <label>
                Email
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={updateField}
                />
              </label>

              <label>
                Specialization *
                <input
                  name="specialization"
                  value={form.specialization}
                  onChange={updateField}
                  placeholder="e.g. Cardiology"
                  required
                />
              </label>

              <label>
                Phone *
                <input
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={updateField}
                  required
                />
              </label>
            </div>

            <label className="doctor-checkbox-label">
              <input
                type="checkbox"
                name="approved"
                checked={form.approved}
                onChange={updateField}
              />
              Approved to accept appointments
            </label>

            {editingId !== null && (
              <p className="doctor-form-hint">
                Leave the password blank to keep the current password.
                Changing a password may require the doctor to log in again.
              </p>
            )}

            <div className="doctor-form-actions">
              <button
                type="submit"
                className="doctor-primary-button"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId === null
                  ? "Create Doctor"
                  : "Save Changes"}
              </button>

              <button
                type="button"
                className="doctor-secondary-button"
                onClick={resetForm}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Doctor</th>
              <th>Username</th>
              <th>Specialization</th>
              <th>Phone</th>
              <th>Approval</th>
              <th>Account</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {doctors.length === 0 ? (
              <tr>
                <td colSpan="8">No doctors found.</td>
              </tr>
            ) : (
              doctors.map((doctor) => {
                const active = doctor.user?.is_active !== false;

                return (
                  <tr key={doctor.id}>
                    <td>{doctor.id}</td>

                    <td>
                      {[
                        doctor.user?.first_name,
                        doctor.user?.last_name,
                      ]
                        .filter(Boolean)
                        .join(" ") || "N/A"}
                    </td>

                    <td>{doctor.user?.username || "N/A"}</td>

                    <td>{doctor.specialization || "N/A"}</td>

                    <td>{doctor.phone || "N/A"}</td>

                    <td>
                      <span
                        className={
                          doctor.approved
                            ? "admin-status approved"
                            : "admin-status not-approved"
                        }
                      >
                        {doctor.approved ? "Approved" : "Not Approved"}
                      </span>
                    </td>

                    <td>
                      <span
                        className={
                          active
                            ? "admin-status approved"
                            : "admin-status not-approved"
                        }
                      >
                        {active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td>
                      <div className="doctor-row-actions">
                        <button
                          type="button"
                          className="doctor-edit-button"
                          onClick={() => startEditing(doctor)}
                          disabled={busyId !== null || saving}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className={
                            active
                              ? "doctor-deactivate-button"
                              : "doctor-reactivate-button"
                          }
                          onClick={() => changeAccountStatus(doctor)}
                          disabled={busyId !== null || saving}
                        >
                          {busyId === doctor.id
                            ? "Updating..."
                            : active
                            ? "Deactivate"
                            : "Reactivate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="admin-note">
        Doctors with pending or confirmed appointments cannot be
        deactivated until those bookings are resolved.
      </p>
    </div>
  );
}

export default DoctorManagement;