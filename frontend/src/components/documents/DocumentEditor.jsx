import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
          <button onClick={handleCreateVersion} className="version-btn">
            Create Version
          </button>
          <button onClick={handleSave} disabled={isSaving} className="save-btn">
            {isSaving ? "Saving..." : "Save"}
          </button>
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
