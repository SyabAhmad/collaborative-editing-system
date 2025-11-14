import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { versionAPI } from "../../services/endpoints";
import { formatDate } from "../../utils/helpers";
import "../styles/VersionHistory.css";

const VersionHistory = () => {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const [versions, setVersions] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchVersions();
    fetchContributions();
  }, [documentId]);

  const fetchVersions = async () => {
    setLoading(true);
    try {
      const response = await versionAPI.getVersionHistory(documentId);
      setVersions(response.data || []);
    } catch (err) {
      setError("Failed to load version history");
    } finally {
      setLoading(false);
    }
  };

  const fetchContributions = async () => {
    try {
      const response = await versionAPI.getUserContributions(documentId);
      const contributionList = Array.isArray(response.data)
        ? response.data
        : [];
      setContributions(contributionList);
    } catch (err) {
      console.error("Failed to load contributions:", err);
    }
  };

  const handleRevert = async (versionNumber) => {
    if (window.confirm(`Revert to version ${versionNumber}?`)) {
      try {
        await versionAPI.revertToVersion(documentId, versionNumber);
        alert("Document reverted successfully!");
        fetchVersions();
      } catch (err) {
        setError("Failed to revert version");
      }
    }
  };

  return (
    <div className="version-history">
      <button onClick={() => navigate(-1)} className="back-btn">
        ← Back
      </button>
      <h1>Version History</h1>

      {error && <div className="error-message">{error}</div>}

      <div className="contributions-section">
        <h3>User Contributions</h3>
        {contributions.length === 0 ? (
          <p>No contributions yet</p>
        ) : (
          <div className="contributions-list">
            {contributions.map((contribution) => (
              <div
                key={`${contribution.userId}-${contribution.id}`}
                className="contribution-item"
              >
                <span>User {contribution.userId ?? "Unknown"}:</span>
                <span className="count">
                  {contribution.changesCount ?? 0} changes
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="versions-section">
        <h3>Version Timeline</h3>
        {loading ? (
          <p>Loading versions...</p>
        ) : versions.length === 0 ? (
          <p>No versions yet</p>
        ) : (
          <div className="versions-list">
            {versions.map((version, index) => (
              <div key={version.id} className="version-item">
                <div className="version-info">
                  <h4>Version {versions.length - index}</h4>
                  <p>Created: {formatDate(version.createdAt)}</p>
                  <p>Description: {version.description || "No description"}</p>
                </div>
                <button
                  onClick={() => handleRevert(versions.length - index)}
                  className="revert-btn"
                >
                  Revert to This Version
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VersionHistory;
