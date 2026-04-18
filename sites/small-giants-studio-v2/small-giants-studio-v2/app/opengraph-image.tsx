import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Small Giants Studio — Digital Transformation for UK SMEs & Charities";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #0F4C4C 0%, #1B6B6B 50%, #2A8A8A 100%)",
          padding: "60px 80px",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
        >
          <div
            style={{
              fontSize: "56px",
              fontWeight: 700,
              color: "#FFFFFF",
              lineHeight: 1.2,
              maxWidth: "800px",
            }}
          >
            Small Giants Studio
          </div>
          <div
            style={{
              fontSize: "28px",
              fontWeight: 400,
              color: "#B2D8D8",
              lineHeight: 1.5,
              maxWidth: "700px",
            }}
          >
            Digital transformation for UK SMEs, charities, and social enterprises.
            Enterprise-level systems at budgets that actually work.
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginTop: "24px",
            }}
          >
            <div
              style={{
                fontSize: "20px",
                color: "#E8B931",
                fontWeight: 600,
              }}
            >
              smallgiantsstudio.co.uk
            </div>
            <div
              style={{
                width: "4px",
                height: "4px",
                borderRadius: "50%",
                backgroundColor: "#B2D8D8",
              }}
            />
            <div
              style={{
                fontSize: "20px",
                color: "#B2D8D8",
              }}
            >
              Birmingham, UK
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
