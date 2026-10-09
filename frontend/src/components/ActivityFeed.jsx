import { useEffect, useState } from "react";
import api from "../api";
import { useSocket } from "../context/SocketContext";

function ActivityFeed() {
  const { socket, connected } = useSocket();

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load saved activities from MySQL
  useEffect(() => {
    const loadActivities = async () => {
      try {
        const response = await api.get("/activity");

        console.log(
          "Activity API Response:",
          response.data
        );

        setActivities(
          response.data.activities || []
        );
      } catch (error) {
        console.error(
          "Activity loading error:",
          error.response?.data || error.message
        );
      } finally {
        setLoading(false);
      }
    };

    loadActivities();
  }, []);

  // Receive new activities without refreshing
  useEffect(() => {
    if (!socket) return;

    const handleActivityUpdate = (activity) => {
      console.log(
        "Live activity received:",
        activity
      );

      setActivities((previous) => [
        activity,
        ...previous,
      ].slice(0, 20));
    };

    socket.on(
      "activity_update",
      handleActivityUpdate
    );

    return () => {
      socket.off(
        "activity_update",
        handleActivityUpdate
      );
    };
  }, [socket]);

  if (loading) {
    return (
      <div className="activity-loading">
        Loading activities...
      </div>
    );
  }

  return (
    <div className="activity-feed">

      <div className="activity-status">
        <span
          className={
            connected
              ? "status-dot connected"
              : "status-dot disconnected"
          }
        />

        {connected
          ? "Live updates connected"
          : "Live updates disconnected"}
      </div>

      {activities.length === 0 ? (
        <div className="placeholder">
          No recent activity
        </div>
      ) : (
        <div className="activity-list">
          {activities.map((activity, index) => (
            <div
              className="activity-item"
              key={activity.id || index}
            >
              <div className="activity-icon">
                {activity.user_name
                  ?.charAt(0)
                  ?.toUpperCase() || "A"}
              </div>

              <div className="activity-content">
                <strong>
                  {activity.user_name ||
                    "System"}
                </strong>

                <p>
                  {activity.action ||
                    "Activity updated"}
                </p>

                {activity.created_at && (
                  <span>
                    {new Date(
                      activity.created_at
                    ).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

export default ActivityFeed;