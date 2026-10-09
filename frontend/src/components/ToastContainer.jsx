import React from "react";

const tones = {
  success: { icon: "✓", color: "#10b981" },
  error: { icon: "!", color: "#ef4444" },
  warning: { icon: "!", color: "#f59e0b" },
  info: { icon: "i", color: "#3b82f6" },
};

export default function ToastContainer({ toasts = [], onDismiss }) {
  return (
    <div style={{ position: "fixed", top: 82, right: 18, zIndex: 9999,
      display: "flex", flexDirection: "column", gap: 10,
      width: "min(380px, calc(100vw - 36px))", pointerEvents: "none" }}
      aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => {
        const tone = tones[toast.type] || tones.info;
        return (
          <div key={toast.id} role={toast.type === "error" ? "alert" : "status"}
            style={{ display: "flex", alignItems: "center", gap: 12,
              padding: "14px 15px", borderRadius: 14,
              background: "var(--card-bg, #fff)", color: "var(--text-color, #172b24)",
              boxShadow: "0 10px 30px rgba(0,0,0,.18)",
              borderLeft: `5px solid ${tone.color}`, pointerEvents: "auto" }}>
            <span aria-hidden="true" style={{ background: tone.color, color: "white",
              width: 26, height: 26, borderRadius: "50%", display: "grid",
              placeItems: "center", fontWeight: 800, flexShrink: 0 }}>{tone.icon}</span>
            <span style={{ flex: 1, fontSize: 14, lineHeight: 1.5 }}>{toast.message}</span>
            <button type="button" aria-label="Dismiss notification"
              onClick={() => onDismiss(toast.id)}
              style={{ border: 0, background: "transparent", color: "inherit",
                cursor: "pointer", fontSize: 22, padding: "0 4px" }}>×</button>
          </div>
        );
      })}
    </div>
  );
}
