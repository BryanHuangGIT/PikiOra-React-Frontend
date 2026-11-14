import React, {
  useCallback,
  useEffect,
  useState
} from "react";

import { useNavigate } from "react-router-dom";
import api from "../api";
import "./DoctorDashboard.css";

function DoctorDashboard() {
  const navigate = useNavigate();

  const [doctorName, setDoctorName] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get(
        "doctor/appointments/"
      );

      setDoctorName(response.data.doctor_name || "");
      setAppointments(response.data.appointments || []);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail ||
        "Unable to load appointments."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    const role = sessionStorage.getItem("role");

    if (!token || role !== "doctor") {
      navigate("/login", { replace: true });
      return;
    }

    fetchAppointments();
  }, [navigate, fetchAppointments]);

  const updateStatus = async (id, newStatus) => {
    const action =
      newStatus === "Confirmed" ? "confirm" : "complete";

    if (
      !window.confirm(
        `Are you sure you want to ${action} this appointment?`
      )
    ) {
      return;
    }

    setUpdatingId(id);
    setError("");
    setMessage("");

    try {
      await api.patch(
        `doctor/appointments/${id}/status/`,
        { status: newStatus }
      );

      setMessage(
        `Appointment successfully marked as ${newStatus}.`
      );

      await fetchAppointments();
    } catch (err) {
      console.error(err);

      const data = err.response?.data;

      setError(
        data?.error ||
        data?.detail ||
        "Unable to update appointment."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("auth/logout/");
    } catch (err) {
      console.error(err);
    } finally {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("role");
      sessionStorage.removeItem("username");
      navigate("/login", { replace: true });
    }
  };

  const localDateString = (date) => {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  };

  const todayString = localDateString(new Date());

  const getAppointmentDateTime = (appointment) => {
    return new Date(
      `${appointment.appointment_date}T${appointment.appointment_time}`
    );
  };

  const todaysAppointments = appointments.filter(
    (appointment) =>
      appointment.appointment_date === todayString &&
      !["Cancelled", "Completed"].includes(
        appointment.status
      )
  );

  const upcomingAppointments = appointments.filter(
    (appointment) =>
      appointment.appointment_date > todayString &&
      !["Cancelled", "Completed"].includes(
        appointment.status
      )
  );

  const appointmentHistory = appointments.filter(
    (appointment) =>
      appointment.appointment_date < todayString ||
      ["Cancelled", "Completed"].includes(
        appointment.status
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
              className="confirm-button"
              disabled={isUpdating}
              onClick={() =>
                updateStatus(appointment.id, "Confirmed")
              }
            >
              {isUpdating
                ? "Updating..."
                : "Confirm Appointment"}
            </button>
          )}

          {canComplete && (
            <button
              className="complete-button"
              disabled={isUpdating}
              onClick={() =>
                updateStatus(appointment.id, "Completed")
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

  return (
    <div className="doctor-dashboard">
      <header className="doctor-header">
        <div>
          <h1>Piki Ora Medical Centre</h1>
          <p>Doctor Portal</p>
        </div>

        <button onClick={handleLogout}>
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
          <p className="doctor-success" role="status">
            {message}
          </p>
        )}

        {error && (
          <p className="doctor-error" role="alert">
            {error}
          </p>
        )}

        <button
          className="doctor-refresh-button"
          onClick={fetchAppointments}
          disabled={loading}
        >
          Refresh Appointments
        </button>

        {loading ? (
          <p>Loading appointments...</p>
        ) : (
          <>
            <section className="doctor-section">
              <h2>Today's Appointments</h2>

              {todaysAppointments.length === 0 ? (
                <p>No appointments scheduled for today.</p>
              ) : (
                <div className="doctor-appointments-grid">
                  {todaysAppointments.map(renderAppointment)}
                </div>
              )}
            </section>

            <section className="doctor-section">
              <h2>Upcoming Appointments</h2>

              {upcomingAppointments.length === 0 ? (
                <p>No upcoming appointments.</p>
              ) : (
                <div className="doctor-appointments-grid">
                  {upcomingAppointments.map(renderAppointment)}
                </div>
              )}
            </section>

            <section className="doctor-section">
              <h2>Appointment History</h2>

              {appointmentHistory.length === 0 ? (
                <p>No appointment history yet.</p>
              ) : (
                <div className="doctor-appointments-grid">
                  {appointmentHistory.map(renderAppointment)}
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
