import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import DoctorManagement from "./DoctorManagement";
import AvailabilityManagement from "./AvailabilityManagement";
import "./AdminDashboard.css";

function normalizeList(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  return [];
}

function AdminDashboard() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("overview");
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }

    setError("");

    try {
      const [
        doctorsResponse,
        patientsResponse,
        appointmentsResponse,
        availabilityResponse,
      ] = await Promise.all([
        api.get("admin/doctors/"),
        api.get("admin/patients/"),
        api.get("admin/appointments/"),
        api.get("admin/availability/"),
      ]);

      setDoctors(normalizeList(doctorsResponse.data));
      setPatients(normalizeList(patientsResponse.data));
      setAppointments(normalizeList(appointmentsResponse.data));
      setAvailability(normalizeList(availabilityResponse.data));
    } catch (err) {
      console.error("Dashboard loading error:", err);

      if (err.response?.status === 401) {
        setError("Your session has expired. Please log in again.");
      } else if (err.response?.status === 403) {
        setError("Access denied. Administrator account required.");
      } else {
        setError("Unable to load dashboard data. Please try again.");
      }

      throw err;
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadDashboard().catch(() => {
      // loadDashboard already displays the error.
    });
  }, [loadDashboard]);

  const handleLogout = async () => {
    try {
      await api.post("auth/logout/");
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("role");
      sessionStorage.removeItem("username");
      navigate("/login", { replace: true });
    }
  };

  const getDoctorName = (doctorId) => {
    const doctor = doctors.find(
      (item) => item.id === Number(doctorId)
    );

    if (!doctor) {
      return `Doctor #${doctorId}`;
    }

    const name = [
      doctor.user?.first_name,
      doctor.user?.last_name,
    ]
      .filter(Boolean)
      .join(" ");

    return name || doctor.user?.username || `Doctor #${doctorId}`;
  };

  const getPatientName = (patientId) => {
    const patient = patients.find(
      (item) => item.id === Number(patientId)
    );

    if (!patient) {
      return `Patient #${patientId}`;
    }

    const name = [
      patient.user?.first_name,
      patient.user?.last_name,
    ]
      .filter(Boolean)
      .join(" ");

    return name || patient.user?.username || `Patient #${patientId}`;
  };

  const renderOverview = () => {
    const approvedDoctors = doctors.filter(
      (doctor) => doctor.approved === true
    ).length;

    const pendingAppointments = appointments.filter(
      (appointment) => appointment.status === "Pending"
    ).length;

    const stats = [
      ["Total Doctors", doctors.length],
      ["Approved Doctors", approvedDoctors],
      ["Total Patients", patients.length],
      ["Total Appointments", appointments.length],
      ["Pending Appointments", pendingAppointments],
      ["Availability Records", availability.length],
    ];

    return (
      <>
        <h2>Dashboard Overview</h2>

        <p className="admin-description">
          Welcome to the Piki Ora Medical Centre administration system.
        </p>

        <div className="admin-stats-grid">
          {stats.map(([label, value]) => (
            <div className="admin-stat-card" key={label}>
              <h3>{label}</h3>
              <p>{value}</p>
            </div>
          ))}
        </div>

        <div className="admin-info-panel">
          <h3>Administrator Responsibilities</h3>
          <ul>
            <li>Add, edit, deactivate and reactivate doctor profiles.</li>
            <li>Create and manage doctor consultation schedules.</li>
            <li>View all patient appointment bookings.</li>
            <li>Edit, reschedule or cancel appointments.</li>
            <li>Manage patient user accounts.</li>
          </ul>
        </div>
      </>
    );
  };

  const renderAppointments = () => (
    <>
      <h2>Appointment Management</h2>
      <p className="admin-description">
        View all patient appointment bookings.
      </p>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Patient</th>
              <th>Doctor</th>
              <th>Date</th>
              <th>Time</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {appointments.length === 0 ? (
              <tr>
                <td colSpan="6">No appointments found.</td>
              </tr>
            ) : (
              appointments.map((appointment) => (
                <tr key={appointment.id}>
                  <td>{appointment.id}</td>
                  <td>{getPatientName(appointment.patient)}</td>
                  <td>{getDoctorName(appointment.doctor)}</td>
                  <td>{appointment.appointment_date}</td>
                  <td>{appointment.appointment_time}</td>
                  <td>
                    <span className="admin-status">
                      {appointment.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="admin-note">
        Appointment editing and cancellation will be implemented
        in a later stage.
      </p>
    </>
  );

  const renderPatients = () => (
    <>
      <h2>Patient Management</h2>
      <p className="admin-description">
        View registered patient accounts.
      </p>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Email</th>
              <th>Phone</th>
            </tr>
          </thead>

          <tbody>
            {patients.length === 0 ? (
              <tr>
                <td colSpan="4">No patients found.</td>
              </tr>
            ) : (
              patients.map((patient) => (
                <tr key={patient.id}>
                  <td>{patient.id}</td>
                  <td>{patient.user?.username || "N/A"}</td>
                  <td>{patient.user?.email || "N/A"}</td>
                  <td>{patient.phone || "N/A"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="admin-note">
        Patient account management will be implemented in a later stage.
      </p>
    </>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "doctors":
        return (
          <DoctorManagement
            doctors={doctors}
            onRefresh={() => loadDashboard(false)}
          />
        );

      case "availability":
        return (
          <AvailabilityManagement
            availability={availability}
            doctors={doctors}
            onRefresh={() => loadDashboard(false)}
          />
        );

      case "appointments":
        return renderAppointments();

      case "patients":
        return renderPatients();

      default:
        return renderOverview();
    }
  };

  return (
    <div className="admin-dashboard">
      <aside className="admin-sidebar">
        <h1 className="admin-logo">Piki Ora</h1>
        <p className="admin-sidebar-subtitle">
          Administrator Portal
        </p>

        <nav className="admin-navigation">
          {[
            ["overview", "Overview"],
            ["doctors", "Doctors"],
            ["availability", "Availability"],
            ["appointments", "Appointments"],
            ["patients", "Patients"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={activeTab === key ? "active" : ""}
              onClick={() => setActiveTab(key)}
            >
              {label}
            </button>
          ))}
        </nav>

        <button
          type="button"
          className="admin-logout"
          onClick={handleLogout}
        >
          Logout
        </button>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <h1>Administrator Dashboard</h1>
            <p>Manage Piki Ora Medical Centre operations.</p>
          </div>

          <span className="admin-role-label">
            Administrator
          </span>
        </header>

        <section className="admin-content">
          {loading ? (
            <p>Loading administrator data...</p>
          ) : error ? (
            <div className="admin-error">{error}</div>
          ) : (
            renderContent()
          )}
        </section>
      </main>
    </div>
  );
}

export default AdminDashboard;