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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { useAuth } from "../../context/AuthContext";
import { documentAPI } from "../../services/endpoints";

const DocumentList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [newDocTitle, setNewDocTitle] = useState("");

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await documentAPI.getUserDocuments(user.id);
      setDocuments(response.data || []);
    } catch {
      setError("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

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

  return (
    <Container maxWidth={false}>
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 300, mb: 4 }}>
          My Documents
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 4, alignItems: 'center' }}>
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
                    <Skeleton variant="text" sx={{ fontSize: '1.5rem', mb: 2 }} />
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
              textAlign: 'center',
              py: 8,
              px: 2,
            }}
          >
            <DescriptionIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No documents yet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Create your first document to get started with collaborative editing.
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {documents.map((doc) => (
              <Grid item xs={12} sm={6} md={4} key={doc.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: (theme) => theme.shadows[8],
                    },
                  }}
                  onClick={() => navigate(`/documents/${doc.id}/edit`)}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <DescriptionIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6" component="h3" sx={{ flexGrow: 1 }}>
                        {doc.title}
                      </Typography>
                    </Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        lineHeight: 1.4,
                      }}
                    >
                      {doc.content?.substring(0, 150) || 'No content yet...'}
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Chip
                        label={`ID: ${doc.id}`}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    </Box>
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
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
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 1000,
            }}
            onClick={() => {
              const title = prompt('Enter document title:');
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
