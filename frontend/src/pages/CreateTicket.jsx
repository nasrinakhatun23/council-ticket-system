import { useEffect, useRef, useState } from "react";
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
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);

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

    if (!title.trim() || !desc.trim() || !location || !file) {
      alert("Title, description, location aur file required hain.");
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

        <select value={location} onChange={(e) => setLocation(e.target.value)}>
          <option value="">Select Campus Location</option>
          <option value="Dantewada Campus">Dantewada Campus</option>
          <option value="Himachal Campus">Himachal Campus</option>
          <option value="Kishanganj Campus">Kishanganj Campus</option>
          <option value="Udaipur Campus">Udaipur Campus</option>
          <option value="Jashpur Campus">Jashpur Campus</option>
          <option value="Dharmashala Campus">Dharmashala Campus</option>
          <option value="Sarjapur Campus">Sarjapur Campus</option>
          <option value="Pune Campus">Pune Campus</option>
        </select>

        <textarea
          placeholder="Description"
          onChange={(e) => setDesc(e.target.value)}
        />

        <div className="file-camera-row">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files[0])}
          />
          <button
            type="button"
            className="camera-open-btn"
            onClick={() => setCameraOpen(true)}
            disabled={submitting}
          >
            Use Camera
          </button>
        </div>

        {file ? <p className="selected-file-text">Selected: {file.name}</p> : null}

        {cameraError ? <p className="login-error">{cameraError}</p> : null}

        {cameraOpen ? (
          <div className="camera-capture-box">
            <video ref={videoRef} className="camera-preview" autoPlay playsInline muted />
            <div className="camera-actions">
              <button type="button" onClick={capturePhoto}>Capture Photo</button>
              <button
                type="button"
                className="login-secondary-button"
                onClick={() => setCameraOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

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