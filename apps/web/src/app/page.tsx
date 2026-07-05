const modules = ["System", "Admissions", "Academic", "Scheduling", "Finance", "Reporting"];

export default function HomePage() {
  return (
    <main style={{ padding: 32 }}>
      <section
        style={{
          maxWidth: 960,
          margin: "0 auto",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: 24,
        }}
      >
        <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>Operator Console</p>
        <h1 style={{ margin: "8px 0 12px", fontSize: 28 }}>EdTech SaaS Foundation</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
          The product starts with center management: academic delivery, scheduling, finance,
          admissions, reporting, and reusable system foundations.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 12,
            marginTop: 24,
          }}
        >
          {modules.map((module) => (
            <div
              key={module}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 6,
                padding: "12px 14px",
                fontWeight: 600,
              }}
            >
              {module}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
