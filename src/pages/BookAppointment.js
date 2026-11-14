import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api";
import "./BookAppointment.css";

function localDateString(date) {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function BookAppointment() {
  const { doctorId } = useParams();
  const navigate = useNavigate();

  const [doctor, setDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [reason, setReason] = useState("");

  const [loadingDoctor, setLoadingDoctor] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const today = new Date();
  const minDate = localDateString(today);

  const maxDateObject = new Date(today);
  maxDateObject.setDate(maxDateObject.getDate() + 30);
  const maxDate = localDateString(maxDateObject);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    const role = sessionStorage.getItem("role");

    if (!token || role !== "patient") {
      navigate("/login", { replace: true });
      return;
    }

    let active = true;

    const fetchDoctor = async () => {
      try {
        const response = await api.get(
          `doctors/${doctorId}/`
        );

        if (active) {
          setDoctor(response.data);
        }
      } catch (err) {
        if (active) {
          setError("Unable to load doctor information.");
        }
      } finally {
        if (active) {
          setLoadingDoctor(false);
        }
      }
    };

    fetchDoctor();

    return () => {
      active = false;
    };
  }, [doctorId, navigate]);

  useEffect(() => {
    if (!selectedDate || !doctor) {
      setAvailableSlots([]);
      setSelectedTime("");
      return;
    }

    let active = true;

    const fetchSlots = async () => {
      setLoadingSlots(true);
      setError("");
      setAvailableSlots([]);
      setSelectedTime("");

      try {
        const response = await api.get(
          `doctors/${doctorId}/slots/`,
          {
            params: { date: selectedDate }
          }
        );

        if (active) {
          setAvailableSlots(
            response.data.available_slots || []
          );
        }
      } catch (err) {
        if (active) {
          setError(
            "Unable to load available appointment slots."
          );
        }
      } finally {
        if (active) {
          setLoadingSlots(false);
        }
      }
    };

    fetchSlots();

    return () => {
      active = false;
    };
  }, [selectedDate, doctorId, doctor]);

  const refreshSlots = async () => {
    if (!selectedDate) return;

    try {
      const response = await api.get(
        `doctors/${doctorId}/slots/`,
        {
          params: { date: selectedDate }
        }
      );

      setAvailableSlots(
        response.data.available_slots || []
      );
    } catch (err) {
      console.error("Unable to refresh slots:", err);
      setError("Unable to refresh appointment slots.");
    }
  };

  const handleBooking = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!selectedDate || !selectedTime) {
      setError("Please select a date and time.");
      return;
    }

    if (!reason.trim()) {
      setError("Please provide a reason for your visit.");
      return;
    }

    setSubmitting(true);

    try {
      await api.post("appointments/", {
        doctor: Number(doctorId),
        appointment_date: selectedDate,
        appointment_time: selectedTime,
        reason: reason.trim()
      });

      setSuccess(
        "Appointment request submitted successfully! " +
        "Your appointment status is Pending."
      );

      setSelectedTime("");
      setReason("");

      await refreshSlots();

    } catch (err) {
      console.error("Booking error:", err);

      const data = err.response?.data;

      if (typeof data === "string") {
        setError(data);
      } else if (data) {
        setError(
          Object.entries(data)
            .map(([key, value]) => {
              const message = Array.isArray(value)
                ? value.join(", ")
                : String(value);

              return `${key}: ${message}`;
            })
            .join(" | ")
        );
      } else {
        setError(
          "Unable to book the appointment. Please try again."
        );
      }

      await refreshSlots();
    } finally {
      setSubmitting(false);
    }
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

        {error && (
          <p className="booking-error" role="alert">
            {error}
          </p>
        )}

        {success && (
          <p className="booking-success" role="status">
            {success}
          </p>
        )}

        {loadingDoctor && (
          <p>Loading doctor information...</p>
        )}

        {!loadingDoctor && doctor && (
          <div className="booking-card">
            <h3>
              {doctor.doctor_name ||
                `Doctor ${doctor.id}`}
            </h3>

            <p>
              <strong>Specialization:</strong>{" "}
              {doctor.specialization || "Not specified"}
            </p>

            <p>
              <strong>Working hours:</strong>{" "}
              Monday–Friday, 9:00 AM–5:00 PM
            </p>

            <p>
              <strong>Appointment duration:</strong>{" "}
              30 minutes
            </p>

            <hr />

            <form onSubmit={handleBooking}>
              <label htmlFor="appointmentDate">
                Select Appointment Date
              </label>

              <input
                id="appointmentDate"
                type="date"
                value={selectedDate}
                min={minDate}
                max={maxDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSuccess("");
                }}
                required
              />

              {loadingSlots && (
                <p>Loading available times...</p>
              )}

              {selectedDate && !loadingSlots && (
                <>
                  <h3>Available Times</h3>

                  {availableSlots.length === 0 ? (
                    <p>
                      No available appointments for this
                      date. Please choose another date.
                    </p>
                  ) : (
                    <div className="time-slots">
                      {availableSlots.map((time) => (
                        <button
                          type="button"
                          key={time}
                          className={
                            selectedTime === time
                              ? "time-slot selected"
                              : "time-slot"
                          }
                          aria-pressed={
                            selectedTime === time
                          }
                          onClick={() =>
                            setSelectedTime(time)
                          }
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              {selectedTime && (
                <p>
                  <strong>Selected time:</strong>{" "}
                  {selectedDate} at {selectedTime}
                </p>
              )}

              <label htmlFor="reason">
                Reason for Appointment
              </label>

              <textarea
                id="reason"
                rows="4"
                value={reason}
                onChange={(e) =>
                  setReason(e.target.value)
                }
                placeholder="Describe your reason for visiting"
                required
              />

              <button
                type="submit"
                className="booking-back"
                disabled={
                  submitting ||
                  loadingSlots ||
                  !selectedTime ||
                  !reason.trim()
                }
              >
                {submitting
                  ? "Booking..."
                  : "Confirm Appointment"}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

export default BookAppointment;
