import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const alt = "Linh Quyển Các · Đọc truyện tiên hiệp";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const png = await readFile(
    path.join(process.cwd(), "public/brand/linh-quyen-mark-256.png"),
  );
  const markSrc = `data:image/png;base64,${png.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(ellipse 80% 60% at 50% 20%, rgba(200,150,46,0.18) 0%, transparent 55%), linear-gradient(145deg, #0a1812 0%, #1e3e30 42%, #120a06 100%)",
          color: "#f5f0e6",
          fontFamily: "serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 220,
            height: 220,
            borderRadius: "50%",
            border: "3px solid rgba(200,150,46,0.55)",
            background: "#f8f4ea",
            boxShadow: "0 0 48px rgba(200,150,46,0.22)",
            marginBottom: 36,
            overflow: "hidden",
          }}
        >
          <img src={markSrc} width={210} height={210} alt="" />
        </div>
        <div style={{ fontSize: 68, fontWeight: 700, letterSpacing: 2, color: "#f0d878" }}>
          Linh Quyển Các
        </div>
        <div
          style={{
            marginTop: 18,
            fontSize: 30,
            color: "rgba(245,240,230,0.82)",
            letterSpacing: 1,
          }}
        >
          Tu tiên từng chương · Vươn tới đỉnh trời
        </div>
      </div>
    ),
    { ...size }
  );
}
