import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

function OAuthSuccess({ onGoogleLoginSuccess }) {
  const navigate = useNavigate();

  useEffect(() => {
    const completeGoogleLogin = async () => {
      try {
        await api.get("/auth/me");
        onGoogleLoginSuccess();
        navigate("/dashboard", { replace: true });
      } catch {
        navigate("/login?oauth=failed", { replace: true });
      }
    };

    completeGoogleLogin();
  }, [navigate, onGoogleLoginSuccess]);

  return (
    <div className="login-page">
      <div className="login-card">
        <h2>Google Sign-In</h2>
        <p className="login-subtitle">Please wait, verifying your account...</p>
      </div>
    </div>
  );
}

export default OAuthSuccess;
