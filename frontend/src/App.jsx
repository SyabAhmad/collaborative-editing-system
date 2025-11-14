import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { AuthProvider } from "./context/AuthContext";
import { DocumentProvider } from "./context/DocumentContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import DocumentList from "./components/documents/DocumentList";
import DocumentEditor from "./components/documents/DocumentEditor";
import VersionHistory from "./components/versions/VersionHistory";
import theme from "./theme";
import "./App.css";

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <DocumentProvider>
            <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/documents"
              element={
                <ProtectedRoute>
                  <Layout>
                    <DocumentList />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/documents/:id/edit"
              element={
                <ProtectedRoute>
                  <Layout>
                    <DocumentEditor />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/documents/:documentId/versions"
              element={
                <ProtectedRoute>
                  <Layout>
                    <VersionHistory />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/documents" />} />
            </Routes>
          </DocumentProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
