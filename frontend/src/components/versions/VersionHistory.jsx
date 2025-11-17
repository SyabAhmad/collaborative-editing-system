import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { versionAPI, authAPI } from "../../services/endpoints";
import { formatDate } from "../../utils/helpers";
import "../styles/VersionHistory.css";

const normalizeUserId = (rawUserId) => {
  if (rawUserId === null || rawUserId === undefined) return undefined;
  if (typeof rawUserId === "object") {
    return rawUserId.userId ?? rawUserId.id ?? rawUserId.documentId;
  }
  if (typeof rawUserId === "string") {
    const parsed = Number(rawUserId);
    return Number.isNaN(parsed) ? rawUserId : parsed;
  }
  return rawUserId;
};

const normalizeContribution = (contribution, documentId) => {
  if (!contribution || typeof contribution !== "object") return null;
  const userId = normalizeUserId(contribution.userId);
  const normalizedCount =
    typeof contribution.changesCount === "number"
      ? contribution.changesCount
      : Number(contribution.changesCount ?? 0) || 0;

  return {
    ...contribution,
    id:
      contribution.id ??
      `${userId ?? "unknown"}-${
        documentId ?? contribution.documentId ?? "doc"
      }`,
    documentId: contribution.documentId ?? documentId ?? null,
    userId,
    changesCount: normalizedCount,
  };
};

const VersionHistory = () => {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const [versions, setVersions] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userDetails, setUserDetails] = useState({});

  const resolveUserName = useCallback(
    (userId) => {
      const normalizedId = normalizeUserId(userId);
      if (normalizedId === undefined || normalizedId === null) {
        return "User Unknown";
      }

      const user = userDetails[normalizedId];
      if (!user) {
        return `User ${normalizedId}`;
      }

      const fullName = [user.firstName, user.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();
      if (fullName) {
        return fullName;
      }

      return user.username || `User ${normalizedId}`;
    },
    [userDetails]
  );

  useEffect(() => {
    fetchVersions();
    fetchContributions();
  }, [documentId]);

  const fetchUserDetails = useCallback(
    async (userIds) => {
      const normalizedIds = Array.from(
        new Set(
          (userIds || [])
            .map((id) => normalizeUserId(id))
            .filter((id) => id !== undefined && id !== null && !userDetails[id])
        )
      );

      if (!normalizedIds.length) {
        return;
      }

      const updates = {};
      await Promise.all(
        normalizedIds.map(async (userId) => {
          try {
            const response = await authAPI.getProfile(userId);
            updates[userId] = response.data;
          } catch (err) {
            console.error(`Failed to fetch user ${userId}:`, err);
            updates[userId] = {
              username: `User ${userId}`,
              firstName: "",
              lastName: "",
            };
          }
        })
      );

      if (Object.keys(updates).length) {
        setUserDetails((prev) => ({ ...prev, ...updates }));
      }
    },
    [userDetails]
  );

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await versionAPI.getVersionHistory(documentId);
      const versionList = response.data || [];
      setVersions(versionList);

      const userIds = [
        ...new Set(versionList.map((v) => normalizeUserId(v.createdBy))),
      ];
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
      const normalizedList = (Array.isArray(response.data) ? response.data : [])
        .map((item) => normalizeContribution(item, documentId))
        .filter(Boolean);

      setContributions(normalizedList);

      const userIds = [...new Set(normalizedList.map((c) => c.userId))];
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
              const userName = resolveUserName(contribution.userId);
              const changeCount =
                typeof contribution.changesCount === "number"
                  ? contribution.changesCount
                  : Number(contribution.changesCount ?? 0) || 0;
              return (
                <div
                  key={`${contribution.userId ?? "unknown"}-${contribution.id}`}
                  className="contribution-item"
                >
                  <span>{userName}:</span>
                  <span className="count">{changeCount} changes</span>
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
              const userName = resolveUserName(version.createdBy);
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
