import { ImageResponse } from "next/og";
import { siteConfig } from "@/lib/seo";

export const alt = "InkRail - đọc truyện tranh mượt, tối giản và đồng bộ";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
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
          padding: 58,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", right: -150, top: -150, width: 520, height: 520, borderRadius: 520, background: "rgba(242,184,75,0.18)" }} />
        <div style={{ position: "absolute", left: 540, bottom: -260, width: 640, height: 640, borderRadius: 640, background: "rgba(69,214,163,0.10)" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 66, height: 66, borderRadius: 18, background: "#f2b84b", color: "#080b13", fontSize: 27, fontWeight: 800 }}>
              IR
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 31, fontWeight: 760 }}>{siteConfig.name}</div>
              <div style={{ color: "#9aa4b2", fontSize: 16 }}>Đọc truyện tranh online</div>
            </div>
          </div>
          <div style={{ color: "#f2b84b", fontSize: 18, fontWeight: 650 }}>Reader-first · SEO-ready</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 900 }}>
          <div style={{ fontSize: 76, lineHeight: 0.96, fontWeight: 800 }}>Đọc manga, manhwa và webtoon thoải mái hơn.</div>
          <div style={{ color: "#cbd5e1", fontSize: 27, lineHeight: 1.35 }}>{siteConfig.description}</div>
        </div>

        <div style={{ display: "flex", gap: 14 }}>
          <div style={{ borderRadius: 999, border: "1px solid rgba(226,232,240,0.12)", background: "rgba(17,26,47,0.86)", color: "#f5f7fb", padding: "12px 18px", fontSize: 18, fontWeight: 650 }}>Dark mode mặc định</div>
          <div style={{ borderRadius: 999, border: "1px solid rgba(226,232,240,0.12)", background: "rgba(17,26,47,0.86)", color: "#f5f7fb", padding: "12px 18px", fontSize: 18, fontWeight: 650 }}>Tìm truyện nhanh</div>
          <div style={{ borderRadius: 999, border: "1px solid rgba(226,232,240,0.12)", background: "rgba(17,26,47,0.86)", color: "#f5f7fb", padding: "12px 18px", fontSize: 18, fontWeight: 650 }}>Đồng bộ tiến độ</div>
        </div>
      </div>
    ),
    size,
  );
}
