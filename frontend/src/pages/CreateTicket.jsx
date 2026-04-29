import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import Navbar from "../components/nav";

function CreateTicket({ onLogout }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("English");
  const [desc, setDesc] = useState("");
  const [location, setLocation] = useState("");
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [possibleDuplicates, setPossibleDuplicates] = useState([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get("/auth/me");
        setCurrentUser(res.data);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const stopCamera = () => {
    // Stop all tracks so camera indicator turns off immediately.
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    const startCamera = async () => {
      if (!cameraOpen) {
        stopCamera();
        return;
      }

      try {
        setCameraError("");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (error) {
        setCameraOpen(false);
        setCameraError("Camera access nahi mil paya. Browser permission allow karein.");
      }
    };

    startCamera();

    return () => {
      stopCamera();
    };
  }, [cameraOpen]);

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError("Camera frame load nahi hua. Thoda wait karke retry karein.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setCameraError("Image capture supported nahi hai.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraError("Photo capture fail ho gaya. Dobara try karein.");
          return;
        }
        const capturedFile = new File([blob], `camera-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        setFile(capturedFile);
        setCameraOpen(false);
      },
      "image/jpeg",
      0.92
    );
  };

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

    if (!title.trim() || !desc.trim() || !location) {
      alert("Title, description aur location required hain.");
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
    if (file) {
      formData.append("file", file);
    }

    try {
      setSubmitting(true);
      await api.post("/tickets", formData);
      alert("Ticket Created");
      setTitle("");
      setCategory("English");
      setDesc("");
      setLocation("");
      setFile(null);
      setPossibleDuplicates([]);
    } catch (error) {
      const message = error?.response?.data?.detail
        || (error?.code === "ECONNABORTED"
          ? "Ticket submit timeout hua. Backend cold start ya Cloudinary upload slow ho sakta hai. Dobara try karein."
          : "Ticket submit failed. Backend/Cloudinary config check karein.");
      alert(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navbar userName={currentUser?.name || "Student"} onLogout={onLogout} currentPath="/create" />
      <div className="create-ticket-page">
        <div className="create-ticket-container">
          <div className="create-ticket-header">
            <h1>Report an Issue</h1>
            <p>Tell us what went wrong so we can help you</p>
          </div>

          <form onSubmit={submit} className="create-ticket-form">
            <div className="form-group">
              <label>Issue Title *</label>
              <input
                className="form-input"
                placeholder="Brief description of the issue"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Category *</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="form-select">
                  <option value="English">English</option>
                  <option value="Life Skill">Life Skill</option>
                  <option value="Placement">Placement</option>
                  <option value="IT">IT</option>
                  <option value="Facility">Facility</option>
                  <option value="Event">Event</option>
                  <option value="Safety">Safety</option>
                  <option value="Onboarding">Onboarding</option>
                  <option value="Kitchen">Kitchen</option>
                  <option value="Academic">Academic</option>
                  <option value="Offboarding">Offboarding</option>
                </select>
              </div>

              <div className="form-group">
                <label>Campus Location *</label>
                <select value={location} onChange={(e) => setLocation(e.target.value)} className="form-select">
                  <option value="">Select Campus</option>
                  <option value="Dantewada Campus">Dantewada Campus</option>
                  <option value="Himachal Campus">Himachal Campus</option>
                  <option value="Kishanganj Campus">Kishanganj Campus</option>
                  <option value="Udaipur Campus">Udaipur Campus</option>
                  <option value="Jashpur Campus">Jashpur Campus</option>
                  <option value="Dharmashala Campus">Dharmashala Campus</option>
                  <option value="Sarjapur Campus">Sarjapur Campus</option>
                  <option value="Pune Campus">Pune Campus</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Description *</label>
              <textarea
                className="form-textarea"
                placeholder="Describe the issue in detail..."
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Add Photo (Optional)</label>
              <div className="file-camera-row">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="form-file"
                />
                <button
                  type="button"
                  className="camera-open-btn"
                  onClick={() => setCameraOpen(true)}
                  disabled={submitting}
                >
                  📷 Use Camera
                </button>
              </div>

              {file ? <p className="selected-file-text">✓ Selected: {file.name}</p> : null}

              {cameraError ? <p className="login-error">⚠️ {cameraError}</p> : null}

              {cameraOpen ? (
                <div className="camera-capture-box">
                  <video ref={videoRef} className="camera-preview" autoPlay playsInline muted />
                  <div className="camera-actions">
                    <button type="button" className="camera-btn capture-btn" onClick={capturePhoto}>
                      📸 Capture
                    </button>
                    <button
                      type="button"
                      className="camera-btn cancel-btn"
                      onClick={() => setCameraOpen(false)}
                    >
                      ✕ Close
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="form-actions">
              <button type="submit" className="submit-btn" disabled={submitting}>
                {submitting ? "Submitting..." : "✓ Submit Ticket"}
              </button>

              <button
                type="button"
                className="check-dup-btn"
                onClick={checkDuplicates}
                disabled={checkingDuplicates || submitting}
              >
                {checkingDuplicates ? "Checking..." : "🔍 Check Duplicates"}
              </button>
            </div>

            {possibleDuplicates.length > 0 ? (
              <div className="duplicate-warning-box">
                <strong>⚠️ Possible Duplicates Found</strong>
                {possibleDuplicates.map((item) => (
                  <p key={item.id}>
                    #{item.id} - {item.title} ({item.category}) - Match: {Math.round(item.score)}%
                  </p>
                ))}
              </div>
            ) : null}
          </form>
        </div>
      </div>
    </>
  );
}

export default CreateTicket;