import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
} from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import PatientDashboard from "./pages/PatientDashboard";
import BookAppointment from "./pages/BookAppointment";
import DoctorDashboard from "./pages/DoctorDashboard";

function Dashboard({ title }) {
  return (
    <div style={{ padding: "40px" }}>
      <h1>{title}</h1>
      <p>
        Login successful! Dashboard features will be added next.
      </p>
      <Link to="/login">Back to Login</Link>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/patient/dashboard"
          element={<PatientDashboard />}
        />
        <Route
          path="/admin/dashboard"
          element={<Dashboard title="Administrator Dashboard" />}
        />
        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />
          <Route
          path="/patient/book/:doctorId"
          element={<BookAppointment />}
        />
        <Route
          path="/doctor/dashboard"
          element={<DoctorDashboard />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
