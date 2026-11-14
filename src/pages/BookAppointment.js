import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api";
import "./BookAppointment.css";

function BookAppointment() {
  const { doctorId } = useParams();
  const navigate = useNavigate();

  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    const role = sessionStorage.getItem("role");

    if (!token || role !== "patient") {
      navigate("/login", { replace: true });
      return;
    }

    const fetchDoctor = async () => {
      try {
        const response = await api.get(
          `doctors/${doctorId}/`
        );

        setDoctor(response.data);
      } catch (err) {
        console.error("Failed to load doctor:", err);
        setError(
          "Unable to load this doctor's information."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDoctor();
  }, [doctorId, navigate]);

  const getDoctorName = () => {
    if (!doctor) return "";

    if (doctor.name) {
      return doctor.name;
    }

    if (doctor.user?.first_name) {
      return [
        doctor.user.first_name,
        doctor.user.last_name,
      ].filter(Boolean).join(" ");
    }

    return doctor.username || `Doctor ${doctor.id}`;
  };

  return (
    <div className="booking-page">
      <header className="booking-header">
        <h1>Piki Ora Medical Centre</h1>
        <button
          onClick={() =>
            navigate("/patient/dashboard")
          }
        >
          Back to Dashboard
        </button>
      </header>

      <main className="booking-container">
        <h2>Book an Appointment</h2>

        {loading && <p>Loading doctor details...</p>}

        {error && (
          <p className="booking-error" role="alert">
            {error}
          </p>
        )}

        {!loading && !error && doctor && (
          <div className="booking-card">
            <h3>Selected Doctor</h3>

            <p>
              <strong>Name:</strong> Dr. {getDoctorName()}
            </p>

            <p>
              <strong>Specialization:</strong>{" "}
              {doctor.specialization || "Not specified"}
            </p>

            <hr />

            <h3>Appointment Availability</h3>

            <p>
              Doctor availability and appointment
              selection will be added next.
            </p>

            <button
              className="booking-back"
              onClick={() =>
                navigate("/patient/dashboard")
              }
            >
              Choose Another Doctor
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default BookAppointment;
