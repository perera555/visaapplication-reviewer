import { ImageResponse } from "next/og";

export function renderIcon(size: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #039855 0%, #047857 55%, #84cc16 100%)",
          color: "white",
          fontSize: size * 0.42,
          fontWeight: 800,
          letterSpacing: -size * 0.02,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: size * 0.7, height: size * 0.7, borderRadius: size * 0.18, background: "rgba(255,255,255,0.16)", border: `${Math.max(2, size * 0.015)}px solid rgba(255,255,255,0.5)` }}>
          VR
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
