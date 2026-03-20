function TicketCard({ ticket }) {
  const status = ticket.status || "Pending";
  const statusClass = status.toLowerCase().replace(/\s+/g, "-");

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
        <small>{ticket.location || "Campus"}</small>
      </div>
    </div>
  );
}

export default TicketCard;