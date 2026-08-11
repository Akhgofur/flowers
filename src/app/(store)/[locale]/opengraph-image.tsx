import { ImageResponse } from "next/og";

export const alt = "Floraluxe — Flowers. Beauty. Art.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#fbf6ec",
        color: "#33241f",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", inset: 34, border: "2px solid #b88735" }} />
      <div style={{ position: "absolute", inset: 48, border: "1px solid #e1c58c" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 56 }}>
        <div style={{ display: "flex", position: "relative", width: 230, height: 290 }}>
          <div style={{ position: "absolute", left: 94, top: 120, width: 10, height: 170, background: "#a8792c", transform: "rotate(-12deg)" }} />
          <div style={{ position: "absolute", left: 20, top: 25, width: 145, height: 190, borderRadius: "72% 28% 65% 35%", background: "#f2b9bd", border: "4px solid #c8933b", transform: "rotate(-28deg)" }} />
          <div style={{ position: "absolute", right: 12, top: 18, width: 145, height: 195, borderRadius: "28% 72% 35% 65%", background: "#f7d3d0", border: "4px solid #c8933b", transform: "rotate(24deg)" }} />
          <div style={{ position: "absolute", left: 66, top: 0, width: 120, height: 210, borderRadius: "60% 40% 52% 48%", background: "#f5c4c7", border: "4px solid #c8933b" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <div style={{ color: "#a16b21", fontFamily: "serif", fontSize: 112, fontStyle: "italic", lineHeight: 1 }}>Floraluxe</div>
          <div style={{ width: 620, height: 2, marginTop: 22, background: "#c69442" }} />
          <div style={{ marginTop: 24, fontSize: 32, letterSpacing: 10, textTransform: "uppercase" }}>Flowers. Beauty. Art.</div>
          <div style={{ marginTop: 32, color: "#876f60", fontSize: 24, letterSpacing: 4 }}>+998 88 780 22 08 · TASHKENT</div>
        </div>
      </div>
    </div>,
    size
  );
}
