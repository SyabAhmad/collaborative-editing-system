import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Button,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Typography,
  Box,
} from "@mui/material";
import { Share as ShareIcon, People as PeopleIcon } from "@mui/icons-material";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { useAuth } from "../../context/AuthContext";
import { useDocuments } from "../../context/DocumentContext";
import { documentAPI, versionAPI } from "../../services/endpoints";
import {
  InsertOperation,
  DeleteOperation,
  OperationalTransformation,
  applyOperation,
  sanitizeOperation,
  transformAgainstPending,
} from "../../utils/ot";
import "../styles/DocumentEditor.css";

const DocumentEditor = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { setCurrentDoc } = useDocuments();
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  // content state primarily used for debug & saves; the editor will use an uncontrolled DOM-driven approach for typing
  const [content, setContent] = useState("");
  const useUncontrolledEditorRef = useRef(true); // switch: uncontrolled editor for snappy typing
  const isUncontrolled = useUncontrolledEditorRef.current;
  const [isSaving, setIsSaving] = useState(false);
  const [savedStatus, setSavedStatus] = useState("");
  const [error, setError] = useState("");
  const [activeUsers, setActiveUsers] = useState([]);
  const [stompClient, setStompClient] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const generateOpId = () =>
    `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const [, setPendingOps] = useState([]);
  const [currentVersion, setCurrentVersion] = useState(0);
  const pendingOpsRef = useRef([]);
  const currentVersionRef = useRef(currentVersion);
  const textareaRef = useRef(null);
  const lastContentRef = useRef("");
  const sendBufferRef = useRef([]);
  const sendTimerRef = useRef(null);
  const skipQueueRef = useRef([]);
  const compositeRef = useRef(null); // coalesce multi-keystroke into one op

  // Handle incoming edit messages
  const handleIncomingEdit = useCallback(
    (editMessage) => {
      // STOMP messages may send userId as string/number; normalize both sides
      const incomingUserId = Number(editMessage.userId);
      const localUserId = Number(user.id);
      console.log(
        "Incoming edit payload:",
        editMessage,
        "incomingUserId:",
        incomingUserId,
        "localUserId:",
        localUserId
      );

      // If this is our echoed message, treat it as an acknowledgement: remove
      // the corresponding pending op and update the version, but don't reapply
      // the operation to the content (we already applied it optimistically).
      if (incomingUserId === localUserId) {
        const incomingOpId = editMessage.opId;
        setPendingOps((prev) => {
          let idx = -1;
          if (incomingOpId) {
            idx = prev.findIndex((op) => op.opId === incomingOpId);
          }
          if (idx === -1) {
            idx = prev.findIndex((op) => {
              if (op.type === editMessage.operationType) {
                if (op.type === "INSERT") {
                  return (
                    op.position === editMessage.position &&
                    op.content === editMessage.content
                  );
                }
                if (op.type === "DELETE") {
                  return (
                    op.position === editMessage.position &&
                    op.length === editMessage.length
                  );
                }
              }
              return false;
            });
          }
          if (idx >= 0) {
            const newPrev = [...prev];
            newPrev.splice(idx, 1);
            pendingOpsRef.current = newPrev;
            return newPrev;
          }
          // Not matched: warn and return prev
          console.warn(
            "ACK for opId not matched, incomingOpId:",
            incomingOpId,
            "pending:",
            prev.map((o) => o.opId)
          );
          return prev;
        });
        setCurrentVersion(editMessage.version);
        currentVersionRef.current = editMessage.version;
        console.log(
          "Incoming ACK opId:",
          editMessage.opId,
          "matched removed ops (pending):",
          pendingOpsRef.current.map((o) => ({
            opId: o.opId,
            type: o.type,
            pos: o.position,
          }))
        );
        // If no more pending ops, apply any skipped remote ops (like deletes) that we deferred
        if (
          pendingOpsRef.current.length === 0 &&
          skipQueueRef.current.length > 0
        ) {
          console.log(
            "Applying queued remote ops after pending cleared: ids=",
            skipQueueRef.current.map((o) => o.opId)
          );
          skipQueueRef.current.forEach((skippedOp) => {
            setContent((prevContent) => {
              const updated = applyOperation(prevContent, skippedOp);
              lastContentRef.current = updated;
              return updated;
            });
          });
          skipQueueRef.current = [];
        }
        return;
      }

      let operation;
      if (editMessage.operationType === "INSERT") {
        operation = new InsertOperation(
          editMessage.position,
          editMessage.content,
          editMessage.version
        );
      } else if (editMessage.operationType === "DELETE") {
        operation = new DeleteOperation(
          editMessage.position,
          editMessage.length,
          editMessage.version
        );
      }

      if (operation) {
        // Transform against pending operations using ref
        let transformedOp = transformAgainstPending(
          operation,
          pendingOpsRef.current
        );
        // Sanitize transformed op relative to current content length
        transformedOp = sanitizeOperation(
          transformedOp,
          textareaRef.current
            ? textareaRef.current.value.length
            : lastContentRef.current.length
        );

        // Apply to content and attempt to preserve caret/selection
        const savedSelection = textareaRef.current
          ? {
              start: textareaRef.current.selectionStart,
              end: textareaRef.current.selectionEnd,
            }
          : null;
        // use previous content to compute update safely
        // If there are local pending ops, avoid applying remote deletes immediately
        if (
          transformedOp.type === "DELETE" &&
          pendingOpsRef.current.length > 0
        ) {
          console.warn(
            "Skipping remote delete application while there are local pending ops. pendingOpsCount:",
            pendingOpsRef.current.length
          );
          skipQueueRef.current.push(transformedOp);
        } else {
          setContent((prevContent) => {
            const updated = applyOperation(prevContent, transformedOp);
            // update lastContentRef to reflect applied remote change
            lastContentRef.current = updated;
            return updated;
          });
        }
        console.log(
          "Applied remote op",
          transformedOp.opId,
          "type",
          transformedOp.type,
          "pos",
          transformedOp.position,
          "len/content",
          transformedOp.length ?? transformedOp.content,
          "pendingOpsCount:",
          pendingOpsRef.current.length
        );
        if (savedSelection && textareaRef.current) {
          // restore selection after React updates textarea
          setTimeout(() => {
            const len = textareaRef.current.value.length;
            const start = Math.min(savedSelection.start, len);
            const end = Math.min(savedSelection.end, len);
            textareaRef.current.setSelectionRange(start, end);
          }, 0);
        }

        // Update pending operations
        setPendingOps((prev) => {
          const newPrev = prev.map((op) =>
            OperationalTransformation.transform(op, transformedOp)
          );
          pendingOpsRef.current = newPrev;
          return newPrev;
        });

        // Update version
        setCurrentVersion(editMessage.version);
        currentVersionRef.current = editMessage.version;
      }
    },
    [user.id]
  );

  // Handle presence updates
  const handlePresenceUpdate = useCallback((presenceMessage) => {
    if (presenceMessage.action === "JOIN") {
      setActiveUsers((prev) => [
        ...prev.filter((u) => u.id !== presenceMessage.userId),
        { id: presenceMessage.userId, name: `User ${presenceMessage.userId}` },
      ]);
    } else if (presenceMessage.action === "LEAVE") {
      setActiveUsers((prev) =>
        prev.filter((u) => u.id !== presenceMessage.userId)
      );
    }
  }, []);

  // WebSocket connection
  const connectWebSocket = useCallback(() => {
    const wsUrl = "http://localhost:8081/ws";
    console.log("Attempting to connect to WebSocket at:", wsUrl);
    const socket = new SockJS(wsUrl);
    const client = new Client({
      webSocketFactory: () => socket,
      debug: (str) => console.log("STOMP Debug:", str),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    client.onConnect = () => {
      setIsConnected(true);
      console.log("WebSocket connected successfully");

      // Subscribe to document edits
      client.subscribe(`/topic/documents/${id}`, (message) => {
        const editMessage = JSON.parse(message.body);
        console.log(
          "Received edit message:",
          editMessage,
          "opId:",
          editMessage.opId
        );
        handleIncomingEdit(editMessage);
      });

      // Subscribe to presence updates
      client.subscribe(`/topic/documents/${id}/presence`, (message) => {
        const presenceMessage = JSON.parse(message.body);
        console.log("Received presence message:", presenceMessage);
        handlePresenceUpdate(presenceMessage);
      });

      // Send join message
      console.log("Sending join message for user:", user.id);
      client.publish({
        destination: `/app/documents/${id}/join`,
        body: JSON.stringify({ userId: user.id }),
      });
    };

    client.onStompError = (frame) => {
      console.error("STOMP error:", frame);
      setIsConnected(false);
    };

    client.onWebSocketClose = () => {
      console.log("WebSocket closed");
      setIsConnected(false);
    };

    client.onWebSocketError = (error) => {
      console.error("WebSocket error:", error);
    };

    client.activate();
    setStompClient(client);

    return () => {
      if (client) {
        // Flush any buffered sends using this client before deactivating
        if (sendBufferRef.current.length) {
          sendBufferRef.current.forEach((op) => {
            const msg = {
              userId: user.id,
              operationType: op.type,
              position: op.position,
              content: op.type === "INSERT" ? op.content : null,
              length: op.type === "DELETE" ? op.length : null,
              version: op.version ?? currentVersionRef.current,
            };
            client.publish({
              destination: `/app/documents/${id}/edit`,
              body: JSON.stringify(msg),
            });
          });
          sendBufferRef.current = [];
        }
        if (sendTimerRef.current) {
          clearTimeout(sendTimerRef.current);
          sendTimerRef.current = null;
        }
        client.deactivate();
      }
    };
  }, [id, user.id, handleIncomingEdit, handlePresenceUpdate]);

  // (duplicate handlers removed; definitions are earlier to avoid init order issues.)

  // Send local edit
  const flushSendBuffer = useCallback(() => {
    // flush composite op into buffer if it exists
    if (compositeRef.current) {
      // ensure composite op has opId and version before sending
      const compositeOp = compositeRef.current;
      compositeOp.version = compositeOp.version ?? currentVersionRef.current;
      if (!compositeOp.opId) compositeOp.opId = generateOpId();
      sendBufferRef.current.push(compositeOp);
      compositeRef.current = null;
    }
    if (!stompClient || !isConnected) return;
    const buffer = sendBufferRef.current;
    if (!buffer.length) return;
    // publish in order
    console.log(
      "Flushing send buffer, ids:",
      buffer.map((b) => b.opId)
    );
    buffer.forEach((op) => {
      const msg = {
        userId: user.id,
        operationType: op.type,
        position: op.position,
        content: op.type === "INSERT" ? op.content : null,
        length: op.type === "DELETE" ? op.length : null,
        version: op.version ?? currentVersionRef.current,
        opId: op.opId,
      };
      console.log("Sending op msg:", JSON.stringify(msg));
      stompClient.publish({
        destination: `/app/documents/${id}/edit`,
        body: JSON.stringify(msg),
      });
    });
    sendBufferRef.current = [];
    if (sendTimerRef.current) {
      clearTimeout(sendTimerRef.current);
      sendTimerRef.current = null;
    }
  }, [stompClient, isConnected, user.id, id]);

  const sendEdit = useCallback(
    (operation) => {
      // Buffer and debounce send
      if (!operation.opId) operation.opId = generateOpId();
      // Simple coalescing: merge with last buffered insert if contiguous
      const buffer = sendBufferRef.current;
      const last = buffer[buffer.length - 1];
      let merged = false;
      if (
        last &&
        last.type === "INSERT" &&
        operation.type === "INSERT" &&
        last.position + last.content.length === operation.position
      ) {
        // merge into last
        last.content = last.content + operation.content;
        // update pending ops to reflect new merged content (don't append another op)
        setPendingOps((prev) => {
          const newPrev = [...prev];
          const idx = newPrev.findIndex((op) => op.opId === last.opId);
          if (idx >= 0) {
            newPrev[idx] = { ...newPrev[idx], content: last.content };
            pendingOpsRef.current = newPrev;
            return newPrev;
          }
          return prev;
        });
        merged = true;
      } else {
        buffer.push(operation);
      }
      // Add to pending operations for OT
      if (!merged) {
        operation.version = currentVersionRef.current;
        setPendingOps((prev) => {
          const newPrev = [...prev, operation];
          pendingOpsRef.current = newPrev;
          return newPrev;
        });
      }
      // If too many pending ops (network/ack issue), flush immediately to try to recover
      if (pendingOpsRef.current.length > 20) {
        console.warn(
          "High pending op count, flushing buffer immediately to recover."
        );
        flushSendBuffer();
      }
      console.log(
        "Buffered op",
        operation.opId,
        "pendingOpsCount:",
        pendingOpsRef.current.length
      );
      if (sendTimerRef.current) {
        clearTimeout(sendTimerRef.current);
      }
      sendTimerRef.current = setTimeout(() => {
        flushSendBuffer();
      }, 300);
    },
    [flushSendBuffer]
  );

  // Handle textarea changes with OT
  const handleContentChange = useCallback(
    (e) => {
      const newContent = e.target.value;
      const oldContent = lastContentRef.current;
      console.log(
        "Local change: newLen=",
        newContent.length,
        "oldLen=",
        oldContent.length,
        "pendingOps=",
        pendingOpsRef.current.length,
        "buffered=",
        sendBufferRef.current.length,
        "newContent(escaped)=",
        newContent.replace(/\n/g, "\\n")
      );

      // Simple diff to detect insert/delete
      let operation = null;
      // Use a robust diff: compute common prefix and suffix, support replace
      const minLen = Math.min(oldContent.length, newContent.length);
      let prefix = 0;
      while (
        prefix < minLen &&
        oldContent.charAt(prefix) === newContent.charAt(prefix)
      ) {
        prefix++;
      }
      let suffix = 0;
      while (
        suffix < minLen - prefix &&
        oldContent.charAt(oldContent.length - 1 - suffix) ===
          newContent.charAt(newContent.length - 1 - suffix)
      ) {
        suffix++;
      }
      const oldMiddleLen = oldContent.length - prefix - suffix;
      const newMiddleLen = newContent.length - prefix - suffix;

      if (oldMiddleLen === 0 && newMiddleLen > 0) {
        // pure insert
        const insertPos = prefix;
        const inserted = newContent.slice(prefix, newContent.length - suffix);
        operation = new InsertOperation(
          insertPos,
          inserted,
          currentVersionRef.current
        );
        operation.opId = generateOpId();
        // Try to coalesce into composite insert
        if (
          compositeRef.current &&
          compositeRef.current.type === "INSERT" &&
          compositeRef.current.position +
            compositeRef.current.content.length ===
            operation.position
        ) {
          compositeRef.current.content += operation.content;
          console.log(
            "Coalesced into composite insert:",
            compositeRef.current.opId
          );
        } else {
          // flush existing composite if different type/position
          if (compositeRef.current) {
            sendEdit(compositeRef.current);
          }
          compositeRef.current = operation;
        }
      } else if (oldMiddleLen > 0 && newMiddleLen === 0) {
        // pure delete
        const deletePos = prefix;
        const deletedLength = oldMiddleLen;
        operation = new DeleteOperation(
          deletePos,
          deletedLength,
          currentVersionRef.current
        );
        operation.opId = generateOpId();
        // flush any composite inserts before sending delete
        if (compositeRef.current) {
          sendEdit(compositeRef.current);
          compositeRef.current = null;
        }
        sendEdit(operation);
      } else if (oldMiddleLen > 0 && newMiddleLen > 0) {
        // Replace: send delete then insert
        const deletePos = prefix;
        const deletedLength = oldMiddleLen;
        const inserted = newContent.slice(prefix, newContent.length - suffix);
        const delOp = new DeleteOperation(
          deletePos,
          deletedLength,
          currentVersionRef.current
        );
        delOp.opId = generateOpId();
        if (compositeRef.current) {
          sendEdit(compositeRef.current);
          compositeRef.current = null;
        }
        sendEdit(delOp);
        const insOp = new InsertOperation(
          deletePos,
          inserted,
          currentVersionRef.current
        );
        insOp.opId = generateOpId();
        // sendEdit will coalesce if appropriate
        sendEdit(insOp);
      }

      if (isUncontrolled) {
        // Update DOM value directly for snappy typing and set last content ref; avoid re-rendering
        lastContentRef.current = newContent;
        if (textareaRef.current) textareaRef.current.value = newContent;
      } else {
        setContent(newContent);
        lastContentRef.current = newContent;
      }
      // Check DOM textarea value after React updates
      setTimeout(() => {
        const domVal = textareaRef.current ? textareaRef.current.value : null;
        console.log(
          "After setContent: state content=",
          newContent,
          "DOM textarea.value=",
          domVal
        );
      }, 0);
    },
    [sendEdit, isUncontrolled]
  );

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const response = await documentAPI.getDocument(id);
        setDocument(response.data);
        setContent(response.data.content || "");
        lastContentRef.current = response.data.content || "";
        // Initialize version and ref
        const initialVersion = response.data.version ?? 0;
        setCurrentVersion(initialVersion);
        currentVersionRef.current = initialVersion;
        setCurrentDoc(response.data);
      } catch (err) {
        console.error("Failed to load document:", err);
        setError("Failed to load document");
      }
    };

    if (id) {
      fetchDocument();
    }
  }, [id, setCurrentDoc]);

  // Debug monitor: print state content and DOM value periodically to detect mismatch
  useEffect(() => {
    // Lower the monitor frequency and only log when there's a mismatch or pending ops > 0
    const intervalId = setInterval(() => {
      const domVal = textareaRef.current ? textareaRef.current.value : null;
      const pendingCount = pendingOpsRef.current.length;
      if (domVal !== content || pendingCount > 0) {
        console.log(
          "[MONITOR] state content=",
          content,
          "DOM value=",
          domVal,
          "pending=",
          pendingCount
        );
      }
    }, 1500);
    return () => clearInterval(intervalId);
  }, [content]);

  useEffect(() => {
    if (user && id) {
      console.log(
        "User and document ID available, attempting WebSocket connection"
      );
      const cleanup = connectWebSocket();
      return cleanup;
    }
  }, [user, id, connectWebSocket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stompClient && isConnected) {
        stompClient.publish({
          destination: `/app/documents/${id}/leave`,
          body: JSON.stringify({ userId: user.id }),
        });
      }
    };
  }, [stompClient, isConnected, id, user.id]);

  const handleSave = async () => {
    const savedContent = isUncontrolled
      ? textareaRef.current?.value ?? lastContentRef.current ?? content
      : content;
    if (!savedContent || !savedContent.trim()) {
      setError("Document content cannot be empty");
      return;
    }

    // If there are pending ops, flush and wait briefly for ack to reduce save inconsistencies
    if (pendingOpsRef.current.length > 0) {
      console.log(
        "Pending ops present before save, flushing buffer and waiting for acks (up to 2s)"
      );
      flushSendBuffer();
      await new Promise((resolve) => {
        const start = Date.now();
        const check = () => {
          if (pendingOpsRef.current.length === 0 || Date.now() - start > 2000) {
            resolve();
          } else {
            setTimeout(check, 100);
          }
        };
        setTimeout(check, 50);
      });
    }
    setIsSaving(true);
    setSavedStatus("");
    try {
      console.log("Saving document payload:", {
        documentId: id,
        userId: user.id,
        content: savedContent,
      });
      const response = await documentAPI.editDocument(
        id,
        user.id,
        savedContent,
        "UPDATE"
      );
      // Update local content and version to reflect saved server state
      if (response && response.data) {
        const respContent = response.data.content || savedContent;
        const respVersion = response.data.version ?? currentVersionRef.current;
        setContent(respContent);
        lastContentRef.current = respContent;
        setCurrentVersion(respVersion);
        currentVersionRef.current = respVersion;
      }
      setSavedStatus("Document saved successfully!");
      setTimeout(() => setSavedStatus(""), 3000);
    } catch (err) {
      console.error("Failed to save document:", err);
      setError("Failed to save document");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateVersion = async () => {
    try {
      const savedContent = isUncontrolled
        ? textareaRef.current?.value ?? lastContentRef.current ?? content
        : content;
      await versionAPI.createVersion(
        id,
        user.id,
        savedContent,
        `Version at ${new Date().toLocaleTimeString()}`
      );
      alert("Version created successfully!");
      navigate(`/documents/${id}/versions`);
    } catch (err) {
      console.error("Failed to create version:", err);
      setError("Failed to create version");
    }
  };

  const handleShareDocument = async () => {
    const shareUrl = `${window.location.origin}/documents/${id}/edit`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert("Document link copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
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
          <div className="connection-status">
            <span className={isConnected ? "connected" : "disconnected"}>
              {isConnected ? "● Connected" : "● Disconnected"}
            </span>
            <span style={{ marginLeft: 12, fontSize: 12, color: "#777" }}>
              Pending: {pendingOpsRef.current.length} | Buffered:{" "}
              {sendBufferRef.current.length}
            </span>
          </div>
        </div>
        <div className="editor-actions">
          <Button variant="outlined" startIcon={<PeopleIcon />} sx={{ mr: 1 }}>
            {activeUsers.length} users
          </Button>
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
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isSaving || pendingOpsRef.current.length > 0}
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="editor-content">
        <div className="editor-main">
          {error && <div className="error-message">{error}</div>}
          {savedStatus && <div className="success-message">{savedStatus}</div>}

          <textarea
            ref={textareaRef}
            {...(isUncontrolled
              ? { defaultValue: content }
              : { value: content })}
            onChange={handleContentChange}
            placeholder="Start editing your document..."
            className="editor-textarea"
            onInput={(e) =>
              console.log(
                "onInput event value:",
                e.target.value,
                "textareaRef value:",
                textareaRef.current && textareaRef.current.value
              )
            }
          />
          <div
            style={{
              marginTop: 16,
              padding: 8,
              borderRadius: 4,
              background: "#f6f6f6",
              fontSize: 12,
            }}
          >
            <strong>Debug content:</strong>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
              State: {content}
              {"\n"}
              DOM: {textareaRef.current ? textareaRef.current.value : ""}
            </pre>
            <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
              <div>
                <strong>Buffer (ids):</strong>{" "}
                {JSON.stringify(
                  sendBufferRef.current.map((o) => o.opId).slice(-10)
                )}
              </div>
              <div>
                <strong>Pending count:</strong> {pendingOpsRef.current.length}{" "}
              </div>
              <div>
                <strong>Version:</strong> {currentVersionRef.current}{" "}
              </div>
            </div>
          </div>
        </div>

        <div className="presence-panel">
          <Typography variant="h6" gutterBottom>
            Active Users ({activeUsers.length})
          </Typography>
          <List dense>
            {activeUsers.map((user) => (
              <ListItem key={user.id}>
                <Avatar sx={{ width: 24, height: 24, mr: 1 }}>
                  {user.name.charAt(0).toUpperCase()}
                </Avatar>
                <ListItemText primary={user.name} />
              </ListItem>
            ))}
          </List>
        </div>
      </div>
    </div>
  );
};

export default DocumentEditor;
