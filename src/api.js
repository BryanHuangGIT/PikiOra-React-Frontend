import axios from "axios";

const api = axios.create({
  baseURL: "https://pikioraappointmentmanagementsystem.onrender.com/api/",
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }

  return config;
});

export default api;