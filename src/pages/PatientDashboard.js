import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "./PatientDashboard.css";

function PatientDashboard() {
  const navigate = useNavigate();

  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);

  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [loadingAppointments, setLoadingAppointments] = useState(true);

  const [doctorsError, setDoctorsError] = useState("");
  const [appointmentsError, setAppointmentsError] = useState("");
  const [message, setMessage] = useState("");

  const [cancellingId, setCancellingId] = useState(null);

  const username = sessionStorage.getItem("username");

  const fetchAppointments = useCallback(async () => {
    setLoadingAppointments(true);
    setAppointmentsError("");

    try {
      const response = await api.get("appointments/");
      const data = response.data;

      setAppointments(
        Array.isArray(data) ? data : data.results || []
      );
    } catch (err) {
      console.error("Failed to load appointments:", err);
      setAppointmentsError(
        "Unable to load appointments. Please try again."
      );
    } finally {
      setLoadingAppointments(false);
    }
  }, []);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    const role = sessionStorage.getItem("role");

    if (!token || role !== "patient") {
      navigate("/login", { replace: true });
      return;
    }

    const fetchDoctors = async () => {
      try {
        const response = await api.get("doctors/");
        const data = response.data;

        setDoctors(
          Array.isArray(data) ? data : data.results || []
        );
      } catch (err) {
        console.error("Failed to load doctors:", err);
        setDoctorsError(
          "Unable to load doctors. Please try again."
        );
      } finally {
        setLoadingDoctors(false);
      }
    };

    fetchDoctors();
    fetchAppointments();
  }, [navigate, fetchAppointments]);

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

      setMessage("Appointment cancelled successfully.");
      await fetchAppointments();
    } catch (err) {
      console.error("Cancellation failed:", err);

      const data = err.response?.data;
      setAppointmentsError(
        data?.error ||
        data?.detail ||
        "Unable to cancel this appointment."
      );
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
      navigate("/login", { replace: true });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";

    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  };

  const formatTime = (timeString) => {
    if (!timeString) return "N/A";

    return timeString.slice(0, 5);
  };

  const isUpcoming = (appointment) => {
    const appointmentDateTime = new Date(
      `${appointment.appointment_date}T${appointment.appointment_time}`
    );

    return appointmentDateTime > new Date();
  };

  const upcomingAppointments = appointments
    .filter(
      (appointment) =>
        isUpcoming(appointment) &&
        appointment.status !== "Cancelled" &&
        appointment.status !== "Completed"
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
        appointment.status === "Cancelled" ||
        appointment.status === "Completed"
    )
    .sort((a, b) =>
      `${b.appointment_date}T${b.appointment_time}`.localeCompare(
        `${a.appointment_date}T${a.appointment_time}`
      )
    );

  const renderAppointment = (appointment) => (
    <div
      className="appointment-card"
      key={appointment.id}
    >
      <div className="appointment-card-top">
        <h3>
          {appointment.doctor_name
            ? `Dr. ${appointment.doctor_name}`
            : `Doctor ${appointment.doctor}`}
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

      {isUpcoming(appointment) &&
        ["Pending", "Confirmed"].includes(
          appointment.status
        ) && (
          <button
            className="cancel-appointment-button"
            onClick={() =>
              handleCancel(appointment.id)
            }
            disabled={cancellingId === appointment.id}
          >
            {cancellingId === appointment.id
              ? "Cancelling..."
              : "Cancel Appointment"}
          </button>
        )}
    </div>
  );

  return (
    <div className="patient-dashboard">
      <header className="patient-header">
        <div>
          <h1>Piki Ora Medical Centre</h1>
          <p>Patient Portal</p>
        </div>

        <button onClick={handleLogout}>
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
            className="refresh-appointments-button"
            onClick={fetchAppointments}
            disabled={loadingAppointments}
          >
            Refresh Appointments
          </button>

          {loadingAppointments ? (
            <p>Loading appointments...</p>
          ) : (
            <>
              <h3>Upcoming Appointments</h3>

              {upcomingAppointments.length === 0 ? (
                <p>You have no upcoming appointments.</p>
              ) : (
                <div className="appointments-grid">
                  {upcomingAppointments.map(renderAppointment)}
                </div>
              )}

              <h3 className="appointment-history-title">
                Appointment History
              </h3>

              {appointmentHistory.length === 0 ? (
                <p>No appointment history yet.</p>
              ) : (
                <div className="appointments-grid">
                  {appointmentHistory.map(renderAppointment)}
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
            <p className="patient-error">
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
                    `Doctor ${doctor.id}`}
                </h3>

                <p>
                  {doctor.specialization ||
                    "General Practitioner"}
                </p>

                <button
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
