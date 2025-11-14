import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { versionAPI, authAPI } from "../../services/endpoints";
import { formatDate } from "../../utils/helpers";
import "../styles/VersionHistory.css";

const VersionHistory = () => {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const [versions, setVersions] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userDetails, setUserDetails] = useState({});

  useEffect(() => {
    fetchVersions();
    fetchContributions();
  }, [documentId]);

  const fetchUserDetails = useCallback(
    async (userIds) => {
      const userMap = { ...userDetails };
      for (const userId of userIds) {
        if (!userMap[userId]) {
          try {
            const response = await authAPI.getProfile(userId);
            userMap[userId] = response.data;
          } catch (err) {
            console.error(`Failed to fetch user ${userId}:`, err);
            userMap[userId] = {
              username: `User ${userId}`,
              firstName: "",
              lastName: "",
            };
          }
        }
      }
      setUserDetails(userMap);
    },
    [userDetails]
  );

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await versionAPI.getVersionHistory(documentId);
      const versionList = response.data || [];
      setVersions(versionList);

      // Fetch user details for version creators
      const userIds = [...new Set(versionList.map((v) => v.createdBy))];
      await fetchUserDetails(userIds);
    } catch (err) {
      setError("Failed to load version history");
    } finally {
      setLoading(false);
    }
  }, [documentId, fetchUserDetails]);

  const fetchContributions = useCallback(async () => {
    try {
      const response = await versionAPI.getUserContributions(documentId);
      const contributionList = Array.isArray(response.data)
        ? response.data
        : [];
      setContributions(contributionList);

      // Fetch user details for each contributor
      const userIds = [...new Set(contributionList.map((c) => c.userId))];
      await fetchUserDetails(userIds);
    } catch (err) {
      console.error("Failed to load contributions:", err);
    }
  }, [documentId, fetchUserDetails]);

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
            {contributions.map((contribution) => {
              const user = userDetails[contribution.userId];
              const userName = user
                ? `${user.firstName} ${user.lastName}`.trim() || user.username
                : `User ${contribution.userId ?? "Unknown"}`;
              return (
                <div
                  key={`${contribution.userId}-${contribution.id}`}
                  className="contribution-item"
                >
                  <span>{userName}:</span>
                  <span className="count">
                    {contribution.changesCount ?? 0} changes
                  </span>
                </div>
              );
            })}
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
            {versions.map((version, index) => {
              const user = userDetails[version.createdBy];
              const userName = user
                ? `${user.firstName} ${user.lastName}`.trim() || user.username
                : `User ${version.createdBy ?? "Unknown"}`;
              return (
                <div key={version.id} className="version-item">
                  <div className="version-info">
                    <h4>Version {versions.length - index}</h4>
                    <p>Created by: {userName}</p>
                    <p>Created: {formatDate(version.createdAt)}</p>
                    <p>
                      Description: {version.description || "No description"}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRevert(versions.length - index)}
                    className="revert-btn"
                  >
                    Revert to This Version
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default VersionHistory;
