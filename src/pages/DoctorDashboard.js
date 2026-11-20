import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";
import api from "../api";
import "./DoctorDashboard.css";

function getErrorMessage(error, fallback) {
  const data = error.response?.data;

  if (!data) {
    return fallback;
  }

  if (typeof data === "string") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(String).join(" ");
  }

  if (typeof data === "object") {
    return Object.entries(data)
      .map(([key, value]) => {
        const message = Array.isArray(value)
          ? value.join(", ")
          : String(value);

        return `${key}: ${message}`;
      })
      .join(" | ");
  }

  return fallback;
}

function localDateString(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getAppointmentDateTime(appointment) {
  return new Date(
    `${appointment.appointment_date}T${appointment.appointment_time}`
  );
}

function DoctorDashboard() {
  const navigate = useNavigate();

  const [authorized, setAuthorized] = useState(false);

  const [doctorName, setDoctorName] = useState("");
  const [appointments, setAppointments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleAuthenticationError = useCallback(
    (err) => {
      if (err.response?.status === 401) {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("role");
        sessionStorage.removeItem("username");

        setAuthorized(false);
        navigate("/login", { replace: true });

        return true;
      }

      if (err.response?.status === 403) {
        setError(
          "Access denied. Doctor permissions are required."
        );

        return true;
      }

      return false;
    },
    [navigate]
  );

  const fetchAppointments = useCallback(async () => {
    const token = sessionStorage.getItem("token");
    const role = sessionStorage.getItem("role");

    if (!token || role !== "doctor") {
      setAuthorized(false);
      navigate("/login", { replace: true });
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.get(
        "doctor/appointments/"
      );

      setDoctorName(
        response.data.doctor_name || ""
      );

      setAppointments(
        Array.isArray(response.data.appointments)
          ? response.data.appointments
          : []
      );
    } catch (err) {
      console.error(
        "Failed to load doctor appointments:",
        err
      );

      if (!handleAuthenticationError(err)) {
        setError(
          getErrorMessage(
            err,
            "Unable to load appointments."
          )
        );
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, handleAuthenticationError]);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    const role = sessionStorage.getItem("role");

    if (!token || role !== "doctor") {
      navigate("/login", { replace: true });
      return;
    }

    setAuthorized(true);
    fetchAppointments();
  }, [navigate, fetchAppointments]);

  const updateStatus = async (id, newStatus) => {
    const action =
      newStatus === "Confirmed"
        ? "confirm"
        : "complete";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} this appointment?`
    );

    if (!confirmed) {
      return;
    }

    setUpdatingId(id);
    setError("");
    setMessage("");

    try {
      await api.patch(
        `doctor/appointments/${id}/status/`,
        {
          status: newStatus,
        }
      );

      await fetchAppointments();

      setMessage(
        `Appointment successfully marked as ${newStatus}.`
      );
    } catch (err) {
      console.error(
        "Failed to update appointment:",
        err
      );

      if (!handleAuthenticationError(err)) {
        setError(
          getErrorMessage(
            err,
            "Unable to update appointment."
          )
        );
      }
    } finally {
      setUpdatingId(null);
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

  const todayString = localDateString(new Date());

  const todaysAppointments = appointments
    .filter(
      (appointment) =>
        appointment.appointment_date === todayString &&
        !["Cancelled", "Completed"].includes(
          appointment.status
        )
    )
    .sort((a, b) =>
      a.appointment_time.localeCompare(
        b.appointment_time
      )
    );

  const upcomingAppointments = appointments
    .filter(
      (appointment) =>
        appointment.appointment_date > todayString &&
        !["Cancelled", "Completed"].includes(
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
        appointment.appointment_date < todayString ||
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
    const isUpdating = updatingId === appointment.id;

    const canConfirm =
      appointment.status === "Pending" &&
      getAppointmentDateTime(appointment) > new Date();

    const canComplete =
      appointment.status === "Confirmed" &&
      getAppointmentDateTime(appointment) <= new Date();

    return (
      <div
        className="doctor-appointment-card"
        key={appointment.id}
      >
        <div className="doctor-appointment-top">
          <h3>
            {appointment.patient_name || "Patient"}
          </h3>

          <span
            className={`doctor-status status-${appointment.status.toLowerCase()}`}
          >
            {appointment.status}
          </span>
        </div>

        <p>
          <strong>Date:</strong>{" "}
          {appointment.appointment_date}
        </p>

        <p>
          <strong>Time:</strong>{" "}
          {appointment.appointment_time.slice(0, 5)}
        </p>

        <p>
          <strong>Reason:</strong>{" "}
          {appointment.reason || "Not provided"}
        </p>

        <div className="doctor-appointment-actions">
          {canConfirm && (
            <button
              type="button"
              className="confirm-button"
              disabled={updatingId !== null}
              onClick={() =>
                updateStatus(
                  appointment.id,
                  "Confirmed"
                )
              }
            >
              {isUpdating
                ? "Updating..."
                : "Confirm Appointment"}
            </button>
          )}

          {canComplete && (
            <button
              type="button"
              className="complete-button"
              disabled={updatingId !== null}
              onClick={() =>
                updateStatus(
                  appointment.id,
                  "Completed"
                )
              }
            >
              {isUpdating
                ? "Updating..."
                : "Complete Appointment"}
            </button>
          )}
        </div>
      </div>
    );
  };

  // Do not display doctor information until
  // the role check has succeeded.
  if (!authorized) {
    return <p>Checking doctor access...</p>;
  }

  return (
    <div className="doctor-dashboard">
      <header className="doctor-header">
        <div>
          <h1>Piki Ora Medical Centre</h1>
          <p>Doctor Portal</p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
        >
          Logout
        </button>
      </header>

      <main className="doctor-main">
        <section className="doctor-welcome">
          <h2>
            Welcome, Dr. {doctorName || "Doctor"}
          </h2>

          <p>
            Manage patient appointments and your daily schedule.
          </p>
        </section>

        {message && (
          <p
            className="doctor-success"
            role="status"
          >
            {message}
          </p>
        )}

        {error && (
          <p
            className="doctor-error"
            role="alert"
          >
            {error}
          </p>
        )}

        <button
          type="button"
          className="doctor-refresh-button"
          onClick={fetchAppointments}
          disabled={loading}
        >
          {loading
            ? "Refreshing..."
            : "Refresh Appointments"}
        </button>

        {loading ? (
          <p>Loading appointments...</p>
        ) : (
          <>
            <section className="doctor-section">
              <h2>Today's Appointments</h2>

              {todaysAppointments.length === 0 ? (
                <p>
                  No appointments scheduled for today.
                </p>
              ) : (
                <div className="doctor-appointments-grid">
                  {todaysAppointments.map(
                    renderAppointment
                  )}
                </div>
              )}
            </section>

            <section className="doctor-section">
              <h2>Upcoming Appointments</h2>

              {upcomingAppointments.length === 0 ? (
                <p>No upcoming appointments.</p>
              ) : (
                <div className="doctor-appointments-grid">
                  {upcomingAppointments.map(
                    renderAppointment
                  )}
                </div>
              )}
            </section>

            <section className="doctor-section">
              <h2>Appointment History</h2>

              {appointmentHistory.length === 0 ? (
                <p>No appointment history yet.</p>
              ) : (
                <div className="doctor-appointments-grid">
                  {appointmentHistory.map(
                    renderAppointment
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default DoctorDashboard;