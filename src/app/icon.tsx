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
          color: "#fafbf7",
          fontSize: 22,
          fontWeight: 600,
          fontFamily: "Georgia, 'Times New Roman', serif",
          background: "#35624a",
          borderRadius: 7,
        }}
      >
        S
      </div>
    ),
    size
  );
}
