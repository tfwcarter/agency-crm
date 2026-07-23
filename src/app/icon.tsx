import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: 22,
          fontWeight: 700,
          background: "linear-gradient(135deg, #3b6fe8, #0d9c6f)",
          borderRadius: 7,
        }}
      >
        S
      </div>
    ),
    size
  );
}
