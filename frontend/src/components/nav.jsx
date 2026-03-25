import { useNavigate } from "react-router-dom";

function Navbar({ userName = "Student", onLogout, currentPath = "/" }) {
  const navigate = useNavigate();

  const avatarLetter = (userName?.charAt(0) || "S").toUpperCase();

  const isActive = (path) => currentPath === path;

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo Section */}
        <div className="navbar-logo" onClick={() => navigate("/dashboard")}>
          <div className="logo-icon">📋</div>
          <span className="logo-text">Council Tickets</span>
        </div>

        {/* Navigation Links - Shifted to Right */}
        <div className="navbar-links">
          <button 
            className={`nav-link ${isActive("/dashboard") ? "active" : ""}`}
            onClick={() => navigate("/dashboard")}
          >
            🏠 Home
          </button>
          <button 
            className={`nav-link ${isActive("/create") ? "active" : ""}`}
            onClick={() => navigate("/create")}
          >
            📝 Report Issue
          </button>
          <button
            className={`nav-link ${isActive("/profile") ? "active" : ""}`}
            onClick={() => navigate("/profile")}
          >
            👤 Profile
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
