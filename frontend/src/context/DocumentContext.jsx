import React, { createContext, useContext, useState } from "react";

const DocumentContext = createContext(null);

export const DocumentProvider = ({ children }) => {
  const [documents, setDocuments] = useState([]);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
