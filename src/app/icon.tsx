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
          color: "#e6d29b",
          fontSize: 23,
          fontWeight: 700,
          fontFamily: "Georgia, 'Times New Roman', serif",
          background: "#0a0a09",
          border: "1px solid #cfae5c",
          borderRadius: 7,
        }}
      >
        S
      </div>
    ),
    size
  );
}
