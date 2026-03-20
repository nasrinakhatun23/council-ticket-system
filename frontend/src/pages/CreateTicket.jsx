import { useState } from "react";
import api from "../api";

function CreateTicket() {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [location, setLocation] = useState("");
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();

    if (!title.trim() || !desc.trim() || !file) {
      alert("Title, description aur file required hain.");
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", desc);
    formData.append("location", location);
    formData.append("file", file);

    try {
      setSubmitting(true);
      await api.post("/tickets", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      alert("Ticket Created");
      setTitle("");
      setDesc("");
      setLocation("");
      setFile(null);
    } catch (error) {
      const message = error?.response?.data?.detail || "Ticket submit failed. Backend/Cloudinary config check karein.";
      alert(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container">
      <h2>Report an Issue</h2>

      <form onSubmit={submit} className="card">
        <input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <select>
          <option>Select Category</option>
          <option>Water</option>
          <option>Cleanliness</option>
          <option>Health</option>
        </select>

        <input
          placeholder="Location"
          onChange={(e) => setLocation(e.target.value)}
        />

        <textarea
          placeholder="Description"
          onChange={(e) => setDesc(e.target.value)}
        />

        <input type="file" onChange={(e) => setFile(e.target.files[0])} />

        <button type="submit" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit Ticket"}
        </button>
      </form>
    </div>
  );
}

export default CreateTicket;