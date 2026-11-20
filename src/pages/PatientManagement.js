import React, { useState } from "react";
import api from "../api";
import "./PatientManagement.css";

const emptyForm = {
  username: "",
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  date_of_birth: "",
  password: "",
};

function getErrorMessage(error) {
  const data = error.response?.data;

  if (!data) {
    return "Unable to connect to the Django server.";
  }

  if (typeof data === "string") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(String).join(" ");
  }

  const flatten = (value, field = "") => {
    if (Array.isArray(value)) {
      return value.map(String).join(", ");
    }

    if (value && typeof value === "object") {
      return Object.entries(value)
        .map(([key, item]) => {
          const label = field ? `${field}.${key}` : key;
          return flatten(item, label);
        })
        .join(" ");
    }

    return field ? `${field}: ${String(value)}` : String(value);
  };

  return flatten(data);
}

function PatientManagement({ patients, onRefresh }) {
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const filteredPatients = patients.filter((patient) => {
    const searchable = [
      patient.id,
      patient.user?.username,
      patient.user?.first_name,
      patient.user?.last_name,
      patient.user?.email,
      patient.phone,
    ]
      .filter((value) => value !== undefined && value !== null)
      .join(" ")
      .toLowerCase();

    const active = patient.user?.is_active !== false;

    const matchesSearch = searchable.includes(
      search.trim().toLowerCase()
    );

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && active) ||
      (statusFilter === "inactive" && !active);

    return matchesSearch && matchesStatus;
  });

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(false);
  };

  const startEditing = (patient) => {
    setError("");
    setMessage("");

    setEditingId(patient.id);

    setForm({
      username: patient.user?.username || "",
      first_name: patient.user?.first_name || "",
      last_name: patient.user?.last_name || "",
      email: patient.user?.email || "",
      phone: patient.phone || "",
      date_of_birth: patient.date_of_birth || "",
      password: "",
    });

    setShowForm(true);
  };

  const updateField = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
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

      // Leave password unchanged unless the administrator enters a new one.
      if (form.password.trim()) {
        userData.password = form.password;
      }

      const payload = {
        user: userData,
        phone: form.phone.trim(),
        date_of_birth: form.date_of_birth || null,
      };

      await api.patch(
        `admin/patients/${editingId}/`,
        payload
      );

      resetForm();
      await onRefresh();

      setMessage("Patient profile updated successfully.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const changeAccountStatus = async (patient) => {
    const currentlyActive = patient.user?.is_active !== false;

    const action = currentlyActive ? "deactivate" : "reactivate";

    const username =
      patient.user?.username || `Patient #${patient.id}`;

    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${username}?`
    );

    if (!confirmed) {
      return;
    }

    setBusyId(patient.id);
    setError("");
    setMessage("");

    try {
      await api.patch(
        `admin/patients/${patient.id}/`,
        {
          user: {
            is_active: !currentlyActive,
          },
        }
      );

      await onRefresh();

      setMessage(
        currentlyActive
          ? "Patient account deactivated successfully."
          : "Patient account reactivated successfully."
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const getFullName = (patient) => {
    const name = [
      patient.user?.first_name,
      patient.user?.last_name,
    ]
      .filter(Boolean)
      .join(" ");

    return name || "N/A";
  };

  return (
    <div className="patient-management">
      <div className="patient-management-heading">
        <div>
          <h2>Patient Management</h2>
          <p className="admin-description">
            View, edit, deactivate and reactivate patient accounts.
          </p>
        </div>

        <span className="patient-count">
          {filteredPatients.length} patients
        </span>
      </div>

      {message && (
        <div className="patient-success" role="status">
          {message}
        </div>
      )}

      {error && (
        <div className="patient-error" role="alert">
          {error}
        </div>
      )}

      <div className="patient-filters">
        <label>
          Search patients
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, username, email or ID"
          />
        </label>

        <label>
          Account status
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All accounts</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
      </div>

      {showForm && (
        <div className="patient-form-panel">
          <h3>Edit Patient #{editingId}</h3>

          <form onSubmit={handleSubmit}>
            <div className="patient-form-grid">
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
                New Password (optional)
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={updateField}
                  autoComplete="new-password"
                />
              </label>

              <label>
                First Name
                <input
                  name="first_name"
                  value={form.first_name}
                  onChange={updateField}
                />
              </label>

              <label>
                Last Name
                <input
                  name="last_name"
                  value={form.last_name}
                  onChange={updateField}
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
                Phone
                <input
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={updateField}
                />
              </label>

              <label>
                Date of Birth
                <input
                  name="date_of_birth"
                  type="date"
                  value={form.date_of_birth}
                  onChange={updateField}
                />
              </label>
            </div>

            <p className="patient-form-hint">
              Leave the password blank to keep the current password.
              Changing a password may require the patient to log in again.
            </p>

            <div className="patient-form-actions">
              <button
                type="submit"
                className="patient-primary-button"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>

              <button
                type="button"
                className="patient-secondary-button"
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
              <th>Name</th>
              <th>Username</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Date of Birth</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredPatients.length === 0 ? (
              <tr>
                <td colSpan="8">No patients found.</td>
              </tr>
            ) : (
              filteredPatients.map((patient) => {
                const active = patient.user?.is_active !== false;

                return (
                  <tr key={patient.id}>
                    <td>{patient.id}</td>
                    <td>{getFullName(patient)}</td>
                    <td>{patient.user?.username || "N/A"}</td>
                    <td>{patient.user?.email || "N/A"}</td>
                    <td>{patient.phone || "N/A"}</td>
                    <td>{patient.date_of_birth || "N/A"}</td>

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
                      <div className="patient-row-actions">
                        <button
                          type="button"
                          className="patient-edit-button"
                          onClick={() => startEditing(patient)}
                          disabled={saving || busyId !== null}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className={
                            active
                              ? "patient-deactivate-button"
                              : "patient-reactivate-button"
                          }
                          onClick={() => changeAccountStatus(patient)}
                          disabled={saving || busyId !== null}
                        >
                          {busyId === patient.id
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
        Patient accounts with Pending or Confirmed appointments
        cannot be deactivated until those bookings are resolved.
        Deactivation preserves appointment history.
      </p>
    </div>
  );
}

export default PatientManagement;