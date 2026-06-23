import { ImageResponse } from "next/og";

export const contentType = "image/png";

const iconSizes = [32, 48, 96, 192, 512] as const;

export function generateImageMetadata() {
  return iconSizes.map((size) => ({
    id: String(size),
    alt: "InkRail app icon",
    size: { width: size, height: size },
    contentType,
  }));
}

export default async function Icon({ id }: { id: Promise<string | number> }) {
  const rawSize = Number(await id);
  const size = iconSizes.includes(rawSize as (typeof iconSizes)[number]) ? rawSize : 512;

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
          borderRadius: size >= 180 ? 96 : 12,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "8%",
            display: "flex",
            borderRadius: size >= 180 ? 72 : 8,
            border: "1px solid rgba(245,247,251,0.14)",
            background: "linear-gradient(145deg, rgba(242,184,75,0.20), rgba(69,214,163,0.08) 38%, rgba(11,16,32,0.96))",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "58%",
            height: "58%",
            borderRadius: size >= 180 ? 36 : 6,
            background: "#f2b84b",
            color: "#080b13",
            fontSize: size * 0.22,
            lineHeight: 1,
            fontWeight: 800,
          }}
        >
          IR
        </div>
        <div
          style={{
            position: "absolute",
            bottom: "17%",
            width: "50%",
            height: size >= 180 ? 9 : 2,
            borderRadius: 999,
            background: "#45d6a3",
          }}
        />
      </div>
    ),
    { width: size, height: size },
  );
}
