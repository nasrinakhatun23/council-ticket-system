import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api, { API_BASE_URL } from "../api";

function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const oauthFailed = searchParams.get("oauth") === "failed";
  const registeredAccount = searchParams.get("registered") === "1";

  const handleGoogleLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/google/login`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError("Email aur password dono required hain.");
      return;
    }

    try {
      setLoading(true);
      await api.post("/auth/login", {
        email: email.trim(),
        password,
      });
      setError("");
      onLoginSuccess();
      navigate("/dashboard");
    } catch (apiError) {
      const message = apiError?.response?.data?.detail || "Login failed. Try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h2>Council Ticket System</h2>
        <p className="login-subtitle">Sign in to continue</p>

        <form onSubmit={handleSubmit} className="login-form">
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
          {oauthFailed && <p className="login-error">Google login failed. Please try again.</p>}
          {registeredAccount && <p className="login-subtitle">Account already exists. Please login.</p>}

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
          <button type="button" className="login-secondary-button" onClick={handleGoogleLogin}>
            Continue with Google
          </button>

          <p className="auth-switch-text">
            New user?{" "}
            <button
              type="button"
              className="auth-switch-link"
              onClick={() => navigate("/signup")}
            >
              Create account
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;