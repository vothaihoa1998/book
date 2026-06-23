import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/seo";

export const runtime = "edge";
export const alt = "InkRail manga reader preview";
export const size = { width: 1200, height: 675 };
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#050814",
          color: "#f5f7fb",
          padding: 60,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", right: -160, top: -160, width: 560, height: 560, borderRadius: 560, background: "rgba(242,184,75,0.18)" }} />
        <div style={{ position: "absolute", left: 520, bottom: -260, width: 640, height: 640, borderRadius: 640, background: "rgba(69,214,163,0.10)" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, borderRadius: 18, background: "#f2b84b", color: "#080b13", fontSize: 26, fontWeight: 800 }}>
              IR
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 30, fontWeight: 760 }}>{siteConfig.name}</div>
              <div style={{ color: "#9aa4b2", fontSize: 16 }}>Đọc truyện tranh online</div>
            </div>
          </div>
          <div style={{ color: "#f2b84b", fontSize: 18, fontWeight: 650 }}>Reader-first · SEO-ready</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 860 }}>
          <div style={{ fontSize: 78, lineHeight: 0.96, fontWeight: 800 }}>Đọc manga, manhwa và webtoon thoải mái hơn.</div>
          <div style={{ color: "#cbd5e1", fontSize: 27, lineHeight: 1.35 }}>{siteConfig.description}</div>
        </div>

        <div style={{ display: "flex", gap: 14 }}>
          {["Dark mode mặc định", "Tìm truyện nhanh", "Đồng bộ tiến độ"].map((label) => (
            <div key={label} style={{ borderRadius: 999, border: "1px solid rgba(226,232,240,0.12)", background: "rgba(17,26,47,0.86)", color: "#f5f7fb", padding: "12px 18px", fontSize: 18, fontWeight: 650 }}>
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
