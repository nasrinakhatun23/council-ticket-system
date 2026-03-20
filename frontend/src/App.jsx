import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import OAuthSuccess from "./pages/OAuthSuccess";
import Dashboard from "./pages/Dashboard";
import CreateTicket from "./pages/CreateTicket";
import api from "./api";
import "./App.css";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        await api.get("/auth/me");
        setIsLoggedIn(true);
      } catch {
        setIsLoggedIn(false);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkSession();
  }, []);

  const handleSignup = () => {
    setIsLoggedIn(false);
  };

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  const handleGoogleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    api.post("/auth/logout").catch(() => null);
    setIsLoggedIn(false);
  };

  if (checkingAuth) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h2>Council Ticket System</h2>
          <p className="login-subtitle">Checking session...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Navigate
              to={isLoggedIn ? "/dashboard" : "/login"}
              replace
            />
          }
        />
        <Route
          path="/signup"
          element={
            isLoggedIn
              ? <Navigate to="/dashboard" replace />
              : <Signup onSignup={handleSignup} />
          }
        />
        <Route
          path="/login"
          element={
            isLoggedIn
              ? <Navigate to="/dashboard" replace />
              : <Login onLoginSuccess={handleLoginSuccess} />
          }
        />
        <Route
          path="/oauth-success"
          element={<OAuthSuccess onGoogleLoginSuccess={handleGoogleLoginSuccess} />}
        />
        <Route
          path="/dashboard"
          element={
            isLoggedIn
              ? <Dashboard onLogout={handleLogout} />
              : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/create"
          element={isLoggedIn ? <CreateTicket /> : <Navigate to="/login" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;