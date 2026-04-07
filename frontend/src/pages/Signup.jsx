import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { API_BASE_URL } from "../api";

function Signup({ onSignup }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  const handleGoogleSignup = () => {
    window.location.href = `${API_BASE_URL}/auth/google/login`;
  };

  const handleSignup = async (e) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Name, email aur password required hain.");
      return;
    }

    try {
      setLoading(true);
      const response = await api.post("/auth/signup", {
        name: name.trim(),
        email: email.trim(),
        password,
      });
      setError("");
      onSignup();
      if (response?.data?.account_recovered) {
        navigate("/login?recovered=1");
        return;
      }
      navigate("/login");
    } catch (apiError) {
      const message = apiError?.response?.data?.detail || "Signup failed. Backend server run karke try karein.";
      if (typeof message === "string" && message.toLowerCase().includes("already registered")) {
        onSignup();
        navigate("/login?registered=1");
        return;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h2>Create Account</h2>
        <p className="login-subtitle">Sign up to access Council Ticket System</p>

        <form onSubmit={handleSignup} className="login-form">
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? "Creating..." : "Create Account"}
          </button>

          <button
            type="button"
            className="login-secondary-button"
            onClick={handleGoogleSignup}
          >
            Sign up with Google
          </button>

          <p className="auth-switch-text">
            Already have an account?{" "}
            <button
              type="button"
              className="auth-switch-link"
              onClick={() => navigate("/login")}
            >
              Login
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Signup;