import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import TicketCard from "../components/TicketCard";

function Dashboard({ onLogout }) {
  const [tickets, setTickets] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);
  const avatarMenuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ticketsRes, userRes] = await Promise.all([
          api.get("/tickets").catch(() => ({ data: [] })),
          api.get("/auth/me").catch(() => ({ data: null }))
        ]);
        setTickets(ticketsRes.data || []);
        setCurrentUser(userRes.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(event.target)) {
        setShowLogoutMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeCount = tickets.filter((ticket) => {
    const status = (ticket.status || "").toLowerCase();
    return status !== "resolved" && status !== "done";
  }).length;

  const doneCount = tickets.filter((ticket) => {
    const status = (ticket.status || "").toLowerCase();
    return status === "resolved" || status === "done";
  }).length;

  const workCount = tickets.filter((ticket) => {
    const status = (ticket.status || "").toLowerCase();
    return status === "in progress" || status === "in-progress" || status === "pending";
  }).length;

  const name = currentUser?.name?.trim() || currentUser?.email?.split("@")[0] || "Student";
  const welcomeName = name.split(" ")[0];
  const avatarLetter = name.charAt(0).toUpperCase();

  return (
    <div className="dashboard-page">
      <div className="dashboard-shell">
        <div className="dashboard-top-bar desktop-top-bar">
          <div className="dashboard-title-section">
            <h1 className="dashboard-title">Council Ticket System</h1>
            <p className="dashboard-subtitle">Manage and track all your complaints in one place</p>
          </div>

          <div className="profile-header desktop-profile-header">
            <p className="welcome-text">Welcome {welcomeName} 👋</p>
            <div className="avatar-menu" ref={avatarMenuRef}>
              <button
                className="profile-avatar-top avatar-trigger"
                type="button"
                onClick={() => setShowLogoutMenu((prev) => !prev)}
                aria-label="Open profile menu"
              >
                {avatarLetter}
              </button>
              {showLogoutMenu ? (
                <div className="avatar-dropdown">
                  <button className="logout-btn avatar-logout-btn" onClick={onLogout}>Logout</button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="dashboard-main-grid">
          <div className="dashboard-content">
            <button className="create-new-ticket-btn" onClick={() => navigate("/create")}>
              + Create New Ticket
            </button>

            <div className="latest-issues-title">Latest Issues</div>

            <div className="tickets-container">
              {loading ? (
                <div className="loading-state">Loading tickets...</div>
              ) : tickets.length === 0 ? (
                <div className="empty-state">
                  <p>No tickets yet</p>
                  <p className="empty-subtitle">Create your first ticket to get started</p>
                </div>
              ) : (
                tickets.map((ticket) => (
                  <TicketCard key={ticket.id} ticket={ticket} />
                ))
              )}
            </div>
          </div>

          <aside className="dashboard-sidebar">
            <div className="stats-container desktop-stats">
              <div className="stat-box">
                <div className="stat-label">ACTIVE</div>
                <div className="stat-number">{activeCount}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">DONE</div>
                <div className="stat-number">{doneCount}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">WORK</div>
                <div className="stat-number">{workCount}</div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;