import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, Avatar, Tooltip } from "@mui/material";
import { Share as ShareIcon } from "@mui/icons-material";
import { useAuth } from "../../context/AuthContext";
import { documentAPI, versionAPI, authAPI } from "../../services/endpoints";
import "../styles/DocumentEditor.css";

const DocumentEditor = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [doc, setDoc] = useState(null);
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedStatus, setSavedStatus] = useState("");
  const [error, setError] = useState("");
  const [lastFetchedContent, setLastFetchedContent] = useState("");
  const [remoteChangeDetected, setRemoteChangeDetected] = useState(false);
  const [remoteContent, setRemoteContent] = useState("");
  const [remoteChangeAuthor, setRemoteChangeAuthor] = useState(null);
  const [liveUsers, setLiveUsers] = useState([]);
  const userCacheRef = useRef({});
  const pollRef = useRef(null);

  const contentRef = useRef(content);
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const response = await documentAPI.getDocument(id);
        setDoc(response.data);
        setContent(response.data.content || "");
        setLastFetchedContent(response.data.content || "");
      } catch (err) {
        setError("Failed to load document");
      }
    };

    if (id) {
      fetchDocument();
    }
  }, [id]);

  // Poll for remote changes (simple polling to support realtime updates)
  useEffect(() => {
    const startPolling = () => {
      if (!id) return;
      if (pollRef.current) return; // avoid multiple intervals
      pollRef.current = setInterval(async () => {
        try {
          const response = await documentAPI.getDocument(id);
          const serverContent = response.data?.content || "";
          // Also fetch recent document changes to determine contributors
          const changesResp = await documentAPI.getDocumentChanges(id);
          const changes = Array.isArray(changesResp.data) ? changesResp.data : [];
          // derive live user ids from recent edits (unique)
          const userIds = Array.from(new Set(changes.map((c) => c.userId)));
          // fetch profiles for the userIds and cache them
          const missingUserIds = userIds.filter((uid) => !userCacheRef.current[uid]);
          if (missingUserIds.length > 0) {
            await Promise.all(
              missingUserIds.map(async (uid) => {
                try {
                  const uresp = await authAPI.getProfile(uid);
                  userCacheRef.current[uid] = uresp.data;
                } catch (err) {
                  // ignore profile fetch errors
                }
              })
            );
          }
          const profiles = userIds
            .map((uid) => userCacheRef.current[uid])
            .filter(Boolean);
          setLiveUsers(profiles);
          // If server content changed since last fetch
          if (serverContent !== lastFetchedContent) {
            // If the user has no unsaved changes, update automatically
            if (contentRef.current === lastFetchedContent) {
              setContent(serverContent);
              setLastFetchedContent(serverContent);
              setSavedStatus("Updated with remote changes");
              setTimeout(() => setSavedStatus(""), 3000);
            } else {
              // If the user has unsaved edits, notify and offer to apply remote changes
              setRemoteChangeDetected(true);
              setRemoteContent(serverContent);
              // find a change that matches the content or fallback to the last change
              const changeForContent =
                changes.find((c) => c.changeContent === serverContent) ||
                changes[changes.length - 1];
              if (changeForContent) {
                const authorId = changeForContent.userId;
                // ensure profile cached
                if (!userCacheRef.current[authorId]) {
                  try {
                    const aresp = await authAPI.getProfile(authorId);
                    userCacheRef.current[authorId] = aresp.data;
                  } catch (err) {
                    // ignore
                  }
                }
                setRemoteChangeAuthor(userCacheRef.current[authorId] || null);
              } else {
                setRemoteChangeAuthor(null);
              }
            }
          }
        } catch (err) {
          // ignore polling errors silently for now
        }
      }, 2000);
    };

    startPolling();
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [id, lastFetchedContent]);

  const handleSave = useCallback(async () => {
    if (!content.trim()) {
      setError("Document content cannot be empty");
      return;
    }

    setIsSaving(true);
    setSavedStatus("");
    try {
      await documentAPI.editDocument(id, user.id, content, "UPDATE");
      setSavedStatus("Document saved successfully!");
      // update last fetched content since save is now persisted
      setLastFetchedContent(content);
      setTimeout(() => setSavedStatus(""), 3000);
    } catch (err) {
      setError("Failed to save document");
    } finally {
      setIsSaving(false);
    }
  }, [id, user?.id, content, setIsSaving, setSavedStatus]);

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
        </div>
            <div className="live-users">
          {liveUsers
            .filter((u) => u.id !== user?.id)
            .map((u) => (
            <Tooltip key={u.id} title={u.username} placement="bottom">
              <div className="live-user">
                <Avatar sx={{ width: 32, height: 32, fontSize: 14 }}>{u.username?.[0] || "?"}</Avatar>
              </div>
            </Tooltip>
          ))}
          {/* Show current user (you) */}
          {user && (
            <Tooltip title={`${user.username} (You)`} placement="bottom">
              <div className="live-user current-user">
                <Avatar sx={{ width: 32, height: 32, fontSize: 14 }}>{user.username?.[0] || "U"}</Avatar>
              </div>
            </Tooltip>
          )}
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
      {remoteChangeDetected && (
        <div className="remote-update-banner">
          <div className="remote-update-message">
            {remoteChangeAuthor && (
              <Avatar sx={{ width: 24, height: 24, fontSize: 12, mr: 1 }}>
                {remoteChangeAuthor.username?.[0] || "?"}
              </Avatar>
            )}
            Remote changes detected{remoteChangeAuthor ? ` by ${remoteChangeAuthor.username}` : ""}.
          </div>
          <div className="remote-update-actions">
            <button
              className="apply-remote-btn"
              onClick={() => {
                setContent(remoteContent);
                setLastFetchedContent(remoteContent);
                setRemoteChangeDetected(false);
                setSavedStatus("Remote changes applied");
                setTimeout(() => setSavedStatus(""), 3000);
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
