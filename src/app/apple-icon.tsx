import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "InkRail apple touch icon";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#050814",
          borderRadius: 40,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 16,
            borderRadius: 30,
            border: "1px solid rgba(245,247,251,0.14)",
            background: "linear-gradient(145deg, rgba(242,184,75,0.22), rgba(69,214,163,0.09) 42%, rgba(11,16,32,0.98))",
          }}
        />
        <div
          style={{
            width: 98,
            height: 98,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 24,
            background: "#f2b84b",
            color: "#080b13",
            fontSize: 38,
            fontWeight: 800,
          }}
        >
          IR
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 34,
            width: 84,
            height: 8,
            borderRadius: 999,
            background: "#45d6a3",
          }}
        />
      </div>
    ),
    size,
  );
}
