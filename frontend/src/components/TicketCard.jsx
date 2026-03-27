import { useState } from "react";
import api from "../api";

function TicketCard({
  ticket,
  onVote,
  isVoting = false,
  onStatusChange,
  isStatusUpdating = false,
  onSubmitFeedback,
  isFeedbackSubmitting = false,
  onDelete,
  isDeleting = false,
  isAdmin = false,
  currentUser = null,
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
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [savingCommentId, setSavingCommentId] = useState(null);
  const [deletingCommentId, setDeletingCommentId] = useState(null);
  const [editedAtByCommentId, setEditedAtByCommentId] = useState({});

  const handleFeedbackSubmit = () => {
    onSubmitFeedback?.(ticket.id, Number(rating), "");
  };

  const refreshTicketComments = async () => {
    const commentsRes = await api.get(`/tickets/${ticket.id}/comments`);
    if (commentsRes.data && commentsRes.data.comments) {
      window.dispatchEvent(
        new CustomEvent("commentsUpdated", {
          detail: { ticketId: ticket.id, comments: commentsRes.data.comments },
        })
      );
    }
  };

  const isCommentOwner = (comment) => {
    if (!currentUser || currentUser.id == null) {
      return false;
    }
    return Number(comment.user_id) === Number(currentUser.id);
  };

  const handleCommentSubmit = async () => {
    if (!commentText.trim()) return;
    setIsSubmittingComment(true);
    try {
      console.log(`Attempting to post comment to /tickets/${ticket.id}/comments`);
      const response = await api.post(`/tickets/${ticket.id}/comments`, { text: commentText });
      console.log("Comment posted successfully:", response.data);
      setCommentText("");
      await refreshTicketComments();
    } catch (error) {
      console.error("Full error object:", error);
      console.error("Error response:", error.response);
      console.error("Error message:", error.message);
      const errorMsg = error.response?.data?.detail || error.message || "Failed to post comment";
      alert(`Error: ${errorMsg}`);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const startEditingComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.text || "");
  };

  const cancelEditingComment = () => {
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  const handleSaveComment = async (commentId) => {
    if (!editingCommentText.trim()) {
      alert("Comment cannot be empty");
      return;
    }

    setSavingCommentId(commentId);
    try {
      await api.put(`/tickets/${ticket.id}/comments/${commentId}`, {
        text: editingCommentText,
      });
      setEditedAtByCommentId((prev) => ({ ...prev, [commentId]: new Date().toISOString() }));
      cancelEditingComment();
      await refreshTicketComments();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.message || "Failed to update comment";
      alert(`Error: ${errorMsg}`);
    } finally {
      setSavingCommentId(null);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) {
      return;
    }

    setDeletingCommentId(commentId);
    try {
      await api.delete(`/tickets/${ticket.id}/comments/${commentId}`);
      if (editingCommentId === commentId) {
        cancelEditingComment();
      }
      await refreshTicketComments();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.message || "Failed to delete comment";
      alert(`Error: ${errorMsg}`);
    } finally {
      setDeletingCommentId(null);
    }
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
        {isAdmin && (
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
        )}
        <div className="feedback-summary-row">
          <span className="feedback-label">Rating</span>
          <span className="feedback-value">
            {feedbackAvg ? `${feedbackAvg}/5` : "No ratings"}
            {feedbackCount > 0 ? ` (${feedbackCount})` : ""}
          </span>
        </div>
        <div className="feedback-row">
          <label htmlFor={`rating-${ticket.id}`}>Rate</label>
          <div className="feedback-input-group">
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
            <button
              className="feedback-submit-btn"
              onClick={handleFeedbackSubmit}
              disabled={isFeedbackSubmitting}
            >
              {isFeedbackSubmitting ? "Submitting..." : "Send"}
            </button>
          </div>
        </div>
        <div className="comment-section">
          <label htmlFor={`comment-${ticket.id}`}>
            Add Comment {ticket.comments && ticket.comments.length > 0 && `(${ticket.comments.length})`}
          </label>
          <div className="comment-input-row">
            <input
              id={`comment-${ticket.id}`}
              type="text"
              value={commentText}
              disabled={isSubmittingComment}
              onChange={(event) => setCommentText(event.target.value)}
              placeholder="Add your comment here..."
              onKeyPress={(e) => e.key === 'Enter' && handleCommentSubmit()}
            />
            <button
              type="button"
              className="comment-submit-btn"
              onClick={handleCommentSubmit}
              disabled={isSubmittingComment || !commentText.trim()}
            >
              {isSubmittingComment ? "Posting..." : "Post"}
            </button>
          </div>
          {ticket.comments && Array.isArray(ticket.comments) && ticket.comments.length > 0 ? (
            <div className="comments-list">
              {ticket.comments.map((comment, idx) => (
                <div key={comment.id ?? idx} className="comment-item">
                  <div className="comment-header">
                    <span className="comment-user">{comment.user_name || "Anonymous"}</span>
                    {isCommentOwner(comment) ? <span className="comment-you-badge">You</span> : null}
                  </div>
                  {editingCommentId === comment.id ? (
                    <div className="comment-edit-block">
                      <input
                        type="text"
                        value={editingCommentText}
                        onChange={(event) => setEditingCommentText(event.target.value)}
                        className="comment-edit-input"
                        disabled={savingCommentId === comment.id}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            handleSaveComment(comment.id);
                          }
                        }}
                      />
                      <div className="comment-actions-row">
                        <button
                          type="button"
                          className="comment-action-btn save"
                          onClick={() => handleSaveComment(comment.id)}
                          disabled={savingCommentId === comment.id}
                        >
                          {savingCommentId === comment.id ? "Saving..." : "Save"}
                        </button>
                        <button
                          type="button"
                          className="comment-action-btn cancel"
                          onClick={cancelEditingComment}
                          disabled={savingCommentId === comment.id}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="comment-text">{comment.text}</div>
                      {editedAtByCommentId[comment.id] ? (
                        <div className="comment-meta-row">
                          <span className="comment-edited-tag">Edited</span>
                        </div>
                      ) : null}
                      {isCommentOwner(comment) ? (
                        <div className="comment-actions-row">
                          <button
                            type="button"
                            className="comment-action-btn edit"
                            onClick={() => startEditingComment(comment)}
                            disabled={deletingCommentId === comment.id}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="comment-action-btn delete"
                            onClick={() => handleDeleteComment(comment.id)}
                            disabled={deletingCommentId === comment.id}
                          >
                            {deletingCommentId === comment.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "8px" }}>
              No comments yet. Be the first to comment!
            </div>
          )}
        </div>
        <small>{ticket.location || "Campus"}</small>
      </div>
    </div>
  );
}

export default TicketCard;