import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import TicketCard from "../components/TicketCard";
import Navbar from "../components/nav";

function Dashboard({ onLogout }) {
  const [tickets, setTickets] = useState([]);
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [votingTicketIds, setVotingTicketIds] = useState([]);
  const [statusUpdatingTicketIds, setStatusUpdatingTicketIds] = useState([]);
  const [feedbackSubmittingTicketIds, setFeedbackSubmittingTicketIds] = useState([]);
  const [deletingTicketIds, setDeletingTicketIds] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ticketsRes, userRes, analyticsRes] = await Promise.all([
          api.get("/tickets").catch(() => ({ data: [] })),
          api.get("/auth/me").catch(() => ({ data: null })),
          api.get("/analytics/summary").catch(() => ({ data: null }))
        ]);
        
        // Fetch comments for each ticket
        const ticketsData = ticketsRes.data || [];
        const ticketsWithComments = await Promise.all(
          ticketsData.map(async (ticket) => {
            try {
              const commentsRes = await api.get(`/tickets/${ticket.id}/comments`);
              console.log(`Fetched comments for ticket ${ticket.id}:`, commentsRes.data);
              const comments = Array.isArray(commentsRes.data?.comments) ? commentsRes.data.comments : [];
              console.log(`Processed comments for ticket ${ticket.id}:`, comments);
              return {
                ...ticket,
                comments,
              };
            } catch (error) {
              console.error(`Error fetching comments for ticket ${ticket.id}:`, error.message);
              return { ...ticket, comments: [] };
            }
          })
        );
        
        console.log("All tickets with comments:", ticketsWithComments);
        setTickets(ticketsWithComments);
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
    const handleCommentsUpdated = async (event) => {
      const { ticketId, comments } = event.detail;
      setTickets((prevTickets) =>
        prevTickets.map((ticket) =>
          ticket.id === ticketId ? { ...ticket, comments } : ticket
        )
      );
      
      // Also update selectedTicket if it's the one being commented on
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket((prevTicket) => ({
          ...prevTicket,
          comments
        }));
      }
    };

    window.addEventListener('commentsUpdated', handleCommentsUpdated);
    return () => window.removeEventListener('commentsUpdated', handleCommentsUpdated);
  }, [selectedTicket]);

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

  const handleDelete = async (ticketId) => {
    if (deletingTicketIds.includes(ticketId)) {
      return;
    }

    if (!window.confirm("Are you sure you want to delete this ticket?")) {
      return;
    }

    setDeletingTicketIds((prev) => [...prev, ticketId]);
    try {
      await api.delete(`/tickets/${ticketId}`);
      setTickets((prevTickets) => prevTickets.filter((ticket) => ticket.id !== ticketId));
      setSelectedTicket(null);

      const analyticsRes = await api.get("/analytics/summary").catch(() => ({ data: null }));
      setAnalytics(analyticsRes.data || null);
    } catch (error) {
      const message = error?.response?.data?.detail || "Delete failed. Try again.";
      alert(message);
    } finally {
      setDeletingTicketIds((prev) => prev.filter((id) => id !== ticketId));
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    if (priorityFilter === "all") {
      return true;
    }
    return (ticket.priority || "Low").toLowerCase() === priorityFilter;
  });

  return (
    <>
      <Navbar userName={name} onLogout={onLogout} currentPath="/dashboard" />
      <div className="dashboard-page">
        <div className="dashboard-shell">
          <div className="dashboard-top-bar desktop-top-bar">
            <div className="dashboard-title-section">
              <div className="title-with-button">
                <h1 className="dashboard-title">My Tickets</h1>
                <button className="create-new-ticket-btn" onClick={() => navigate("/create")}>
                  + Create new ticket 
                </button>
              </div>
              <p className="dashboard-subtitle">Manage and track all your complaints in one place</p>
            </div>
          </div>

        <div className="dashboard-main-grid">
          <div className="dashboard-content">
            <div className="tickets-header-row">
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

              <div className="priority-filter-row">
                <label htmlFor="priority-filter">Filter</label>
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
                <div className="ticket-grid">
                  {filteredTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="ticket-summary-card"
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      {ticket.image_url ? (
                        <img className="ticket-summary-image" src={ticket.image_url} alt={ticket.title} />
                      ) : (
                        <div className="ticket-summary-image ticket-summary-image-empty">
                          <span>📋</span>
                        </div>
                      )}
                      <div className="ticket-summary-content">
                        <h4 className="ticket-summary-title">{ticket.title}</h4>
                        <div className="ticket-summary-badges">
                          <span className={`status-badge ${(ticket.status || "pending").toLowerCase().replace(/\s+/g, "-")}`}>
                            {(ticket.status || "Pending").slice(0, 3).toUpperCase()}
                          </span>
                          <span className={`priority-badge ${(ticket.priority || "low").toLowerCase()}`}>
                            {(ticket.priority || "Low").toUpperCase()}
                          </span>
                        </div>
                        <p className="ticket-summary-location">{ticket.location || "Campus"}</p>
                      </div>
                      <div className="ticket-summary-stats">
                        <div className="stat-item">
                          <span className="stat-value">{ticket.vote_count || 0}</span>
                          <span className="stat-label">Votes</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {selectedTicket && (
          <div className="ticket-detail-modal" onClick={() => setSelectedTicket(null)}>
            <div className="ticket-detail-content" onClick={(e) => e.stopPropagation()}>
              <button className="detail-close-btn" onClick={() => setSelectedTicket(null)}>✕</button>
              <TicketCard
                ticket={selectedTicket}
                onVote={handleVote}
                isVoting={votingTicketIds.includes(selectedTicket.id)}
                onStatusChange={handleStatusChange}
                isStatusUpdating={statusUpdatingTicketIds.includes(selectedTicket.id)}
                onSubmitFeedback={handleSubmitFeedback}
                isFeedbackSubmitting={feedbackSubmittingTicketIds.includes(selectedTicket.id)}
                onDelete={handleDelete}
                isDeleting={deletingTicketIds.includes(selectedTicket.id)}
                isAdmin={currentUser?.is_admin || false}
              />
              <div className="ticket-detail-actions">
                <button 
                  className="detail-submit-btn" 
                  onClick={() => setSelectedTicket(null)}
                >
                  Submit
                </button>
                <button 
                  className="detail-delete-btn" 
                  onClick={() => {
                    handleDelete(selectedTicket.id);
                  }}
                  disabled={deletingTicketIds.includes(selectedTicket.id)}
                >
                  {deletingTicketIds.includes(selectedTicket.id) ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}

export default Dashboard;