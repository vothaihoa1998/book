import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "InkRail editorial manga reader";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#FAF8F4",
          color: "#121212",
          padding: 64,
          border: "1px solid #D8D0C2",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%" }}>
          <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: 0 }}>InkRail</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ fontSize: 88, lineHeight: 0.95, fontWeight: 600, maxWidth: 780 }}>Editorial manga reader</div>
            <div style={{ fontSize: 28, color: "#6F6A61", maxWidth: 760 }}>
              Next.js App Router, Supabase Auth, Postgres, Storage and an offline-first reader.
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, fontSize: 20, color: "#4F46E5" }}>
            <span>SEO-ready pages</span>
            <span>/</span>
            <span>Multi-source catalog</span>
            <span>/</span>
            <span>Reader-first UI</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
