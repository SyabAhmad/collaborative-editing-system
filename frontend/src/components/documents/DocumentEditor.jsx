import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@mui/material";
import { Share as ShareIcon } from "@mui/icons-material";
import { useAuth } from "../../context/AuthContext";
import { documentAPI, versionAPI } from "../../services/endpoints";
import "../styles/DocumentEditor.css";

const DocumentEditor = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedStatus, setSavedStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const response = await documentAPI.getDocument(id);
        setDocument(response.data);
        setContent(response.data.content || "");
      } catch (err) {
        setError("Failed to load document");
      }
    };

    if (id) {
      fetchDocument();
    }
  }, [id]);

  const handleSave = async () => {
    if (!content.trim()) {
      setError("Document content cannot be empty");
      return;
    }

    setIsSaving(true);
    setSavedStatus("");
    try {
      await documentAPI.editDocument(id, user.id, content, "UPDATE");
      setSavedStatus("Document saved successfully!");
      setTimeout(() => setSavedStatus(""), 3000);
    } catch (err) {
      setError("Failed to save document");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateVersion = async () => {
    try {
      await versionAPI.createVersion(
        id,
        user.id,
        content,
        `Version at ${new Date().toLocaleTimeString()}`
      );
      alert("Version created successfully!");
      navigate(`/documents/${id}/versions`);
    } catch (err) {
      setError("Failed to create version");
    }
  };

  const handleShareDocument = async () => {
    const shareUrl = `${window.location.origin}/documents/${id}/edit`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert("Document link copied to clipboard!");
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      alert("Document link copied to clipboard!");
    }
  };

  return (
    <div className="document-editor">
      <div className="editor-header">
        <div>
          <button onClick={() => navigate("/documents")} className="back-btn">
            ← Back
          </button>
          <h2>{document?.title || "New Document"}</h2>
        </div>
        <div className="editor-actions">
          <Button
            variant="outlined"
            startIcon={<ShareIcon />}
            onClick={handleShareDocument}
            sx={{ mr: 1 }}
          >
            Share
          </Button>
          <Button
            variant="outlined"
            onClick={handleCreateVersion}
            sx={{ mr: 1 }}
          >
            Create Version
          </Button>
          <Button variant="contained" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {savedStatus && <div className="success-message">{savedStatus}</div>}

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Start editing your document..."
        className="editor-textarea"
      />
    </div>
  );
};

export default DocumentEditor;
