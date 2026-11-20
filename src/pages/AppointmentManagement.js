import React, { useMemo, useState } from "react";
import api from "../api";
import "./AppointmentManagement.css";

const emptyForm = {
  doctor: "",
  appointment_date: "",
  appointment_time: "",
  reason: "",
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

  const flattenErrors = (value, prefix = "") => {
    if (Array.isArray(value)) {
      return value.map((item) => String(item)).join(", ");
    }

    if (value && typeof value === "object") {
      return Object.entries(value)
        .map(([key, item]) => {
          const label = prefix ? `${prefix}.${key}` : key;
          return `${label}: ${flattenErrors(item, label)}`;
        })
        .join(" ");
    }

    return String(value);
  };

  return flattenErrors(data);
}

function getLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDoctorName(doctor) {
  if (!doctor) {
    return "Unknown doctor";
  }

  const name = [
    doctor.user?.first_name,
    doctor.user?.last_name,
  ]
    .filter(Boolean)
    .join(" ");

  return name || doctor.user?.username || `Doctor #${doctor.id}`;
}

function getPatientName(patient) {
  if (!patient) {
    return "Unknown patient";
  }

  const name = [
    patient.user?.first_name,
    patient.user?.last_name,
  ]
    .filter(Boolean)
    .join(" ");

  return name || patient.user?.username || `Patient #${patient.id}`;
}

function getRelatedId(value) {
  if (value && typeof value === "object") {
    return Number(value.id);
  }

  return Number(value);
}

function AppointmentManagement({
  appointments,
  doctors,
  patients,
  onRefresh,
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);

  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState("");

  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const today = getLocalDateString(new Date());

  const findDoctor = (doctorId) =>
    doctors.find(
      (doctor) => doctor.id === getRelatedId(doctorId)
    );

  const findPatient = (patientId) =>
    patients.find(
      (patient) => patient.id === getRelatedId(patientId)
    );

  const sortedAppointments = useMemo(() => {
    return [...appointments].sort((a, b) => {
      const first = `${a.appointment_date} ${a.appointment_time}`;
      const second = `${b.appointment_date} ${b.appointment_time}`;

      return second.localeCompare(first);
    });
  }, [appointments]);

  const filteredAppointments = sortedAppointments.filter(
    (appointment) => {
      const doctor = findDoctor(appointment.doctor);
      const patient = findPatient(appointment.patient);

      const searchableText = [
        appointment.id,
        getDoctorName(doctor),
        doctor?.user?.username,
        getPatientName(patient),
        patient?.user?.username,
        appointment.reason,
        appointment.appointment_date,
        appointment.status,
      ]
        .filter((value) => value !== undefined && value !== null)
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchableText.includes(
        search.trim().toLowerCase()
      );

      const matchesStatus =
        statusFilter === "all" ||
        appointment.status === statusFilter;

      return matchesSearch && matchesStatus;
    }
  );

  const canEdit = (appointment) =>
    appointment.status === "Pending" ||
    appointment.status === "Confirmed";

  const canCancel = (appointment) =>
    appointment.status === "Pending" ||
    appointment.status === "Confirmed";

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setAvailableSlots([]);
    setSlotsError("");
    setShowForm(false);
  };

  const loadAvailableSlots = async (doctorId, date, currentTime) => {
    if (!doctorId || !date) {
      setAvailableSlots([]);
      setSlotsError("");
      return;
    }

    setSlotsLoading(true);
    setSlotsError("");

    try {
      const response = await api.get(
        `doctors/${doctorId}/slots/`,
        { params: { date } }
      );

      const data = response.data;

      const slots = Array.isArray(data)
        ? data
        : Array.isArray(data?.available_slots)
        ? data.available_slots
        : Array.isArray(data?.slots)
        ? data.slots
        : [];

      const normalizedSlots = slots
        .map((slot) => {
          if (typeof slot === "string") {
            return slot.slice(0, 5);
          }

          if (slot && typeof slot === "object") {
            const time = slot.time || slot.start_time;
            return typeof time === "string"
              ? time.slice(0, 5)
              : null;
          }

          return null;
        })
        .filter(Boolean);

      // The existing appointment's own time may not appear in
      // available slots because it is already booked.
      if (currentTime && !normalizedSlots.includes(currentTime)) {
        normalizedSlots.push(currentTime);
      }

      setAvailableSlots(
        [...new Set(normalizedSlots)].sort()
      );
    } catch (err) {
      setAvailableSlots(currentTime ? [currentTime] : []);
      setSlotsError(getErrorMessage(err));
    } finally {
      setSlotsLoading(false);
    }
  };

  const startEditing = (appointment) => {
    setError("");
    setMessage("");

    const doctorId = String(
      getRelatedId(appointment.doctor)
    );

    const time = appointment.appointment_time.slice(0, 5);

    setEditingId(appointment.id);
    setForm({
      doctor: doctorId,
      appointment_date: appointment.appointment_date,
      appointment_time: time,
      reason: appointment.reason || "",
    });

    setShowForm(true);

    loadAvailableSlots(
      doctorId,
      appointment.appointment_date,
      time
    );
  };

  const updateField = (event) => {
    const { name, value } = event.target;

    if (name === "doctor" || name === "appointment_date") {
      const nextForm = {
        ...form,
        [name]: value,
        appointment_time: "",
      };

      setForm(nextForm);
      setAvailableSlots([]);

      if (nextForm.doctor && nextForm.appointment_date) {
        loadAvailableSlots(
          nextForm.doctor,
          nextForm.appointment_date,
          ""
        );
      }

      return;
    }

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!form.doctor || !form.appointment_date) {
      return "Please select a doctor and appointment date.";
    }

    if (!form.appointment_time) {
      return "Please select an appointment time.";
    }

    if (!form.reason.trim()) {
      return "Please enter the consultation reason.";
    }

    if (form.appointment_date < today) {
      return "The appointment date cannot be in the past.";
    }

    const selectedDate = new Date(
      `${form.appointment_date}T12:00:00`
    );

    const day = selectedDate.getDay();

    if (day === 0 || day === 6) {
      return "Appointments must be scheduled Monday to Friday.";
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
        appointment_date: form.appointment_date,
        appointment_time: `${form.appointment_time}:00`,
        reason: form.reason.trim(),
      };

      await api.patch(
        `admin/appointments/${editingId}/`,
        payload
      );

      resetForm();
      await onRefresh();

      setMessage("Appointment updated successfully.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (appointment) => {
    const confirmed = window.confirm(
      `Cancel appointment #${appointment.id} on ` +
      `${appointment.appointment_date} at ` +
      `${appointment.appointment_time.slice(0, 5)}?`
    );

    if (!confirmed) {
      return;
    }

    setBusyId(appointment.id);
    setError("");
    setMessage("");

    try {
      await api.patch(
        `admin/appointments/${appointment.id}/cancel/`
      );

      if (editingId === appointment.id) {
        resetForm();
      }

      await onRefresh();
      setMessage("Appointment cancelled successfully.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleStatusChange = async (appointment, status) => {
    const confirmed = window.confirm(
      `Change appointment #${appointment.id} ` +
      `from ${appointment.status} to ${status}?`
    );

    if (!confirmed) {
      return;
    }

    setBusyId(appointment.id);
    setError("");
    setMessage("");

    try {
      await api.patch(
        `admin/appointments/${appointment.id}/status/`,
        { status }
      );

      await onRefresh();

      setMessage(
        `Appointment #${appointment.id} marked as ${status}.`
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const formatStatusClass = (status) =>
    `appointment-status appointment-status-${status.toLowerCase()}`;

  return (
    <div className="appointment-management">
      <div className="appointment-heading">
        <div>
          <h2>Appointment Management</h2>
          <p className="admin-description">
            View, reschedule, confirm and cancel patient bookings.
          </p>
        </div>

        <span className="appointment-count">
          {filteredAppointments.length} appointments
        </span>
      </div>

      {message && (
        <div className="appointment-success" role="status">
          {message}
        </div>
      )}

      {error && (
        <div className="appointment-error" role="alert">
          {error}
        </div>
      )}

      <div className="appointment-filters">
        <label>
          Search appointments
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Patient, doctor, date or ID"
          />
        </label>

        <label>
          Filter by status
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
          >
            <option value="all">All statuses</option>
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </label>
      </div>

      {showForm && (
        <div className="appointment-form-panel">
          <h3>Edit Appointment #{editingId}</h3>

          <form onSubmit={handleSubmit}>
            <div className="appointment-form-grid">
              <label>
                Doctor *
                <select
                  name="doctor"
                  value={form.doctor}
                  onChange={updateField}
                  required
                >
                  <option value="">Select doctor</option>

                  {doctors
                    .filter(
                      (doctor) =>
                        (doctor.approved &&
                          doctor.user?.is_active !== false) ||
                        doctor.id === Number(form.doctor)
                    )
                    .map((doctor) => (
                      <option
                        key={doctor.id}
                        value={doctor.id}
                      >
                        {getDoctorName(doctor)} —{" "}
                        {doctor.specialization}
                      </option>
                    ))}
                </select>
              </label>

              <label>
                Appointment Date *
                <input
                  type="date"
                  name="appointment_date"
                  value={form.appointment_date}
                  min={today}
                  onChange={updateField}
                  required
                />
              </label>

              <label>
                Appointment Time *
                <select
                  name="appointment_time"
                  value={form.appointment_time}
                  onChange={updateField}
                  required
                  disabled={slotsLoading}
                >
                  <option value="">
                    {slotsLoading
                      ? "Loading slots..."
                      : "Select a time"}
                  </option>

                  {availableSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </label>

              <label className="appointment-reason-label">
                Consultation Reason *
                <textarea
                  name="reason"
                  value={form.reason}
                  onChange={updateField}
                  rows="3"
                  required
                />
              </label>
            </div>

            {slotsError && (
              <p className="appointment-slot-error">
                Unable to load available slots: {slotsError}
              </p>
            )}

            <p className="appointment-hint">
              Available times depend on the selected doctor's
              consultation schedule. Appointments must be within
              the next 30 days, on weekdays between 9 AM and 5 PM.
              Existing bookings cannot overlap.
            </p>

            <div className="appointment-form-actions">
              <button
                type="submit"
                className="appointment-primary-button"
                disabled={saving || slotsLoading}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>

              <button
                type="button"
                className="appointment-secondary-button"
                onClick={resetForm}
                disabled={saving}
              >
                Close
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
              <th>Patient</th>
              <th>Doctor</th>
              <th>Date</th>
              <th>Time</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredAppointments.length === 0 ? (
              <tr>
                <td colSpan="8">
                  No appointments match your search.
                </td>
              </tr>
            ) : (
              filteredAppointments.map((appointment) => {
                const patient = findPatient(
                  appointment.patient
                );

                const doctor = findDoctor(
                  appointment.doctor
                );

                const isBusy =
                  busyId === appointment.id;

                const appointmentStart = new Date(
                  `${appointment.appointment_date}T` +
                  `${appointment.appointment_time}`
                );

                const hasStarted =
                  appointmentStart <= new Date();

                return (
                  <tr key={appointment.id}>
                    <td>{appointment.id}</td>

                    <td>{getPatientName(patient)}</td>

                    <td>{getDoctorName(doctor)}</td>

                    <td>{appointment.appointment_date}</td>

                    <td>
                      {appointment.appointment_time.slice(0, 5)}
                    </td>

                    <td>{appointment.reason || "N/A"}</td>

                    <td>
                      <span
                        className={formatStatusClass(
                          appointment.status
                        )}
                      >
                        {appointment.status}
                      </span>
                    </td>

                    <td>
                      <div className="appointment-row-actions">
                        {canEdit(appointment) && (
                          <button
                            type="button"
                            className="appointment-edit-button"
                            onClick={() =>
                              startEditing(appointment)
                            }
                            disabled={saving || busyId !== null}
                          >
                            Edit
                          </button>
                        )}

                        {appointment.status === "Pending" && (
                          <button
                            type="button"
                            className="appointment-confirm-button"
                            onClick={() =>
                              handleStatusChange(
                                appointment,
                                "Confirmed"
                              )
                            }
                            disabled={saving || busyId !== null}
                          >
                            Confirm
                          </button>
                        )}

                        {appointment.status === "Confirmed" &&
                          hasStarted && (
                            <button
                              type="button"
                              className="appointment-complete-button"
                              onClick={() =>
                                handleStatusChange(
                                  appointment,
                                  "Completed"
                                )
                              }
                              disabled={saving || busyId !== null}
                            >
                              Complete
                            </button>
                          )}

                        {canCancel(appointment) && (
                          <button
                            type="button"
                            className="appointment-cancel-button"
                            onClick={() =>
                              handleCancel(appointment)
                            }
                            disabled={saving || busyId !== null}
                          >
                            Cancel
                          </button>
                        )}

                        {!canEdit(appointment) && (
                          <span className="appointment-no-actions">
                            No actions
                          </span>
                        )}

                        {isBusy && (
                          <span className="appointment-updating">
                            Updating...
                          </span>
                        )}
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
        Completed and Cancelled appointments are retained as
        historical records. The backend validates all changes
        and prevents double bookings.
      </p>
    </div>
  );
}

export default AppointmentManagement;