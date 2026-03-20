function TicketDetail() {
  return (
    <div className="container">
      <div className="card">
        <h2>#82934</h2>
        <p>Status: In Progress</p>

        <img
          src="https://via.placeholder.com/300"
          width="100%"
        />

        <h3>Description</h3>
        <p>Street light not working...</p>

        <h3>Status Timeline</h3>
        <ul>
          <li>Ticket Raised</li>
          <li>Assigned</li>
          <li>In Progress</li>
        </ul>
      </div>
    </div>
  );
}

export default TicketDetail;