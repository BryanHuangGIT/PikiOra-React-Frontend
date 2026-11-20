import React, {
  useCallback,
  useEffect,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "./PatientDashboard.css";

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

function getErrorMessage(error, fallback) {
  const data = error.response?.data;

  if (!data) return fallback;
  if (typeof data === "string") return data;

  if (Array.isArray(data)) {
    return data.map(String).join(" ");
  }

  if (typeof data === "object") {
    return Object.entries(data)
      .map(([key, value]) => {
        const message = Array.isArray(value)
          ? value.join(", ")
          : typeof value === "object"
          ? JSON.stringify(value)
          : String(value);

        return `${key}: ${message}`;
      })
      .join(" | ");
  }

  return fallback;
}

function normalizeSlots(data) {
  const raw = Array.isArray(data)
    ? data
    : data?.available_slots || data?.slots || [];

  if (!Array.isArray(raw)) return [];

  return raw
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
}

function localDateString(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatDate(dateString) {
  if (!dateString) return "N/A";

  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

function formatTime(timeString) {
  return timeString
    ? String(timeString).slice(0, 5)
    : "N/A";
}

function appointmentDateTime(appointment) {
  return new Date(
    `${appointment.appointment_date}T${appointment.appointment_time}`
  );
}

function isUpcoming(appointment) {
  return appointmentDateTime(appointment) > new Date();
}

function getDoctorId(appointment) {
  const doctor = appointment.doctor;

  if (doctor && typeof doctor === "object") {
    return doctor.id;
  }

  return doctor;
}

function PatientDashboard() {
  const navigate = useNavigate();

  const [authorized, setAuthorized] = useState(false);

  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);

  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [loadingAppointments, setLoadingAppointments] =
    useState(true);

  const [doctorsError, setDoctorsError] = useState("");
  const [appointmentsError, setAppointmentsError] =
    useState("");

  const [message, setMessage] = useState("");
  const [cancellingId, setCancellingId] = useState(null);

  const [editingAppointment, setEditingAppointment] =
    useState(null);

  const [editForm, setEditForm] = useState({
    appointment_date: "",
    appointment_time: "",
    reason: "",
  });

  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  const username = sessionStorage.getItem("username");

  const today = new Date();
  const minDate = localDateString(today);

  const maxDateObject = new Date(today);
  maxDateObject.setDate(maxDateObject.getDate() + 30);
  const maxDate = localDateString(maxDateObject);

  const handleAuthenticationError = useCallback(
    (error) => {
      if (error.response?.status === 401) {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("role");
        sessionStorage.removeItem("username");

        setAuthorized(false);
        navigate("/login", { replace: true });
        return true;
      }

      return false;
    },
    [navigate]
  );

  const fetchAppointments = useCallback(async () => {
    setLoadingAppointments(true);
    setAppointmentsError("");

    try {
      const response = await api.get("appointments/");
      setAppointments(normalizeList(response.data));
      return true;
    } catch (err) {
      console.error("Failed to load appointments:", err);

      if (!handleAuthenticationError(err)) {
        setAppointmentsError(
          getErrorMessage(
            err,
            "Unable to load appointments. Please try again."
          )
        );
      }

      return false;
    } finally {
      setLoadingAppointments(false);
    }
  }, [handleAuthenticationError]);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    const role = sessionStorage.getItem("role");

    if (!token || role !== "patient") {
      navigate("/login", { replace: true });
      return;
    }

    setAuthorized(true);

    let active = true;

    const fetchDoctors = async () => {
      try {
        const response = await api.get("doctors/");

        if (active) {
          setDoctors(normalizeList(response.data));
        }
      } catch (err) {
        if (active && !handleAuthenticationError(err)) {
          setDoctorsError(
            getErrorMessage(
              err,
              "Unable to load doctors."
            )
          );
        }
      } finally {
        if (active) {
          setLoadingDoctors(false);
        }
      }
    };

    fetchDoctors();
    fetchAppointments();

    return () => {
      active = false;
    };
  }, [navigate, fetchAppointments, handleAuthenticationError]);

  useEffect(() => {
    if (!editingAppointment || !editForm.appointment_date) {
      setAvailableSlots([]);
      return;
    }

    let active = true;

    const loadSlots = async () => {
      setLoadingSlots(true);
      setEditError("");
      setAvailableSlots([]);

      const doctorId = getDoctorId(editingAppointment);

      try {
        const response = await api.get(
          `doctors/${doctorId}/slots/`,
          {
            params: {
              date: editForm.appointment_date,
            },
          }
        );

        if (!active) return;

        const slots = normalizeSlots(response.data);

        // The existing booking occupies its own slot.
        // Keep that slot selectable when the date is unchanged.
        if (
          editForm.appointment_date ===
          editingAppointment.appointment_date
        ) {
          const currentTime = formatTime(
            editingAppointment.appointment_time
          );

          if (!slots.includes(currentTime)) {
            slots.push(currentTime);
          }
        }

        setAvailableSlots([...new Set(slots)].sort());
      } catch (err) {
        if (active && !handleAuthenticationError(err)) {
          setEditError(
            getErrorMessage(
              err,
              "Unable to load available appointment times."
            )
          );
        }
      } finally {
        if (active) {
          setLoadingSlots(false);
        }
      }
    };

    loadSlots();

    return () => {
      active = false;
    };
  }, [
    editingAppointment,
    editForm.appointment_date,
    handleAuthenticationError,
  ]);

  const startEditing = (appointment) => {
    setAppointmentsError("");
    setMessage("");
    setEditError("");

    setEditingAppointment(appointment);

    setEditForm({
      appointment_date: appointment.appointment_date,
      appointment_time: formatTime(
        appointment.appointment_time
      ),
      reason: appointment.reason || "",
    });

    setAvailableSlots([]);
  };

  const cancelEditing = () => {
    setEditingAppointment(null);
    setAvailableSlots([]);
    setEditError("");
  };

  const handleSaveEdit = async (event) => {
    event.preventDefault();

    if (!editingAppointment) return;

    setEditError("");
    setMessage("");

    if (
      !editForm.appointment_date ||
      !editForm.appointment_time ||
      !editForm.reason.trim()
    ) {
      setEditError(
        "Please select a date, time and reason."
      );
      return;
    }

    const selectedDate = new Date(
      `${editForm.appointment_date}T00:00:00`
    );

    if (
      editForm.appointment_date < minDate ||
      editForm.appointment_date > maxDate
    ) {
      setEditError(
        "Please choose a date within the next 30 days."
      );
      return;
    }

    if ([0, 6].includes(selectedDate.getDay())) {
      setEditError(
        "Appointments are available Monday to Friday only."
      );
      return;
    }

    if (!availableSlots.includes(editForm.appointment_time)) {
      setEditError(
        "Please select an available appointment time."
      );
      return;
    }

    setSavingEdit(true);

    try {
      await api.patch(
        `appointments/${editingAppointment.id}/`,
        {
          appointment_date: editForm.appointment_date,
          appointment_time: editForm.appointment_time,
          reason: editForm.reason.trim(),
        }
      );

      cancelEditing();

      const refreshed = await fetchAppointments();

      if (refreshed) {
        setMessage(
          "Appointment updated successfully."
        );
      }
    } catch (err) {
      console.error("Appointment editing failed:", err);

      if (!handleAuthenticationError(err)) {
        setEditError(
          getErrorMessage(
            err,
            "Unable to update this appointment."
          )
        );
      }
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCancel = async (appointmentId) => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this appointment?"
    );

    if (!confirmed) return;

    setCancellingId(appointmentId);
    setAppointmentsError("");
    setMessage("");

    try {
      await api.patch(
        `appointments/${appointmentId}/cancel/`
      );

      const refreshed = await fetchAppointments();

      if (refreshed) {
        setMessage(
          "Appointment cancelled successfully."
        );
      }
    } catch (err) {
      console.error("Cancellation failed:", err);

      if (!handleAuthenticationError(err)) {
        setAppointmentsError(
          getErrorMessage(
            err,
            "Unable to cancel this appointment."
          )
        );
      }
    } finally {
      setCancellingId(null);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("auth/logout/");
    } catch (err) {
      console.error("Logout request failed:", err);
    } finally {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("role");
      sessionStorage.removeItem("username");

      setAuthorized(false);
      navigate("/login", { replace: true });
    }
  };

  const upcomingAppointments = appointments
    .filter(
      (appointment) =>
        isUpcoming(appointment) &&
        ["Pending", "Confirmed"].includes(
          appointment.status
        )
    )
    .sort((a, b) =>
      `${a.appointment_date}T${a.appointment_time}`.localeCompare(
        `${b.appointment_date}T${b.appointment_time}`
      )
    );

  const appointmentHistory = appointments
    .filter(
      (appointment) =>
        !isUpcoming(appointment) ||
        ["Cancelled", "Completed"].includes(
          appointment.status
        )
    )
    .sort((a, b) =>
      `${b.appointment_date}T${b.appointment_time}`.localeCompare(
        `${a.appointment_date}T${a.appointment_time}`
      )
    );

  const renderAppointment = (appointment) => {
    const canModify =
      isUpcoming(appointment) &&
      ["Pending", "Confirmed"].includes(
        appointment.status
      );

    return (
      <div
        className="appointment-card"
        key={appointment.id}
      >
        <div className="appointment-card-top">
          <h3>
            {appointment.doctor_name
              ? `Dr. ${appointment.doctor_name}`
              : `Doctor ${getDoctorId(appointment)}`}
          </h3>

          <span
            className={`appointment-status status-${appointment.status.toLowerCase()}`}
          >
            {appointment.status}
          </span>
        </div>

        <p>
          <strong>Date:</strong>{" "}
          {formatDate(appointment.appointment_date)}
        </p>

        <p>
          <strong>Time:</strong>{" "}
          {formatTime(appointment.appointment_time)}
        </p>

        <p>
          <strong>Duration:</strong> 30 minutes
        </p>

        <p>
          <strong>Reason:</strong>{" "}
          {appointment.reason || "Not provided"}
        </p>

        {canModify && (
          <div className="patient-appointment-actions">
            <button
              type="button"
              className="edit-appointment-button"
              onClick={() => startEditing(appointment)}
              disabled={
                cancellingId !== null || savingEdit
              }
            >
              Edit Appointment
            </button>

            <button
              type="button"
              className="cancel-appointment-button"
              onClick={() =>
                handleCancel(appointment.id)
              }
              disabled={
                cancellingId !== null || savingEdit
              }
            >
              {cancellingId === appointment.id
                ? "Cancelling..."
                : "Cancel Appointment"}
            </button>
          </div>
        )}
      </div>
    );
  };

  if (!authorized) {
    return <p>Checking patient access...</p>;
  }

  return (
    <div className="patient-dashboard">
      <header className="patient-header">
        <div>
          <h1>Piki Ora Medical Centre</h1>
          <p>Patient Portal</p>
        </div>

        <button type="button" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <main className="patient-main">
        <section className="patient-welcome">
          <h2>
            Welcome{username ? `, ${username}` : ""}!
          </h2>

          <p>
            Manage your healthcare appointments in one place.
          </p>
        </section>

        <section className="patient-section">
          <h2>My Appointments</h2>

          {message && (
            <p className="patient-success" role="status">
              {message}
            </p>
          )}

          {appointmentsError && (
            <p className="patient-error" role="alert">
              {appointmentsError}
            </p>
          )}

          <button
            type="button"
            className="refresh-appointments-button"
            onClick={fetchAppointments}
            disabled={loadingAppointments}
          >
            Refresh Appointments
          </button>

          {editingAppointment && (
            <div className="patient-edit-panel">
              <h3>
                Edit Appointment #{editingAppointment.id}
              </h3>

              <p>
                <strong>Doctor:</strong>{" "}
                {editingAppointment.doctor_name ||
                  `Doctor ${getDoctorId(editingAppointment)}`}
              </p>

              {editError && (
                <p
                  className="patient-error"
                  role="alert"
                >
                  {editError}
                </p>
              )}

              <form onSubmit={handleSaveEdit}>
                <label htmlFor="editAppointmentDate">
                  Appointment Date
                </label>

                <input
                  id="editAppointmentDate"
                  type="date"
                  value={editForm.appointment_date}
                  min={minDate}
                  max={maxDate}
                  onChange={(event) =>
                    setEditForm((previous) => ({
                      ...previous,
                      appointment_date: event.target.value,
                      appointment_time: "",
                    }))
                  }
                  required
                />

                <label htmlFor="editAppointmentTime">
                  Appointment Time
                </label>

                <select
                  id="editAppointmentTime"
                  value={editForm.appointment_time}
                  onChange={(event) =>
                    setEditForm((previous) => ({
                      ...previous,
                      appointment_time: event.target.value,
                    }))
                  }
                  disabled={loadingSlots}
                  required
                >
                  <option value="">
                    {loadingSlots
                      ? "Loading times..."
                      : "Select a time"}
                  </option>

                  {availableSlots.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>

                {!loadingSlots &&
                  availableSlots.length === 0 && (
                    <p>
                      No available times for this date.
                      Please choose another date.
                    </p>
                  )}

                <label htmlFor="editAppointmentReason">
                  Reason for Appointment
                </label>

                <textarea
                  id="editAppointmentReason"
                  rows="4"
                  value={editForm.reason}
                  onChange={(event) =>
                    setEditForm((previous) => ({
                      ...previous,
                      reason: event.target.value,
                    }))
                  }
                  required
                />

                <div className="patient-edit-actions">
                  <button
                    type="submit"
                    className="edit-save-button"
                    disabled={
                      savingEdit ||
                      loadingSlots ||
                      !editForm.appointment_time ||
                      !editForm.reason.trim()
                    }
                  >
                    {savingEdit
                      ? "Saving..."
                      : "Save Changes"}
                  </button>

                  <button
                    type="button"
                    className="edit-cancel-button"
                    onClick={cancelEditing}
                    disabled={savingEdit}
                  >
                    Cancel Editing
                  </button>
                </div>
              </form>
            </div>
          )}

          {loadingAppointments ? (
            <p>Loading appointments...</p>
          ) : (
            <>
              <h3>Upcoming Appointments</h3>

              {upcomingAppointments.length === 0 ? (
                <p>You have no upcoming appointments.</p>
              ) : (
                <div className="appointments-grid">
                  {upcomingAppointments.map(
                    renderAppointment
                  )}
                </div>
              )}

              <h3 className="appointment-history-title">
                Appointment History
              </h3>

              {appointmentHistory.length === 0 ? (
                <p>No appointment history yet.</p>
              ) : (
                <div className="appointments-grid">
                  {appointmentHistory.map(
                    renderAppointment
                  )}
                </div>
              )}
            </>
          )}
        </section>

        <section className="patient-section">
          <h2>Available Doctors</h2>

          {loadingDoctors && (
            <p>Loading doctors...</p>
          )}

          {doctorsError && (
            <p className="patient-error" role="alert">
              {doctorsError}
            </p>
          )}

          {!loadingDoctors &&
            !doctorsError &&
            doctors.length === 0 && (
              <p>No doctors are currently available.</p>
            )}

          <div className="doctor-grid">
            {doctors.map((doctor) => (
              <div
                className="doctor-card"
                key={doctor.id}
              >
                <div className="doctor-avatar">+</div>

                <h3>
                  {doctor.doctor_name ||
                    [
                      doctor.user?.first_name,
                      doctor.user?.last_name,
                    ]
                      .filter(Boolean)
                      .join(" ") ||
                    `Doctor ${doctor.id}`}
                </h3>

                <p>
                  {doctor.specialization ||
                    "General Practitioner"}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/patient/book/${doctor.id}`
                    )
                  }
                >
                  Book Appointment
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default PatientDashboard;