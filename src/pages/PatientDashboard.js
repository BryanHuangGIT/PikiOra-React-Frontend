import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "./PatientDashboard.css";

function PatientDashboard() {
  const navigate = useNavigate();

  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const username = sessionStorage.getItem("username");

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
        setError("Unable to load doctors. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchDoctors();
  }, [navigate]);

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
          <h2>Available Doctors</h2>

          {loading && <p>Loading doctors...</p>}

          {error && (
            <p className="patient-error">{error}</p>
          )}

          {!loading && !error && doctors.length === 0 && (
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
                  Dr.{" "}
                  {doctor.name ||
                    doctor.user?.first_name ||
                    doctor.username ||
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

        <section className="patient-section">
          <h2>My Appointments</h2>
          <p>
            Appointment history and upcoming bookings
            will appear here.
          </p>
        </section>
      </main>
    </div>
  );
}

export default PatientDashboard;