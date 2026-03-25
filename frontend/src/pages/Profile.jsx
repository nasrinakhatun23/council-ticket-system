import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import Navbar from "../components/nav";

function Profile({ onLogout }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total_tickets: 0,
    total_votes: 0,
    resolved_tickets: 0
  });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userRes, analyticsRes] = await Promise.all([
          api.get("/auth/me").catch(() => ({ data: null })),
          api.get("/analytics/summary").catch(() => ({ data: null }))
        ]);
        setUser(userRes.data);
        if (analyticsRes.data) {
          setStats({
            total_tickets: analyticsRes.data.total_tickets || 0,
            total_votes: analyticsRes.data.total_votes || 0,
            resolved_tickets: analyticsRes.data.resolved_tickets || 0
          });
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleLogout = () => {
    api.post("/auth/logout").catch(() => null);
    onLogout?.();
    navigate("/login");
  };

  const avatar = user?.name?.charAt(0).toUpperCase() || "S";

  if (loading) {
    return (
      <>
        <Navbar userName={user?.name || "Student"} onLogout={handleLogout} currentPath="/profile" />
        <div className="profile-page">
          <div className="loading-state">Loading profile...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar userName={user?.name || "Student"} onLogout={handleLogout} currentPath="/profile" />
      <div className="profile-page">
        <div className="profile-container">
          {/* Header Card */}
          <div className="profile-header-card">
            <div className="profile-avatar-large">{avatar}</div>
            <div className="profile-info">
              <h1>{user?.name || "Student"}</h1>
              <p className="profile-email">{user?.email}</p>
              <p className="profile-joined">Member since 2024</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="profile-stats">
            <div className="stat-card">
              <div className="stat-icon">📋</div>
              <div className="stat-details">
                <div className="stat-number">{stats.total_tickets}</div>
                <div className="stat-label">Tickets Created</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">👍</div>
              <div className="stat-details">
                <div className="stat-number">{stats.total_votes}</div>
                <div className="stat-label">Total Votes</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">✅</div>
              <div className="stat-details">
                <div className="stat-number">{stats.resolved_tickets}</div>
                <div className="stat-label">Resolved</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="profile-actions">
            <button className="action-btn home-btn" onClick={() => navigate("/dashboard")}>
              🏠 Go to Home
            </button>
            <button className="action-btn report-btn" onClick={() => navigate("/create")}>
              📝 Create Ticket
            </button>
            <button className="action-btn logout-btn" onClick={handleLogout}>
              🚪 Logout
            </button>
          </div>

          {/* User Details */}
          <div className="profile-details-card">
            <h2>Account Information</h2>
            <div className="detail-row">
              <span className="detail-label">Name:</span>
              <span className="detail-value">{user?.name || "Not provided"}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Email:</span>
              <span className="detail-value">{user?.email || "Not provided"}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Account Type:</span>
              <span className="detail-value badge">{user?.is_admin ? "Council" : "Student"}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Profile;
