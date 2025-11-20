import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
} from "react";
import { useAuth } from "./AuthContext";
import { authAPI, documentAPI } from "../services/endpoints";
import { useCallback } from "react";

const DocumentContext = createContext(null);

export const DocumentProvider = ({ children }) => {
  const [documents, setDocuments] = useState([]);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [liveUsers, setLiveUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [lastChange, setLastChange] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [wsLastError, setWsLastError] = useState(null);
  const sseRef = useRef(null);
  const wsRef = useRef(null);
  const wsGracefulCloseRef = useRef(false);
  const wsReconnectAttemptsRef = useRef({});
  const subscribedDocRef = useRef(null);
  const userCacheRef = useRef({});
  const { user } = useAuth();

  const setCurrentDoc = (doc) => {
    setCurrentDocument(doc);
  };

  const updateDocuments = (docs) => {
    setDocuments(docs);
  };

  const updateVersions = (vers) => {
    setVersions(vers);
  };

  const clearError = () => {
    setError(null);
  };

  // SSE subscription: subscribe to the document's event stream
  const subscribeToDocument = useCallback(
    async (documentId) => {
      if (!documentId) return;
      // If already subscribed to the same document, do nothing
      if (sseRef.current && subscribedDocRef.current === documentId) return;
      // close existing
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
        subscribedDocRef.current = null;
      }

      // Build the stream URL and attach userId as a simple auth approximation
      // Using relative path so dev/proxy handles host/port
      const url = `/api/documents/${documentId}/stream?userId=${user?.id}`;
      const es = new EventSource(url);
      sseRef.current = es;
      subscribedDocRef.current = documentId;

      // initial fetch of contributors (single backend call to avoid repeated DB queries)
      try {
        const changesResp = await documentAPI.getDocumentChanges(documentId);
        const changes = Array.isArray(changesResp.data) ? changesResp.data : [];
        const userIds = Array.from(new Set(changes.map((c) => c.userId)));
        const missingUserIds = userIds.filter(
          (uid) => !userCacheRef.current[uid]
        );
        if (missingUserIds.length > 0) {
          await Promise.all(
            missingUserIds.map(async (uid) => {
              try {
                const uresp = await authAPI.getProfile(uid);
                userCacheRef.current[uid] = uresp.data;
              } catch (err) {
                console.error("Error occurred", err);
              }
            })
          );
        }
        const initialProfiles = userIds
          .map((uid) => userCacheRef.current[uid])
          .filter(Boolean);
        setLiveUsers(initialProfiles);
      } catch (err) {
        // ignore initial fetch errors
      }

      es.onopen = () => {
        // Debug: SSE connection opened
        console.debug("SSE: open for document", documentId, "userId", user?.id);
      };

      // Use named event listener to receive 'document' events sent by server
      es.addEventListener("document", async (event) => {
        try {
          console.debug(
            "SSE: document event received for document",
            documentId
          );
          const payload = JSON.parse(event.data);
          // payload: {document, change}
          if (payload?.change) {
            setLastChange(payload);
            // only add the change author if not present, fetch profile if needed
            const authorId = payload.change.userId;
            if (!userCacheRef.current[authorId]) {
              try {
                const uresp = await authAPI.getProfile(authorId);
                userCacheRef.current[authorId] = uresp.data;
              } catch (err) {
                // ignore profile fetch errors
              }
            }
            const authorProfile = userCacheRef.current[authorId];
            setLiveUsers((prev) => {
              if (!authorProfile) return prev;
              if (prev.find((u) => u.id === authorProfile.id)) return prev;
              return [...prev, authorProfile];
            });
            // Presence events: list of online user ids
            es.addEventListener("presence", async (event) => {
              try {
                const userIds = JSON.parse(event.data);
                if (!Array.isArray(userIds)) return;
                const missing = userIds.filter(
                  (uid) => !userCacheRef.current[uid]
                );
                if (missing.length > 0) {
                  await Promise.all(
                    missing.map(async (uid) => {
                      try {
                        const uresp = await authAPI.getProfile(uid);
                        userCacheRef.current[uid] = uresp.data;
                      } catch (err) {
                        // ignore
                      }
                    })
                  );
                }
                const profiles = userIds
                  .map((uid) => userCacheRef.current[uid])
                  .filter(Boolean);
                setOnlineUsers(profiles);
              } catch (err) {
                // ignore
              }
            });

            // handle init event that includes the current document state
            es.addEventListener("init", (event) => {
              try {
                const documentDTO = JSON.parse(event.data);
                setCurrentDoc(documentDTO);
              } catch (err) {
                // ignore
              }
            });
          }
        } catch (err) {
          // ignore
        }
      });

      es.onerror = (err) => {
        console.error("SSE: error for document", documentId, err);
        // close and cleanup
        if (sseRef.current) {
          sseRef.current.close();
          sseRef.current = null;
          subscribedDocRef.current = null;
          setLiveUsers([]);
          setLastChange(null);
        }
      };

      // WebSocket: for small immediate edit broadcasts
      try {
        const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
        const wsHost = window.location.hostname;
        const wsUrl = `${wsProtocol}://${wsHost}:8083/ws/documents?documentId=${documentId}&userId=${user?.id}`;
        // In dev use direct service first (8083) then fallback to gateway (8081) if handshake fails
        const directUrl = `${wsProtocol}://${wsHost}:8083/ws/documents?documentId=${documentId}&userId=${user?.id}`;
        const gatewayUrl = `${wsProtocol}://${wsHost}:8081/ws/documents?documentId=${documentId}&userId=${user?.id}`;
        if (wsRef.current) {
          try {
            wsRef.current.close();
          } catch (e) {}
        }
        // helper to attempt ws connect with a provided url, returns a Promise that resolves to ws or rejects
        const tryConnect = (url) =>
          new Promise((resolve, reject) => {
            try {
              const w = new WebSocket(url);
              const timeout = setTimeout(() => {
                if (w.readyState !== WebSocket.OPEN) {
                  try {
                    w.close();
                  } catch (e) {}
                  reject(new Error("timeout"));
                }
              }, 1500);
              w.onopen = () => {
                clearTimeout(timeout);
                resolve(w);
              };
              w.onerror = (err) => {
                clearTimeout(timeout);
                try {
                  w.close();
                } catch (e) {}
                reject(err);
              };
            } catch (err) {
              reject(err);
            }
          });

        let ws = null;
        try {
          ws = await tryConnect(directUrl);
          console.debug("WebSocket connected via direct service", directUrl);
        } catch (errDirect) {
          try {
            ws = await tryConnect(gatewayUrl);
            console.debug("WebSocket connected via gateway", gatewayUrl);
          } catch (errGw) {
            console.error(
              "WS connect attempts to direct and gateway failed",
              errDirect,
              errGw
            );
            // fallback behavior: set wsRef null, downstream logic will fall back to SSE
            ws = null;
          }
        }
        if (!ws) {
          // early exit: no WS connection established
          return;
        }
        wsRef.current = ws;
        ws.onopen = () => {
          console.debug("WebSocket: connected to", wsUrl);
          setWsConnected(true);
          const key = String(documentId);
          wsReconnectAttemptsRef.current[key] = 0;
          wsGracefulCloseRef.current = false;

          // Heartbeat mechanism: send ping every 30 seconds
          ws.heartbeatInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              try {
                ws.send(JSON.stringify({ type: "ping" }));
              } catch (e) {
                /* ignore */
              }
            }
          }, 30000);
        };
        ws.onmessage = (ev) => {
          try {
            const payload = JSON.parse(ev.data);
            // payload is {document, change}
            setLastChange(payload);
          } catch (err) {
            // ignore
          }
        };
        ws.onclose = (ev) => {
          wsRef.current = null;
          setWsConnected(false);
          const code = ev?.code ?? "unknown";
          const reason = ev?.reason || null;
          try {
            setWsLastError(reason || `Close code ${code}`);
          } catch (e) {
            /* ignore */
          }

          // mark graceful close (1000) so UI can treat it differently
          wsGracefulCloseRef.current = code === 1000;

          // Clear heartbeat interval
          if (ws.heartbeatInterval) {
            clearInterval(ws.heartbeatInterval);
          }

          // try reconnect a few times for abnormal closures
          const key = String(documentId);
          const attempts = wsReconnectAttemptsRef.current[key] || 0;
          if (!wsGracefulCloseRef.current && attempts < 3) {
            wsReconnectAttemptsRef.current[key] = attempts + 1;
            const backoff = 500 * (attempts + 1);
            setTimeout(() => subscribeToDocument(documentId), backoff);
            console.warn(
              "WebSocket closed, attempting reconnect",
              attempts + 1
            );
          } else if (!wsGracefulCloseRef.current) {
            // give up and rely on SSE
            console.warn(
              "WebSocket reconnect attempts exhausted, falling back to SSE only"
            );
            wsReconnectAttemptsRef.current[key] = 0;
          } else {
            // graceful close: don't mark as error fallback, attempt a gentle reconnect
            console.debug("WebSocket closed gracefully (1000)");
            setTimeout(() => subscribeToDocument(documentId), 1000);
          }
        };
        ws.onerror = (err) => {
          console.error("WebSocket error", err);
          setWsConnected(false);
          try {
            setWsLastError(err?.message || String(err));
          } catch (e) {}

          // Clear heartbeat interval
          if (ws.heartbeatInterval) {
            clearInterval(ws.heartbeatInterval);
          }
        };
      } catch (err) {
        console.error("Failed to open WebSocket", err);
      }
      // Add a short reconnect / diagnostic time in case of immediate close
      // If wsRef set to null by onclose, log the failure
      const connTry = setTimeout(() => {
        if (!wsRef.current) {
          if (wsGracefulCloseRef.current) {
            console.debug(
              "WebSocket closed gracefully before open; not treating as error"
            );
          } else {
            console.warn(
              "WebSocket closed before connection established - fallback to SSE only"
            );
          }
        }
        clearTimeout(connTry);
      }, 1200);
    },
    [user?.id]
  );

  const unsubscribeFromDocument = useCallback(() => {
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
      subscribedDocRef.current = null;
    }
    setLiveUsers([]);
    setLastChange(null);
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {}
      wsRef.current = null;
    }
    setWsConnected(false);
    setWsLastError(null);
  }, []);

  // send a websocket edit message for immediate broadcasting
  const wsSendEdit = useCallback(
    (documentId, userId, content, operationType = "UPDATE") => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN)
        return false;
      try {
        const msg = JSON.stringify({
          documentId,
          userId,
          content,
          operationType,
        });
        wsRef.current.send(msg);
        return true;
      } catch (err) {
        console.error("Failed to send ws edit", err);
        return false;
      }
    },
    []
  );

  return (
    <DocumentContext.Provider
      value={{
        documents,
        currentDocument,
        versions,
        loading,
        error,
        setCurrentDoc,
        updateDocuments,
        updateVersions,
        setLoading,
        setError,
        clearError,
        subscribeToDocument,
        unsubscribeFromDocument,
        liveUsers,
        onlineUsers,
        lastChange,
        wsSendEdit,
        wsRef,
        wsConnected,
        wsLastError,
      }}
    >
      {children}
    </DocumentContext.Provider>
  );
};

export const useDocuments = () => {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error("useDocuments must be used within DocumentProvider");
  }
  return context;
};

export const useDocumentWs = () => {
  const ctx = useContext(DocumentContext);
  if (!ctx)
    throw new Error("useDocumentWs must be used within DocumentProvider");
  return {
    wsSendEdit: ctx.wsSendEdit,
    wsRef: ctx.wsRef,
    wsConnected: ctx.wsConnected,
    wsLastError: ctx.wsLastError,
  };
};
