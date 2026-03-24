import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import TicketCard from "../components/TicketCard";

function Dashboard({ onLogout }) {
  const [tickets, setTickets] = useState([]);
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [votingTicketIds, setVotingTicketIds] = useState([]);
  const [statusUpdatingTicketIds, setStatusUpdatingTicketIds] = useState([]);
  const [feedbackSubmittingTicketIds, setFeedbackSubmittingTicketIds] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [showLogoutMenu, setShowLogoutMenu] = useState(false);
  const avatarMenuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ticketsRes, userRes, analyticsRes] = await Promise.all([
          api.get("/tickets").catch(() => ({ data: [] })),
          api.get("/auth/me").catch(() => ({ data: null })),
          api.get("/analytics/summary").catch(() => ({ data: null }))
        ]);
        setTickets(ticketsRes.data || []);
        setCurrentUser(userRes.data);
        setAnalytics(analyticsRes.data || null);
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

  const handleVote = async (ticketId) => {
    if (votingTicketIds.includes(ticketId)) {
      return;
    }

    setVotingTicketIds((prev) => [...prev, ticketId]);
    try {
      const response = await api.post(`/tickets/${ticketId}/vote`);
      const { vote_count, voted, priority, escalated } = response.data;

      setTickets((prevTickets) =>
        prevTickets.map((ticket) =>
          ticket.id === ticketId
            ? { ...ticket, vote_count, priority, escalated, has_voted: voted }
            : ticket
        )
      );
    } catch (error) {
      const message = error?.response?.data?.detail || "Vote failed. Try again.";
      alert(message);
    } finally {
      setVotingTicketIds((prev) => prev.filter((id) => id !== ticketId));
    }
  };

  const handleStatusChange = async (ticketId, status) => {
    if (statusUpdatingTicketIds.includes(ticketId)) {
      return;
    }

    setStatusUpdatingTicketIds((prev) => [...prev, ticketId]);
    try {
      const response = await api.patch(`/tickets/${ticketId}/status`, { status });
      setTickets((prevTickets) =>
        prevTickets.map((ticket) =>
          ticket.id === ticketId ? { ...ticket, ...response.data } : ticket
        )
      );
    } catch (error) {
      const message = error?.response?.data?.detail || "Status update failed. Try again.";
      alert(message);
    } finally {
      setStatusUpdatingTicketIds((prev) => prev.filter((id) => id !== ticketId));
    }
  };

  const handleSubmitFeedback = async (ticketId, rating, comment) => {
    if (feedbackSubmittingTicketIds.includes(ticketId)) {
      return;
    }

    setFeedbackSubmittingTicketIds((prev) => [...prev, ticketId]);
    try {
      const response = await api.post(`/tickets/${ticketId}/feedback`, { rating, comment });
      const { feedback_avg, feedback_count } = response.data;

      setTickets((prevTickets) =>
        prevTickets.map((ticket) =>
          ticket.id === ticketId ? { ...ticket, feedback_avg, feedback_count } : ticket
        )
      );

      const analyticsRes = await api.get("/analytics/summary").catch(() => ({ data: null }));
      setAnalytics(analyticsRes.data || null);
    } catch (error) {
      const message = error?.response?.data?.detail || "Feedback submit failed. Try again.";
      alert(message);
    } finally {
      setFeedbackSubmittingTicketIds((prev) => prev.filter((id) => id !== ticketId));
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    if (priorityFilter === "all") {
      return true;
    }
    return (ticket.priority || "Low").toLowerCase() === priorityFilter;
  });

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

            <div className="priority-filter-row">
              <label htmlFor="priority-filter">Filter by priority</label>
              <select
                id="priority-filter"
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}
              >
                <option value="all">All</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div className="latest-issues-title">Latest Issues</div>

            {analytics ? (
              <div className="analytics-grid">
                <div className="analytics-card">
                  <div className="analytics-label">Resolution Rate</div>
                  <div className="analytics-value">{analytics.resolution_rate || 0}%</div>
                </div>
                <div className="analytics-card">
                  <div className="analytics-label">Escalated</div>
                  <div className="analytics-value">{analytics.escalated_tickets || 0}</div>
                </div>
                <div className="analytics-card">
                  <div className="analytics-label">Votes</div>
                  <div className="analytics-value">{analytics.total_votes || 0}</div>
                </div>
                <div className="analytics-card">
                  <div className="analytics-label">Avg Rating</div>
                  <div className="analytics-value">
                    {analytics.feedback_avg ? `${analytics.feedback_avg}/5` : "No ratings"}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="tickets-container">
              {loading ? (
                <div className="loading-state">Loading tickets...</div>
              ) : filteredTickets.length === 0 ? (
                <div className="empty-state">
                  <p>No tickets found</p>
                  <p className="empty-subtitle">Try selecting a different priority filter</p>
                </div>
              ) : (
                filteredTickets.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    onVote={handleVote}
                    isVoting={votingTicketIds.includes(ticket.id)}
                    onStatusChange={handleStatusChange}
                    isStatusUpdating={statusUpdatingTicketIds.includes(ticket.id)}
                    onSubmitFeedback={handleSubmitFeedback}
                    isFeedbackSubmitting={feedbackSubmittingTicketIds.includes(ticket.id)}
                  />
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