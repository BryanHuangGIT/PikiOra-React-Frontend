import React, {
  useCallback,
  useEffect,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import api from "../api";
import DoctorManagement from "./DoctorManagement";
import AvailabilityManagement from "./AvailabilityManagement";
import AppointmentManagement from "./AppointmentManagement";
import PatientManagement from "./PatientManagement";

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

  const [authorized, setAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [availability, setAvailability] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const handleAuthenticationError = useCallback(
    (err) => {
      if (err.response?.status === 401) {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("role");
        sessionStorage.removeItem("username");

        navigate("/login", { replace: true });
        return true;
      }

      if (err.response?.status === 403) {
        setError(
          "Access denied. Administrator permissions are required."
        );
        return true;
      }

      return false;
    },
    [navigate]
  );

  const loadDashboard = useCallback(
    async (showLoading = true) => {
      if (
        !sessionStorage.getItem("token") ||
        sessionStorage.getItem("role") !== "admin"
      ) {
        navigate("/login", { replace: true });
        return;
      }

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
        setAppointments(
          normalizeList(appointmentsResponse.data)
        );
        setAvailability(
          normalizeList(availabilityResponse.data)
        );
      } catch (err) {
        console.error("Dashboard loading error:", err);

        if (!handleAuthenticationError(err)) {
          setError(
            "Unable to load dashboard data. Please try again."
          );
        }

        throw err;
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    [navigate, handleAuthenticationError]
  );

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    const role = sessionStorage.getItem("role");

    if (!token || role !== "admin") {
      navigate("/login", { replace: true });
      return;
    }

    setAuthorized(true);

    loadDashboard().catch(() => {
      // Error is handled by loadDashboard.
    });
  }, [navigate, loadDashboard]);

  const handleRefresh = async () => {
    await loadDashboard(false);
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

  const renderOverview = () => {
    const approvedDoctors = doctors.filter(
      (doctor) =>
        doctor.approved === true &&
        doctor.user?.is_active !== false
    ).length;

    const activePatients = patients.filter(
      (patient) => patient.user?.is_active !== false
    ).length;

    const pendingAppointments = appointments.filter(
      (appointment) => appointment.status === "Pending"
    ).length;

    const stats = [
      ["Total Doctors", doctors.length],
      ["Approved Active Doctors", approvedDoctors],
      ["Total Patients", patients.length],
      ["Active Patients", activePatients],
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
            <li>
              Add, edit, deactivate and reactivate doctor profiles.
            </li>
            <li>
              Create and manage doctor consultation schedules.
            </li>
            <li>
              View and manage patient appointment bookings.
            </li>
            <li>
              Edit, reschedule and cancel appointments.
            </li>
            <li>
              Manage patient user accounts.
            </li>
          </ul>
        </div>
      </>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case "doctors":
        return (
          <DoctorManagement
            doctors={doctors}
            onRefresh={handleRefresh}
          />
        );

      case "availability":
        return (
          <AvailabilityManagement
            availability={availability}
            doctors={doctors}
            onRefresh={handleRefresh}
          />
        );

      case "appointments":
        return (
          <AppointmentManagement
            appointments={appointments}
            doctors={doctors}
            patients={patients}
            onRefresh={handleRefresh}
          />
        );

      case "patients":
        return (
          <PatientManagement
            patients={patients}
            onRefresh={handleRefresh}
          />
        );

      default:
        return renderOverview();
    }
  };

  // Prevent dashboard content from rendering before
  // the role check has completed.
  if (!authorized) {
    return <p>Checking administrator access...</p>;
  }

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
            <p>
              Manage Piki Ora Medical Centre operations.
            </p>
          </div>

          <span className="admin-role-label">
            Administrator
          </span>
        </header>

        <section className="admin-content">
          {loading ? (
            <p>Loading administrator data...</p>
          ) : error ? (
            <div className="admin-error" role="alert">
              {error}

              <button
                type="button"
                onClick={() => {
                  loadDashboard().catch(() => {});
                }}
              >
                Try Again
              </button>
            </div>
          ) : (
            renderContent()
          )}
        </section>
      </main>
    </div>
  );
}

export default AdminDashboard;