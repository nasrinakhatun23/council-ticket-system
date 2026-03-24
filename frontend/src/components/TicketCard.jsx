import { useState } from "react";

function TicketCard({
  ticket,
  onVote,
  isVoting = false,
  onStatusChange,
  isStatusUpdating = false,
  onSubmitFeedback,
  isFeedbackSubmitting = false,
}) {
  const status = ticket.status || "Pending";
  const statusClass = status.toLowerCase().replace(/\s+/g, "-");
  const priority = ticket.priority || "Low";
  const priorityClass = priority.toLowerCase();
  const voteCount = Number(ticket.vote_count || 0);
  const category = ticket.category || "General";
  const assignedCouncil = ticket.assigned_council || "General Council";
  const feedbackAvg = ticket.feedback_avg;
  const feedbackCount = Number(ticket.feedback_count || 0);
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");

  const handleFeedbackSubmit = () => {
    const trimmedComment = comment.trim();
    onSubmitFeedback?.(ticket.id, Number(rating), trimmedComment);
    setComment("");
  };

  return (
    <div className="issue-card">
      {ticket.image_url ? (
        <img className="issue-image" src={ticket.image_url} alt={ticket.title} />
      ) : (
        <div className="issue-image issue-image-empty">No Image</div>
      )}

      <div className="issue-content">
        <div className="ticket-badges">
          <span className={`status-pill ${statusClass}`}>{status.toUpperCase()}</span>
          <span className={`priority-pill ${priorityClass}`}>{priority.toUpperCase()}</span>
          {ticket.escalated ? <span className="escalated-pill">ESCALATED</span> : null}
        </div>
        <h5>{ticket.title}</h5>
        <div className="ticket-meta-row">
          <span className="ticket-chip">Category: {category}</span>
          <span className="ticket-chip">Council: {assignedCouncil}</span>
        </div>
        <p>{ticket.description}</p>
        <div className="ticket-actions">
          <button
            type="button"
            className={`vote-btn ${ticket.has_voted ? "voted" : ""}`}
            onClick={() => onVote?.(ticket.id)}
            disabled={isVoting}
          >
            {isVoting ? "Saving..." : ticket.has_voted ? "Voted" : "Vote"}
          </button>
          <span className="vote-count">
            {voteCount} vote{voteCount === 1 ? "" : "s"}
          </span>
        </div>
        <div className="status-row">
          <label htmlFor={`status-${ticket.id}`}>Status</label>
          <select
            id={`status-${ticket.id}`}
            value={status}
            disabled={isStatusUpdating}
            onChange={(event) => onStatusChange?.(ticket.id, event.target.value)}
          >
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
        <div className="feedback-summary-row">
          <span className="feedback-label">Rating</span>
          <span className="feedback-value">
            {feedbackAvg ? `${feedbackAvg}/5` : "No ratings"}
            {feedbackCount > 0 ? ` (${feedbackCount})` : ""}
          </span>
        </div>
        <div className="feedback-row">
          <label htmlFor={`rating-${ticket.id}`}>Rate</label>
          <select
            id={`rating-${ticket.id}`}
            value={rating}
            disabled={isFeedbackSubmitting}
            onChange={(event) => setRating(event.target.value)}
          >
            <option value="5">5 - Excellent</option>
            <option value="4">4 - Good</option>
            <option value="3">3 - Average</option>
            <option value="2">2 - Poor</option>
            <option value="1">1 - Bad</option>
          </select>
          <input
            type="text"
            value={comment}
            disabled={isFeedbackSubmitting}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Optional feedback"
          />
          <button
            type="button"
            className="feedback-submit-btn"
            onClick={handleFeedbackSubmit}
            disabled={isFeedbackSubmitting}
          >
            {isFeedbackSubmitting ? "Saving..." : "Submit"}
          </button>
        </div>
        <small>{ticket.location || "Campus"}</small>
      </div>
    </div>
  );
}

export default TicketCard;