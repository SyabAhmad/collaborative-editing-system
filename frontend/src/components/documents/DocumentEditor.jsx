import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Button,
  Avatar,
  Tooltip,
  Switch,
  FormControlLabel,
} from "@mui/material";
import { Share as ShareIcon } from "@mui/icons-material";
import { useAuth } from "../../context/AuthContext";
import { useDocuments } from "../../context/DocumentContext";
import { documentAPI, versionAPI, authAPI } from "../../services/endpoints";
import "../styles/DocumentEditor.css";

const DocumentEditor = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    subscribeToDocument,
    unsubscribeFromDocument,
    liveUsers,
    onlineUsers,
    lastChange,
  } = useDocuments();

  const [doc, setDoc] = useState(null);
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
  // auto-version removed; manual versioning remains available via button
  const autoSaveTimerRef = useRef(null);
  const [error, setError] = useState("");
  const [lastFetchedContent, setLastFetchedContent] = useState("");
  const [remoteChangeDetected, setRemoteChangeDetected] = useState(false);
  const [remoteContent, setRemoteContent] = useState("");
  const [remoteChangeAuthor, setRemoteChangeAuthor] = useState(null);
  const [remoteChangeIsMine, setRemoteChangeIsMine] = useState(false);

  const contentRef = useRef(content);

  const handleSave = useCallback(async () => {
    if (!content.trim()) {
      setError("Document content cannot be empty");
      return;
    }

    setIsSaving(true);
    try {
      await documentAPI.editDocument(id, user.id, content, "UPDATE");
      // No UI success message – removed per request
      // update last fetched content
      setLastFetchedContent(content);
      // auto-versioning removed
    } catch {
      setError("Failed to save document");
    } finally {
      setIsSaving(false);
    }
  }, [id, user?.id, content]);

  useEffect(() => {
    contentRef.current = content;
    // If autosave enabled, debounce save (3s)
    if (autoSaveEnabled) {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(async () => {
        // Avoid autosave while already saving
        if (!isSaving && contentRef.current.trim()) {
          await handleSave();
          // auto-versioning removed
        }
      }, 2000);
    } else if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [content, autoSaveEnabled, handleSave, isSaving]);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const response = await documentAPI.getDocument(id);
        setDoc(response.data);
        setContent(response.data.content || "");
        setLastFetchedContent(response.data.content || "");
      } catch {
        setError("Failed to load document");
      }
    };

    if (id) {
      fetchDocument();
      if (user) subscribeToDocument(id);
    }
    return () => unsubscribeFromDocument();
  }, [id, user, subscribeToDocument, unsubscribeFromDocument]);
  useEffect(() => {
    if (!lastChange) return;
    console.debug("DocumentEditor: lastChange update", lastChange);
  }, [lastChange]);

  // react to incoming SSE messages centralized in DocumentContext via `lastChange`
  useEffect(() => {
    if (!lastChange) return;
    (async () => {
      try {
        const payload = lastChange; // { document, change }
        const serverContent = payload?.document?.content || "";
        const change = payload?.change;
        // If server content changed since last fetch
        if (serverContent !== lastFetchedContent) {
          // update the doc meta too
          if (payload.document) setDoc(payload.document);
          if (contentRef.current === lastFetchedContent) {
            setContent(serverContent);
            setLastFetchedContent(serverContent);
          } else {
            const isMine = String(change?.userId) === String(user?.id);
            if (import.meta.env.DEV) {
              console.debug(
                "DocumentEditor SSE change userId, local userId:",
                change?.userId,
                user?.id,
                "isMine:",
                isMine
              );
            }
            setRemoteChangeIsMine(isMine);
            // only show remote change banner to others; authors will see a saved status instead
            setRemoteChangeDetected(!isMine);
            setRemoteContent(serverContent);
            // find author from liveUsers / onlineUsers in context
            let author =
              liveUsers.find((u) => u.id === change?.userId) ||
              onlineUsers.find((u) => u.id === change?.userId) ||
              null;
            if (!author && change?.userId) {
              // fallback: fetch user profile once
              try {
                const aresp = await authAPI.getProfile(change.userId);
                author = aresp.data;
              } catch {
                // ignore
              }
            }
            setRemoteChangeAuthor(author);
            if (isMine) {
              // For the author, don't show Apply/Ignore — the author already knows about their changes
              setLastFetchedContent(serverContent);
            }
          }
        }
      } catch {
        // ignore
      }
    })();
  }, [lastChange, lastFetchedContent, liveUsers, onlineUsers, user?.id]);

  // Ctrl+S hotkey: save the document
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSave]);

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
    } catch {
      setError("Failed to create version");
    }
  };

  const handleShareDocument = async () => {
    const shareUrl = `${window.location.origin}/documents/${id}/edit`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert("Document link copied to clipboard!");
    } catch {
      const textArea = window.document.createElement("textarea");
      textArea.value = shareUrl;
      window.document.body.appendChild(textArea);
      textArea.select();
      window.document.execCommand("copy");
      window.document.body.removeChild(textArea);
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
          <h2>{doc?.title || "New Document"}</h2>
          <div className="live-users">
            {onlineUsers
              .filter((u) => u.id !== user?.id)
              .map((u) => (
                <Tooltip key={u.id} title={u.username} placement="bottom">
                  <div
                    className={`live-user ${
                      onlineUsers.find((o) => o.id === u.id) ? "online" : ""
                    }`}
                  >
                    <Avatar sx={{ width: 32, height: 32, fontSize: 14 }}>
                      {u.username?.[0] || "?"}
                    </Avatar>
                  </div>
                </Tooltip>
              ))}
            {/* Show current user only when online */}
            {user && onlineUsers?.find((o) => o.id === user.id) && (
              <Tooltip title={`${user.username} (You)`} placement="bottom">
                <div className={`live-user current-user online`}>
                  <Avatar sx={{ width: 32, height: 32, fontSize: 14 }}>
                    {user.username?.[0] || "U"}
                  </Avatar>
                </div>
              </Tooltip>
            )}
          </div>
        </div>
        <div className="editor-actions">
          <div
            className="autosave-controls"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginRight: "1rem",
            }}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={autoSaveEnabled}
                  onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                />
              }
              label="Auto-save"
            />
            {/* Auto-version toggle removed */}
          </div>
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
      {/* saved/status messages removed per request */}
      {remoteChangeDetected && (
        <div className="remote-update-banner">
          <div className="remote-update-message">
            {remoteChangeAuthor && (
              <Avatar sx={{ width: 24, height: 24, fontSize: 12, mr: 1 }}>
                {remoteChangeAuthor.username?.[0] || "?"}
              </Avatar>
            )}
            {remoteChangeIsMine ? (
              <>
                Your changes were saved
                {remoteChangeAuthor ? ` by ${remoteChangeAuthor.username}` : ""}
                .
              </>
            ) : (
              <>
                Remote changes detected
                {remoteChangeAuthor ? ` by ${remoteChangeAuthor.username}` : ""}
                .
              </>
            )}
          </div>
          <div className="remote-update-actions">
            {!remoteChangeIsMine && (
              <>
                <button
                  className="apply-remote-btn"
                  onClick={() => {
                    setContent(remoteContent);
                    setLastFetchedContent(remoteContent);
                    setRemoteChangeDetected(false);
                  }}
                >
                  Apply Remote
                </button>
                <button
                  className="dismiss-remote-btn"
                  onClick={() => setRemoteChangeDetected(false)}
                >
                  Ignore
                </button>
              </>
            )}
          </div>
        </div>
      )}

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
