import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "./DoctorDashboard.css";

function DoctorDashboard() {
  const navigate = useNavigate();

  const [doctorName, setDoctorName] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("doctor/appointments/");

      setDoctorName(response.data.doctor_name);
      setAppointments(response.data.appointments || []);
    } catch (err) {
      console.error("Failed to load appointments:", err);
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

  const handleLogout = async () => {
    try {
      await api.post("auth/logout/");
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      sessionStorage.clear();
      navigate("/login", { replace: true });
    }
  };

  const today = new Date();
  const todayString = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0")
  ].join("-");

  const todaysAppointments = appointments.filter(
    (appointment) =>
      appointment.appointment_date === todayString &&
      appointment.status !== "Cancelled"
  );

  const upcomingAppointments = appointments.filter(
    (appointment) =>
      appointment.appointment_date > todayString &&
      appointment.status !== "Cancelled" &&
      appointment.status !== "Completed"
  );

  const appointmentHistory = appointments.filter(
    (appointment) =>
      appointment.appointment_date < todayString ||
      appointment.status === "Cancelled" ||
      appointment.status === "Completed"
  );

  const renderAppointment = (appointment) => (
    <div className="doctor-appointment-card" key={appointment.id}>
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
        <strong>Date:</strong> {appointment.appointment_date}
      </p>

      <p>
        <strong>Time:</strong> {appointment.appointment_time.slice(0, 5)}
      </p>

      <p>
        <strong>Reason:</strong>{" "}
        {appointment.reason || "Not provided"}
      </p>
    </div>
  );

  return (
    <div className="doctor-dashboard">
      <header className="doctor-header">
        <div>
          <h1>Piki Ora Medical Centre</h1>
          <p>Doctor Portal</p>
        </div>

        <button onClick={handleLogout}>Logout</button>
      </header>

      <main className="doctor-main">
        <section className="doctor-welcome">
          <h2>
            Welcome, Dr. {doctorName || "Doctor"}
          </h2>
          <p>
            Manage your patient appointments and daily schedule.
          </p>
        </section>

        <section className="doctor-section">
          <h2>Today's Appointments</h2>

          <button onClick={fetchAppointments}>
            Refresh Appointments
          </button>

          {loading && <p>Loading appointments...</p>}
          {error && <p className="doctor-error">{error}</p>}

          {!loading && !error && (
            todaysAppointments.length === 0
              ? <p>No appointments scheduled for today.</p>
              : <div className="doctor-appointments-grid">
                  {todaysAppointments.map(renderAppointment)}
                </div>
          )}
        </section>

        <section className="doctor-section">
          <h2>Upcoming Appointments</h2>

          {!loading && !error && (
            upcomingAppointments.length === 0
              ? <p>No upcoming appointments.</p>
              : <div className="doctor-appointments-grid">
                  {upcomingAppointments.map(renderAppointment)}
                </div>
          )}
        </section>

        <section className="doctor-section">
          <h2>Appointment History</h2>

          {!loading && !error && (
            appointmentHistory.length === 0
              ? <p>No appointment history yet.</p>
              : <div className="doctor-appointments-grid">
                  {appointmentHistory.map(renderAppointment)}
                </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default DoctorDashboard;
