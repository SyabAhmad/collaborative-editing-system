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
  const sseRef = useRef(null);
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
                // ignore
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
  }, []);

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
