import { notFound } from "next/navigation";
import { db } from "@/lib/db";

export default async function PublicWebsitePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const website = await db.website.findFirst({ where: { publishedSlug: slug, status: "published" } });
  if (!website) notFound();

  const services: Array<{ title: string; description: string }> = website.servicesJson ? JSON.parse(website.servicesJson) : [];

  return (
    <div style={{ backgroundColor: "#ffffff", color: "#111111", minHeight: "100vh" }}>
      <header
        style={{
          padding: "6rem 2rem",
          textAlign: "center",
          background: `linear-gradient(135deg, ${website.colorPrimary}22, transparent)`,
        }}
      >
        <h1 style={{ fontSize: "2.5rem", fontWeight: 700, marginBottom: "1rem" }}>{website.heroHeadline}</h1>
        <p style={{ fontSize: "1.1rem", color: "#555555", maxWidth: 560, margin: "0 auto" }}>{website.heroSubheadline}</p>
      </header>

      {website.aboutContent && (
        <section style={{ maxWidth: 720, margin: "0 auto", padding: "3rem 2rem" }}>
          <h2 style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#888888", marginBottom: "0.75rem" }}>
            About {website.businessName}
          </h2>
          <p style={{ fontSize: "1rem", lineHeight: 1.7 }}>{website.aboutContent}</p>
        </section>
      )}

      {services.length > 0 && (
        <section style={{ maxWidth: 960, margin: "0 auto", padding: "3rem 2rem" }}>
          <h2 style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#888888", marginBottom: "1.5rem" }}>
            Services
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.5rem" }}>
            {services.map((s, i) => (
              <div key={i} style={{ border: "1px solid #eeeeee", borderRadius: 12, padding: "1.5rem" }}>
                <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>{s.title}</p>
                <p style={{ color: "#555555", fontSize: "0.9rem" }}>{s.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {website.contactContent && (
        <footer style={{ textAlign: "center", padding: "4rem 2rem", background: "#fafafa" }}>
          <p style={{ fontSize: "1.1rem" }}>{website.contactContent}</p>
        </footer>
      )}
    </div>
  );
}
