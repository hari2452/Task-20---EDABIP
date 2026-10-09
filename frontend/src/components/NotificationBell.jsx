import { useEffect, useRef, useState } from "react";
import { useSocket } from "../context/SocketContext";
import { useAuth } from "../context/AuthContext";
import api from "../api";

const STORAGE_KEY = "edabip_notifications_read";

function NotificationBell() {
  const { socket, connected } = useSocket();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState([]);
  const dropdownRef = useRef(null);
  const key = `${STORAGE_KEY}_${user?.id ?? "unknown"}`;

  useEffect(() => {
    try {
      setReadIds(JSON.parse(localStorage.getItem(key) || "[]"));
    } catch {
      setReadIds([]);
    }
  }, [key]);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    let active = true;
    api.get("/activity")
      .then(({ data }) => {
        if (!active) return;
        const items = Array.isArray(data) ? data : data.activities || data.activity || data.logs || [];
        setNotifications(items.slice(0, 20));
      })
      .catch((error) => console.error("Notifications loading failed:", error));
    return () => { active = false; };
  }, [user?.id, user?.role]);

  useEffect(() => {
    if (!socket || !user || user.role !== "admin") return;
    const onActivity = (activity) => {
      setNotifications((previous) => {
        const entry = { ...activity, id: activity.id ?? `live-${Date.now()}-${Math.random()}` };
        if (previous.some((item) => item.id === entry.id)) return previous;
        return [entry, ...previous].slice(0, 20);
      });
    };
    socket.on("activity_update", onActivity);
    return () => socket.off("activity_update", onActivity);
  }, [socket, user?.id, user?.role]);

  useEffect(() => {
    const onOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  if (user?.role !== "admin") return null;

  const notificationId = (item) => String(item.id);
  const unread = notifications.filter((item) => !readIds.includes(notificationId(item))).length;
  const saveReadIds = (ids) => {
    setReadIds(ids);
    localStorage.setItem(key, JSON.stringify(ids));
  };
  const markAllRead = () => saveReadIds([...new Set([...readIds, ...notifications.map(notificationId)])]);
  const markRead = (id) => saveReadIds([...new Set([...readIds, String(id)])]);

  return (
    <div ref={dropdownRef} className="notification-bell-wrapper" style={{ position: "relative" }}>
      <button type="button" className="notification-bell-btn" aria-label={`Notifications, ${unread} unread`} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        🔔 {unread > 0 && <span className="notification-badge">{unread > 99 ? "99+" : unread}</span>}
      </button>
      {open && (
        <div className="notification-dropdown" role="region" aria-label="Notifications">
          <div className="notification-header">
            <strong>Notifications</strong>
            <button type="button" onClick={markAllRead} disabled={unread === 0}>Mark all read</button>
          </div>
          <div className="notification-status">{connected ? "● Live updates connected" : "○ Reconnecting…"}</div>
          <div className="notification-list">
            {notifications.length === 0 ? <p className="notification-empty">No activity notifications yet.</p> : notifications.map((item) => (
              <button type="button" key={notificationId(item)} className={`notification-item ${readIds.includes(notificationId(item)) ? "is-read" : "is-unread"}`} onClick={() => markRead(item.id)}>
                <span>{item.action || item.message || "Activity update"}</span>
                <small>{item.user_name || item.user_email || "System"}{item.created_at ? ` · ${new Date(item.created_at).toLocaleString()}` : ""}</small>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
