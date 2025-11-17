import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Typography,
  Button,
  TextField,
  Card,
  CardContent,
  CardActions,
  Grid,
  Box,
  Alert,
  Skeleton,
  Fab,
  Tooltip,
  Chip,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  Description as DescriptionIcon,
  Share as ShareIcon,
} from "@mui/icons-material";
import { useAuth } from "../../context/AuthContext";
import { authAPI } from "../../services/endpoints";
import { documentAPI } from "../../services/endpoints";

const DocumentList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [newDocTitle, setNewDocTitle] = useState("");
  const [ownerProfiles, setOwnerProfiles] = useState({});

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const [ownedResp, sharedResp] = await Promise.all([
        documentAPI.getUserDocuments(user.id),
        documentAPI.getSharedDocuments(user.id),
      ]);
      const ownedDocs = ownedResp.data || [];
      const sharedDocs = sharedResp.data || [];
      // merge unique documents (owned + shared) and prefer owned doc fields if duplicates
      const map = new Map();
      ownedDocs.forEach((d) => map.set(d.id, d));
      sharedDocs.forEach((d) => {
        if (!map.has(d.id)) map.set(d.id, d);
      });
      setDocuments(Array.from(map.values()));
    } catch {
      setError("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // For shared documents, fetch owner profile to show 'shared by' info
  useEffect(() => {
    // Collect unique ownerIds for shared docs which are not the current user
    const ownerIds = Array.from(
      new Set(
        documents
          .filter((d) => d.isShared && d.ownerId !== user.id)
          .map((d) => d.ownerId)
      )
    );
    if (ownerIds.length === 0) return;
    let isMounted = true;
    Promise.all(
      ownerIds.map(async (ownerId) => {
        try {
          const resp = await authAPI.getProfile(ownerId);
          return [ownerId, resp.data];
        } catch (err) {
          return [ownerId, null];
        }
      })
    ).then((results) => {
      if (!isMounted) return;
      const map = { ...ownerProfiles };
      results.forEach(([ownerId, profile]) => {
        if (profile) map[ownerId] = profile;
      });
      setOwnerProfiles(map);
    });
    return () => {
      isMounted = false;
    };
  }, [documents, user.id]);

  const handleCreateDocument = async () => {
    if (!newDocTitle.trim()) {
      setError("Please enter a document title");
      return;
    }

    try {
      const response = await documentAPI.createDocument(newDocTitle, user.id);
      setNewDocTitle("");
      navigate(`/documents/${response.data.id}/edit`);
    } catch {
      setError("Failed to create document");
    }
  };

  const handleShareDocument = async (docId) => {
    const shareUrl = `${window.location.origin}/documents/${docId}/edit`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      // Could add a toast notification here
      alert("Document link copied to clipboard!");
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      alert("Document link copied to clipboard!");
    }
  };

  // Return a clean preview string limited to maxChars
  const getPreview = (text, maxChars = 45) => {
    if (!text) return "No content yet...";
    // collapse whitespace and remove newlines so the preview doesn't expand the card
    const cleaned = text.replace(/\s+/g, " ").trim();
    return cleaned.length <= maxChars
      ? cleaned
      : cleaned.substring(0, maxChars) + "...";
  };

  return (
    <Container maxWidth={false}>
      <Box sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            sx={{ fontWeight: 300, color: "text.primary" }}
          >
            My Documents
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Collaborate on documents with your team. Create, edit, and share in
            real-time.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 2, mb: 4, alignItems: "center" }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Enter document title..."
            value={newDocTitle}
            onChange={(e) => setNewDocTitle(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleCreateDocument()}
            sx={{ maxWidth: 400 }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateDocument}
            disabled={!newDocTitle.trim()}
            sx={{ minWidth: 140 }}
          >
            Create Document
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Grid container spacing={3}>
            {[...Array(6)].map((_, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card>
                  <CardContent>
                    <Skeleton
                      variant="text"
                      sx={{ fontSize: "1.5rem", mb: 2 }}
                    />
                    <Skeleton variant="text" />
                    <Skeleton variant="text" />
                    <Skeleton variant="text" width="60%" />
                  </CardContent>
                  <CardActions>
                    <Skeleton variant="rectangular" width={80} height={36} />
                    <Skeleton variant="rectangular" width={80} height={36} />
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : documents.length === 0 ? (
          <Box
            sx={{
              textAlign: "center",
              py: 8,
              px: 2,
            }}
          >
            <DescriptionIcon
              sx={{ fontSize: 64, color: "text.secondary", mb: 2 }}
            />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No documents yet
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 3, textAlign: "center" }}
            >
              Create your first document to get started with collaborative
              editing. Share documents with your team and work together in
              real-time.
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {documents.map((doc) => (
              <Grid item xs={12} sm={6} md={4} key={doc.id}>
                <Card
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    border: "1px solid",
                    borderColor: "divider",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: (theme) => theme.shadows[8],
                      borderColor: "primary.main",
                    },
                  }}
                  onClick={() => navigate(`/documents/${doc.id}/edit`)}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                      <DescriptionIcon sx={{ mr: 1, color: "primary.main" }} />
                      <Typography
                        variant="h6"
                        component="h3"
                        sx={{ flexGrow: 1 }}
                      >
                        {doc.title}
                      </Typography>
                    </Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: "vertical",
                        lineHeight: 1.4,
                        wordBreak: "break-word",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {getPreview(doc.content, 45)}
                    </Typography>
                    <Box
                      sx={{
                        mt: 2,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Box
                        sx={{ display: "flex", gap: 1, alignItems: "center" }}
                      >
                        <Chip
                          label={`ID: ${doc.id}`}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: "0.7rem" }}
                        />
                        {doc.isShared && doc.ownerId !== user.id && (
                          <Tooltip
                            title={`Shared by ${
                              ownerProfiles[doc.ownerId]?.username || "someone"
                            }`}
                          >
                            <Chip
                              label="Remote"
                              size="small"
                              color="info"
                              variant="outlined"
                              sx={{ fontSize: "0.7rem" }}
                            />
                          </Tooltip>
                        )}
                      </Box>
                      {doc.updatedAt && (
                        <Typography variant="caption" color="text.secondary">
                          Updated:{" "}
                          {new Date(doc.updatedAt).toLocaleDateString()}
                        </Typography>
                      )}
                    </Box>
                  </CardContent>
                  <CardActions
                    sx={{ justifyContent: "space-between", px: 2, pb: 2 }}
                  >
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Tooltip title="Edit Document">
                        <Button
                          size="small"
                          startIcon={<EditIcon />}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/documents/${doc.id}/edit`);
                          }}
                        >
                          Edit
                        </Button>
                      </Tooltip>
                      <Tooltip title="Share Document">
                        <Button
                          size="small"
                          startIcon={<ShareIcon />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShareDocument(doc.id);
                          }}
                        >
                          Share
                        </Button>
                      </Tooltip>
                    </Box>
                    <Tooltip title="View Version History">
                      <Button
                        size="small"
                        startIcon={<HistoryIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/documents/${doc.id}/versions`);
                        }}
                      >
                        History
                      </Button>
                    </Tooltip>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Floating Action Button for quick creation */}
        <Tooltip title="Create New Document">
          <Fab
            color="primary"
            sx={{
              position: "fixed",
              bottom: 24,
              right: 24,
              zIndex: 1000,
            }}
            onClick={() => {
              const title = prompt("Enter document title:");
              if (title?.trim()) {
                setNewDocTitle(title.trim());
                handleCreateDocument();
              }
            }}
          >
            <AddIcon />
          </Fab>
        </Tooltip>
      </Box>
    </Container>
  );
};

export default DocumentList;
