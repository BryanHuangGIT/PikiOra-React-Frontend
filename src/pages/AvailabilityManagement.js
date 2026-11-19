import React, { useState } from "react";
import api from "../api";
import "./AvailabilityManagement.css";

const emptyForm = {
  doctor: "",
  date: "",
  start_time: "09:00",
  end_time: "12:00",
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
        if (Array.isArray(value)) {
          return `${field}: ${value.join(", ")}`;
        }

        return `${field}: ${JSON.stringify(value)}`;
      })
      .join(" ");
  }

  return "The request could not be completed.";
}

function getLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function AvailabilityManagement({
  availability,
  doctors,
  onRefresh,
}) {
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const today = getLocalDateString(new Date());

  const approvedDoctors = doctors.filter(
    (doctor) =>
      doctor.approved === true &&
      doctor.user?.is_active !== false
  );

  const sortedAvailability = [...availability].sort((a, b) => {
    const first = `${a.date} ${a.start_time}`;
    const second = `${b.date} ${b.start_time}`;

    return first.localeCompare(second);
  });

  const getDoctorName = (doctorId) => {
    const doctor = doctors.find(
      (item) => item.id === Number(doctorId)
    );

    if (!doctor) {
      return `Doctor #${doctorId}`;
    }

    const fullName = [
      doctor.user?.first_name,
      doctor.user?.last_name,
    ]
      .filter(Boolean)
      .join(" ");

    return fullName || doctor.user?.username || `Doctor #${doctorId}`;
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const startAdding = () => {
    setError("");
    setMessage("");
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
  };

  const startEditing = (slot) => {
    setError("");
    setMessage("");

    setForm({
      doctor: String(slot.doctor),
      date: slot.date,
      start_time: slot.start_time.slice(0, 5),
      end_time: slot.end_time.slice(0, 5),
    });

    setEditingId(slot.id);
    setShowForm(true);
  };

  const updateField = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!form.doctor) {
      return "Please select a doctor.";
    }

    if (!form.date) {
      return "Please select a consultation date.";
    }

    if (form.date < today) {
      return "The consultation date cannot be in the past.";
    }

    const selectedDate = new Date(`${form.date}T12:00:00`);
    const day = selectedDate.getDay();

    if (day === 0 || day === 6) {
      return "Consultation schedules must be Monday to Friday.";
    }

    if (
      form.start_time < "09:00" ||
      form.end_time > "17:00"
    ) {
      return "Consultation hours must be between 9 AM and 5 PM.";
    }

    if (form.start_time >= form.end_time) {
      return "The end time must be later than the start time.";
    }

    const alignedToHalfHour = (time) => {
      const [hours, minutes] = time.split(":").map(Number);

      return (
        Number.isInteger(hours) &&
        (minutes === 0 || minutes === 30)
      );
    };

    if (
      !alignedToHalfHour(form.start_time) ||
      !alignedToHalfHour(form.end_time)
    ) {
      return "Consultation times must use 30-minute intervals.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        doctor: Number(form.doctor),
        date: form.date,
        start_time: `${form.start_time}:00`,
        end_time: `${form.end_time}:00`,
      };

      if (editingId === null) {
        await api.post("admin/availability/", payload);
        setMessage("Consultation schedule created successfully.");
      } else {
        await api.patch(
          `admin/availability/${editingId}/`,
          payload
        );
        setMessage("Consultation schedule updated successfully.");
      }

      resetForm();
      await onRefresh();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (slot) => {
    const confirmed = window.confirm(
      `Remove the consultation schedule for ` +
      `${getDoctorName(slot.doctor)} on ${slot.date}, ` +
      `${slot.start_time.slice(0, 5)}–${slot.end_time.slice(0, 5)}?`
    );

    if (!confirmed) {
      return;
    }

    setBusyId(slot.id);
    setError("");
    setMessage("");

    try {
      await api.delete(`admin/availability/${slot.id}/`);

      setMessage("Consultation schedule removed successfully.");
      await onRefresh();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="availability-management">
      <div className="availability-heading">
        <div>
          <h2>Availability Management</h2>
          <p className="admin-description">
            Create and manage consultation schedules for approved doctors.
          </p>
        </div>

        <button
          type="button"
          className="availability-primary-button"
          onClick={startAdding}
          disabled={saving || busyId !== null}
        >
          + Add Schedule
        </button>
      </div>

      {message && (
        <div className="availability-success" role="status">
          {message}
        </div>
      )}

      {error && (
        <div className="availability-error" role="alert">
          {error}
        </div>
      )}

      {showForm && (
        <div className="availability-form-panel">
          <h3>
            {editingId === null
              ? "Create Consultation Schedule"
              : "Edit Consultation Schedule"}
          </h3>

          <form onSubmit={handleSubmit}>
            <div className="availability-form-grid">
              <label>
                Doctor *
                <select
                  name="doctor"
                  value={form.doctor}
                  onChange={updateField}
                  required
                >
                  <option value="">Select a doctor</option>

                  {approvedDoctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {getDoctorName(doctor.id)} — {doctor.specialization}
                    </option>
                  ))}

                  {editingId !== null &&
                    form.doctor &&
                    !approvedDoctors.some(
                      (doctor) => doctor.id === Number(form.doctor)
                    ) && (
                      <option value={form.doctor}>
                        {getDoctorName(form.doctor)} (currently unavailable)
                      </option>
                    )}
                </select>
              </label>

              <label>
                Consultation Date *
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  min={today}
                  onChange={updateField}
                  required
                />
              </label>

              <label>
                Start Time *
                <input
                  type="time"
                  name="start_time"
                  value={form.start_time}
                  min="09:00"
                  max="16:30"
                  step="1800"
                  onChange={updateField}
                  required
                />
              </label>

              <label>
                End Time *
                <input
                  type="time"
                  name="end_time"
                  value={form.end_time}
                  min="09:30"
                  max="17:00"
                  step="1800"
                  onChange={updateField}
                  required
                />
              </label>
            </div>

            <p className="availability-hint">
              Schedules must be on weekdays, between 9:00 AM and
              5:00 PM, in 30-minute intervals. Existing bookings
              are protected when editing or removing schedules.
            </p>

            <div className="availability-form-actions">
              <button
                type="submit"
                className="availability-primary-button"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId === null
                  ? "Create Schedule"
                  : "Save Changes"}
              </button>

              <button
                type="button"
                className="availability-secondary-button"
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
              <th>Date</th>
              <th>Start</th>
              <th>End</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {sortedAvailability.length === 0 ? (
              <tr>
                <td colSpan="6">No consultation schedules found.</td>
              </tr>
            ) : (
              sortedAvailability.map((slot) => (
                <tr key={slot.id}>
                  <td>{slot.id}</td>
                  <td>{getDoctorName(slot.doctor)}</td>
                  <td>{slot.date}</td>
                  <td>{slot.start_time.slice(0, 5)}</td>
                  <td>{slot.end_time.slice(0, 5)}</td>
                  <td>
                    <div className="availability-row-actions">
                      <button
                        type="button"
                        className="availability-edit-button"
                        onClick={() => startEditing(slot)}
                        disabled={saving || busyId !== null}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="availability-delete-button"
                        onClick={() => handleDelete(slot)}
                        disabled={saving || busyId !== null}
                      >
                        {busyId === slot.id ? "Removing..." : "Remove"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="admin-note">
        Removing a consultation schedule does not delete appointment
        history. The backend prevents changes that would invalidate
        pending or confirmed bookings.
      </p>
    </div>
  );
}

export default AvailabilityManagement;