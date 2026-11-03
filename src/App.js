import React, { useState } from "react";
import api from "./api";

function App() {
  const [message, setMessage] = useState("Click the button to test the connection.");

  const testConnection = async () => {
    try {
      const response = await api.get("doctors/");
      setMessage(
        `Successfully connected to Django! Found ${response.data.length} doctors.`
      );
    } catch (error) {
      console.error(error);
      setMessage("Connection failed. Check the browser console.");
    }
  };

  return (
    <div style={{ padding: "40px", textAlign: "center" }}>
      <h1>Piki Ora Medical Centre</h1>
      <h2>React + Django REST Framework</h2>

      <button onClick={testConnection}>
        Test Django Connection
      </button>

      <p>{message}</p>
    </div>
  );
}

export default App;