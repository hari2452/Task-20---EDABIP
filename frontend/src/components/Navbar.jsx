import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

import NotificationBell from "./NotificationBell";

import "./notifications.css";
import "./sidebar.css";

const BACKEND_URL = "http://127.0.0.1:5000";

// Convert avatar path into a usable image URL
function getAvatarUrl(avatarUrl) {
  if (!avatarUrl) {
    return null;
  }

  if (
    avatarUrl.startsWith("http://") ||
    avatarUrl.startsWith("https://") ||
    avatarUrl.startsWith("data:")
  ) {
    return avatarUrl;
  }

  const cleanPath = avatarUrl.replace(/\\/g, "/");

  return `${BACKEND_URL}/${
    cleanPath.replace(/^\/+/, "")
  }`;
}

function Navbar() {
  const { user, logout } = useAuth();

  const { theme, toggleTheme } = useTheme();

  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(
    () =>
      localStorage.getItem(
        "edabip_sidebar_collapsed"
      ) === "true"
  );

  const [mobileOpen, setMobileOpen] =
    useState(false);

  const [avatarError, setAvatarError] =
    useState(false);

  // Profile avatar
  const avatarUrl = getAvatarUrl(
    user?.avatar_url
  );

  // Reset image error when avatar changes
  useEffect(() => {
    setAvatarError(false);
  }, [user?.avatar_url]);

  // Sidebar state
  useEffect(() => {
    document.body.classList.add(
      "edabip-has-sidebar"
    );

    document.body.classList.toggle(
      "edabip-sidebar-collapsed",
      collapsed
    );

    localStorage.setItem(
      "edabip_sidebar_collapsed",
      String(collapsed)
    );

    return () => {
      document.body.classList.remove(
        "edabip-has-sidebar",
        "edabip-sidebar-collapsed"
      );
    };
  }, [collapsed]);

  // Close mobile sidebar with Escape
  useEffect(() => {
    const onEscape = (event) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };

    window.addEventListener(
      "keydown",
      onEscape
    );

    return () => {
      window.removeEventListener(
        "keydown",
        onEscape
      );
    };
  }, []);

  // Logout
  const handleLogout = async () => {
    try {
      await logout();

      navigate("/login");
    } catch (error) {
      console.error(
        "Logout failed:",
        error
      );
    }
  };

  // Navigation links
  const links = [
    {
      to: "/dashboard",
      icon: "▦",
      label: "Dashboard",
    },

    ...(user?.role === "admin" ||
    user?.role === "analyst"
      ? [
          {
            to: "/data-management",
            icon: "▤",
            label: "Data Management",
          },
        ]
      : []),

    {
      to: "/profile",
      icon: "◉",
      label: "My Profile",
    },
  ];

  // User initials
  const userInitial = (
    user?.name ||
    user?.email ||
    "U"
  )
    .charAt(0)
    .toUpperCase();

  return (
    <>
      {/* MOBILE HEADER */}

      <div className="edabip-mobile-bar">
        <button
          type="button"
          className="edabip-icon-btn"
          onClick={() =>
            setMobileOpen(true)
          }
          aria-label="Open navigation"
        >
          ☰
        </button>

        <strong>
          EDABIP Mini
        </strong>

        <span className="edabip-mobile-bell">
          <NotificationBell />
        </span>
      </div>

      {/* MOBILE OVERLAY */}

      {mobileOpen && (
        <button
          type="button"
          className="edabip-sidebar-overlay"
          aria-label="Close navigation"
          onClick={() =>
            setMobileOpen(false)
          }
        />
      )}

      {/* SIDEBAR */}

      <aside
        className={`edabip-sidebar ${
          collapsed
            ? "is-collapsed"
            : ""
        } ${
          mobileOpen
            ? "is-mobile-open"
            : ""
        }`}
        aria-label="Main navigation"
      >

        {/* SIDEBAR HEADER */}

        <div className="edabip-sidebar-header">

          <span
            className="edabip-logo"
            aria-hidden="true"
          >
            ◈
          </span>

          <div className="edabip-brand-copy">
            <strong>
              EDABIP Mini
            </strong>

            <small>
              Business Intelligence
            </small>
          </div>

          <button
            type="button"
            className="edabip-collapse-btn"
            onClick={() => {
              if (
                window.innerWidth <= 768
              ) {
                setMobileOpen(false);
              } else {
                setCollapsed(
                  (previous) =>
                    !previous
                );
              }
            }}
            aria-label={
              collapsed
                ? "Expand sidebar"
                : "Collapse sidebar"
            }
            title={
              collapsed
                ? "Expand sidebar"
                : "Collapse sidebar"
            }
          >
            ☰
          </button>

        </div>

        {/* WORKSPACE */}

        <div className="edabip-sidebar-section-title">
          WORKSPACE
        </div>

        <nav className="edabip-sidebar-nav">

          {links.map(
            ({
              to,
              icon,
              label,
            }) => (
              <NavLink
                key={to}
                to={to}
                title={label}
                onClick={() =>
                  setMobileOpen(false)
                }
                className={({
                  isActive,
                }) =>
                  `edabip-nav-link ${
                    isActive
                      ? "is-active"
                      : ""
                  }`
                }
              >
                <span
                  className="edabip-nav-icon"
                  aria-hidden="true"
                >
                  {icon}
                </span>

                <span className="edabip-nav-label">
                  {label}
                </span>
              </NavLink>
            )
          )}

        </nav>

        {/* SIDEBAR BOTTOM */}

        <div className="edabip-sidebar-bottom">

          <div className="edabip-sidebar-section-title">
            PREFERENCES
          </div>

          {/* NOTIFICATIONS */}

          {user?.role === "admin" && (
            <div className="edabip-sidebar-bell">
              <NotificationBell />
            </div>
          )}

          {/* DARK MODE */}

          <button
            type="button"
            className="edabip-sidebar-action"
            onClick={toggleTheme}
            title="Toggle dark mode"
          >
            <span className="edabip-nav-icon">
              {theme === "light"
                ? "☾"
                : "☀"}
            </span>

            <span className="edabip-nav-label">
              {theme === "light"
                ? "Dark Mode"
                : "Light Mode"}
            </span>
          </button>

          {/* USER PROFILE */}

          <div
            className="edabip-user-row"
            title={
              user?.name ||
              user?.email ||
              "Account"
            }
          >

            {/* AVATAR */}

            <span
              className="edabip-user-initial"
              style={{
                width: "52px",
                height: "52px",
                minWidth: "52px",
                borderRadius: "50%",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
                flexShrink: 0,
              }}
            >

              {avatarUrl &&
              !avatarError ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  onError={() =>
                    setAvatarError(true)
                  }
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: "50%",
                    display: "block",
                  }}
                />
              ) : (
                userInitial
              )}

            </span>

            {/* USER DETAILS */}

            <span className="edabip-user-copy">

              <strong>
                {user?.name ||
                  "Account"}
              </strong>

              <small>
                {user?.role ||
                  "User"}
              </small>

            </span>

          </div>

          {/* LOGOUT */}

          <button
            type="button"
            className="edabip-sidebar-action edabip-logout"
            onClick={handleLogout}
            title="Logout"
          >
            <span className="edabip-nav-icon">
              ⇥
            </span>

            <span className="edabip-nav-label">
              Logout
            </span>
          </button>

        </div>

      </aside>
    </>
  );
}

export default Navbar;