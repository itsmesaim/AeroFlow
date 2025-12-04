// API Configuration
const API_URL = "http://localhost:5000/api";

// Helper function to get token from localStorage
const getToken = () => {
  return localStorage.getItem("token");
};

// Helper function to set token
const setToken = (token) => {
  localStorage.setItem("token", token);
};

// Helper function to remove token
const removeToken = () => {
  localStorage.removeItem("token");
};

// Helper function to get user from localStorage
const getUser = () => {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
};

// Helper function to set user
const setUser = (user) => {
  localStorage.setItem("user", JSON.stringify(user));
};

// Helper function to remove user
const removeUser = () => {
  localStorage.removeItem("user");
};

// Helper function to check if user is logged in
const isLoggedIn = () => {
  return !!getToken();
};

// Helper function to logout
const logout = () => {
  removeToken();
  removeUser();
  window.location.href = "/pages/auth/login.html";
};
