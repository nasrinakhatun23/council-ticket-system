import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { API_BASE_URL } from "../api";
import "../App.css";

function TicketDetail() {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTicketAndComments();
    fetchCurrentUser();
    
    // Refetch currentUser after a short delay to ensure session is established
    const timer = setTimeout(() => {
      fetchCurrentUser();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [id]);

  useEffect(() => {
    console.log("State updated - currentUser:", currentUser, "Comments:", comments);
    if (currentUser && comments.length > 0) {
      console.log("Match check:", comments.map(c => ({
        id: c.id, 
        yourId: currentUser.id, 
        commentUserId: c.user_id, 
        match: currentUser.id === c.user_id
      })));
    }
  }, [currentUser, comments]);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        console.log("Current user loaded:", data);
        setCurrentUser(data);
      } else {
        console.error("Failed to fetch current user:", res.status);
      }
    } catch (err) {
      console.error("Error fetching current user:", err);
    }
  };

  const fetchTicketAndComments = async () => {
    try {
      setLoading(true);
      const [ticketRes, commentsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/tickets/${id}`, { credentials: "include" }),
        fetch(`${API_BASE_URL}/tickets/${id}/comments`, { credentials: "include" }),
      ]);

      if (ticketRes.ok) {
        const ticketData = await ticketRes.json();
        setTicket(ticketData);
      }

      if (commentsRes.ok) {
        const commentsData = await commentsRes.json();
        console.log("Comments loaded:", commentsData.comments);
        setComments(commentsData.comments || []);
      }
    } catch (err) {
      setError("Error loading ticket details");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      alert("Comment cannot be empty");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/tickets/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: newComment }),
      });

      if (res.ok) {
        const data = await res.json();
        setComments([
          {
            id: data.id,
            text: data.text,
            user_id: data.user_id || currentUser?.id,
            user_name: data.user_name || currentUser?.name,
            created_at: new Date().toISOString(),
          },
          ...comments,
        ]);
        setNewComment("");
      } else {
        alert("Failed to add comment");
      }
    } catch (err) {
      console.error("Error adding comment:", err);
      alert("Error adding comment");
    }
  };

  const handleEditComment = (commentId, text) => {
    setEditingId(commentId);
    setEditText(text);
  };

  const handleSaveEdit = async (commentId) => {
    if (!editText.trim()) {
      alert("Comment cannot be empty");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/tickets/${id}/comments/${commentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: editText }),
      });

      if (res.ok) {
        setComments(
          comments.map((c) =>
            c.id === commentId ? { ...c, text: editText } : c
          )
        );
        setEditingId(null);
        setEditText("");
      } else {
        alert("Failed to update comment");
      }
    } catch (err) {
      console.error("Error updating comment:", err);
      alert("Error updating comment");
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/tickets/${id}/comments/${commentId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        setComments(comments.filter((c) => c.id !== commentId));
      } else {
        alert("Failed to delete comment");
      }
    } catch (err) {
      console.error("Error deleting comment:", err);
      alert("Error deleting comment");
    }
  };

  if (loading) return <div className="container"><p>Loading...</p></div>;
  if (error) return <div className="container"><p style={{ color: "red" }}>{error}</p></div>;

  return (
    <div className="container">
      {ticket && (
        <div className="card">
          <h2>#{ticket.id}</h2>
          <p><strong>Status:</strong> {ticket.status}</p>

          {ticket.image_url && (
            <img
              src={ticket.image_url}
              alt={ticket.title}
              width="100%"
              style={{ maxHeight: "300px", objectFit: "cover", marginBottom: "1rem" }}
            />
          )}

          <h3>{ticket.title}</h3>
          <p>{ticket.description}</p>

          {/* Comments Section */}
          <hr style={{ margin: "2rem 0" }} />
          <h3>Comments ({comments.length})</h3>

          {/* Debug Info - More Visible */}
          <div style={{ 
            marginBottom: "1rem", 
            padding: "1rem", 
            backgroundColor: "#fff3cd", 
            border: "2px solid #ffc107",
            borderRadius: "4px",
            fontSize: "0.9rem",
            color: "#333"
          }}>
            <p style={{margin: "0 0 0.5rem 0", fontWeight: "bold"}}>
              🔍 Login Status: <span style={{color: currentUser ? "green" : "red"}}>
                {currentUser ? `✓ YES (ID: ${currentUser.id})` : "✗ NO"}
              </span>
            </p>
            {!currentUser && (
              <p style={{margin: "0 0 0.5rem 0", color: "red"}}>
                ⚠️ You are NOT logged in. Edit/Delete buttons will not appear.
              </p>
            )}
            {comments.length > 0 && currentUser && (
              <div style={{marginTop: "0.5rem"}}>
                <p style={{margin: "0.2rem 0"}}>💬 Comments Analysis:</p>
                <ul style={{margin: "0.5rem 0 0 1rem", paddingLeft: 0}}>
                  {comments.slice(0, 3).map(c => (
                    <li key={c.id} style={{margin: "0.3rem 0"}}>
                      Comment {c.id}: Author ID={c.user_id}, Your ID={currentUser.id} 
                      <span style={{marginLeft: "0.5rem", color: currentUser.id === c.user_id ? "green" : "red"}}>
                        {currentUser.id === c.user_id ? "✓ MATCH" : "✗ NO MATCH"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Add Comment Form */}
          <div style={{ marginBottom: "2rem", padding: "1rem", backgroundColor: "#f9f9f9", borderRadius: "8px" }}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              rows="3"
              style={{
                width: "100%",
                padding: "0.5rem",
                marginBottom: "0.5rem",
                fontSize: "1rem",
                fontFamily: "Arial, sans-serif",
              }}
            />
            <button
              onClick={handleAddComment}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Add Comment
            </button>
          </div>

          {/* Comments List */}
          {comments.length === 0 ? (
            <p style={{ color: "#666" }}>No comments yet. Be the first to comment!</p>
          ) : (
            <div>
              {comments.map((comment) => {
                const isEditMode = editingId === comment.id;
                return (
                  <div
                    key={comment.id}
                    style={{
                      marginBottom: "1.5rem",
                      padding: "1rem",
                      border: "1px solid #ddd",
                      borderRadius: "4px",
                      backgroundColor: "#fff",
                    }}
                  >
                    {isEditMode ? (
                      // EDIT MODE
                      <div>
                        <p style={{ margin: "0 0 0.5rem 0" }}>
                          <strong>{comment.user_name}</strong>
                        </p>
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows="3"
                          style={{
                            width: "100%",
                            padding: "0.5rem",
                            marginBottom: "0.5rem",
                            fontSize: "1rem",
                            fontFamily: "Arial, sans-serif",
                          }}
                        />
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            onClick={() => handleSaveEdit(comment.id)}
                            style={{
                              padding: "0.5rem 1rem",
                              backgroundColor: "#28a745",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "0.9rem",
                              fontWeight: "bold",
                            }}
                          >
                            ✓ Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            style={{
                              padding: "0.5rem 1rem",
                              backgroundColor: "#6c757d",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "0.9rem",
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      // VIEW MODE
                      <div>
                        <p style={{ margin: "0 0 0.3rem 0", fontWeight: "bold" }}>
                          {comment.user_name}
                        </p>
                        <p style={{ margin: "0 0 0.8rem 0", color: "#666", fontSize: "0.85rem" }}>
                          {new Date(comment.created_at).toLocaleString()}
                        </p>
                        <p style={{ margin: "0 0 1rem 0", whiteSpace: "pre-wrap", lineHeight: "1.5" }}>
                          {comment.text}
                        </p>
                        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.8rem" }}>
                          <button
                            onClick={() => handleEditComment(comment.id, comment.text)}
                            style={{
                              padding: "0.6rem 1.2rem",
                              backgroundColor: "#ffc107",
                              color: "black",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "0.95rem",
                              fontWeight: "bold",
                            }}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            style={{
                              padding: "0.6rem 1.2rem",
                              backgroundColor: "#dc3545",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "0.95rem",
                              fontWeight: "bold",
                            }}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TicketDetail;