function TicketCard({ ticket, onVote, isVoting = false }) {
  const status = ticket.status || "Pending";
  const statusClass = status.toLowerCase().replace(/\s+/g, "-");
  const voteCount = Number(ticket.vote_count || 0);

  return (
    <div className="issue-card">
      {ticket.image_url ? (
        <img className="issue-image" src={ticket.image_url} alt={ticket.title} />
      ) : (
        <div className="issue-image issue-image-empty">No Image</div>
      )}

      <div className="issue-content">
        <span className={`status-pill ${statusClass}`}>{status.toUpperCase()}</span>
        <h5>{ticket.title}</h5>
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
        <small>{ticket.location || "Campus"}</small>
      </div>
    </div>
  );
}

export default TicketCard;