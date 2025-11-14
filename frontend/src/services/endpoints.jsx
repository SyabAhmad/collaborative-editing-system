import apiClient from "./api";

// User Authentication APIs
export const authAPI = {
  register: (userData) => apiClient.post("/users/register", userData),

  login: (credentials) => apiClient.post("/users/authenticate", credentials),

  getProfile: (userId) => apiClient.get(`/users/${userId}`),

  updateProfile: (userId, userData) =>
    apiClient.put(`/users/${userId}`, userData),
};

// Document APIs
export const documentAPI = {
  createDocument: (title, userId) =>
    apiClient.post("/documents", null, { params: { title, userId } }),

  getDocument: (documentId) => apiClient.get(`/documents/${documentId}`),

  getUserDocuments: (userId) => apiClient.get("/documents/user/" + userId),

  editDocument: (documentId, userId, content, operationType = "UPDATE") =>
    apiClient.put(
      `/documents/${documentId}/edit`,
      { content, operationType },
      { params: { userId } }
    ),

  getDocumentChanges: (documentId) =>
    apiClient.get(`/documents/${documentId}/changes`),

  deleteDocument: (documentId) => apiClient.delete(`/documents/${documentId}`),
};

// Version Control APIs
export const versionAPI = {
  createVersion: (documentId, userId, content, description = "") =>
    apiClient.post("/versions", null, {
      params: { documentId, userId, content, description },
    }),

  getVersionHistory: (documentId) =>
    apiClient.get(`/versions/${documentId}/history`),

  revertToVersion: (documentId, versionNumber) =>
    apiClient.get(`/versions/${documentId}/revert/${versionNumber}`),

  getUserContributions: (documentId) =>
    apiClient.get(`/versions/${documentId}/contributions`),
};
