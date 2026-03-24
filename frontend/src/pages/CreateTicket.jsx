import { useState } from "react";
import api from "../api";

function CreateTicket() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Cleanliness");
  const [desc, setDesc] = useState("");
  const [location, setLocation] = useState("");
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [possibleDuplicates, setPossibleDuplicates] = useState([]);

  const checkDuplicates = async () => {
    if (!title.trim()) {
      setPossibleDuplicates([]);
      return [];
    }

    setCheckingDuplicates(true);
    try {
      const response = await api.post("/tickets/check-duplicates", {
        title,
        description: desc,
        category,
        location,
      });
      const matches = response?.data?.possible_duplicates || [];
      setPossibleDuplicates(matches);
      return matches;
    } catch {
      setPossibleDuplicates([]);
      return [];
    } finally {
      setCheckingDuplicates(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();

    if (!title.trim() || !desc.trim() || !file) {
      alert("Title, description aur file required hain.");
      return;
    }

    const matches = await checkDuplicates();
    if (matches.length > 0) {
      const proceed = window.confirm(
        `Possible duplicate issues found (${matches.length}). Fir bhi naya ticket create karna hai?`
      );
      if (!proceed) {
        return;
      }
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("category", category);
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
      setCategory("Cleanliness");
      setDesc("");
      setLocation("");
      setFile(null);
      setPossibleDuplicates([]);
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

        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="Cleanliness">Cleanliness</option>
          <option value="Water">Water</option>
          <option value="Health">Health</option>
          <option value="Discipline">Discipline</option>
          <option value="General">General</option>
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

        <button
          type="button"
          className="login-secondary-button"
          onClick={checkDuplicates}
          disabled={checkingDuplicates || submitting}
        >
          {checkingDuplicates ? "Checking duplicates..." : "Check Duplicate Issues"}
        </button>

        {possibleDuplicates.length > 0 ? (
          <div className="duplicate-warning-box">
            <strong>Possible Duplicates</strong>
            {possibleDuplicates.map((item) => (
              <p key={item.id}>
                #{item.id} - {item.title} ({item.category}) score {item.score}
              </p>
            ))}
          </div>
        ) : null}
      </form>
    </div>
  );
}

export default CreateTicket;