// app/alerts/page.tsx
export default function Alerts() {
  return (
    <div style={{ minHeight: "100vh", padding: "24px", backgroundColor: "#f9fafb" }}>
      <header style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#111827", display: "flex", alignItems: "center", gap: "8px" }}>
          <span>⚠️</span> Alerts
        </h1>
        <p style={{ color: "#4b5563" }}>
          Critical notifications for your business
        </p>
      </header>
      <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        <p style={{ color: "#6b7280" }}>Content coming soon. This is the Alerts section.</p>
      </div>
    </div>
  );
}
