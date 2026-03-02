import { ImageResponse } from "next/og";
import { medusaClient } from "@/lib/medusa";

export const runtime = "edge";

export const alt = "Flash Fashion Product";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image({ params }: { params: { slug: string } }) {
  const slug = (await params).slug;

  // Fetch product data from Medusa
  const { products } = await medusaClient.store.product.list({
    handle: slug,
  });
  const product = products?.[0];

  // Fallback if no product found
  const title = product?.title || "Flash Fashion Premium";
  const variant = product?.variants?.[0];
  const price = variant?.calculated_price?.amount
    ? `₹${(variant.calculated_price.amount).toLocaleString("en-IN")}`
    : "";
  const imageUrl = product?.thumbnail || null;

  return new ImageResponse(
    <div
      style={{
        background: "linear-gradient(to bottom right, #09090b, #18181b)",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "row", // Side by side layout
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      {/* Left Side: Product Image or Logo */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
        }}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={title}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              borderRadius: 20,
            }}
          />
        ) : (
          <div style={{ fontSize: 80, fontWeight: 900 }}>FLASH</div>
        )}
      </div>

      {/* Right Side: Details */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          paddingRight: 60,
        }}
      >
        {/* Brand Label */}
        <div
          style={{
            fontSize: 24,
            color: "#a1a1aa",
            fontWeight: 700,
            textTransform: "uppercase",
            marginBottom: 20,
            letterSpacing: "0.1em",
          }}
        >
          Flash Fashion
        </div>

        {/* Product Title */}
        <div
          style={{
            fontSize: 60,
            fontWeight: 900,
            lineHeight: 1.1,
            marginBottom: 30,
            background: "linear-gradient(to right, #ffffff, #a1a1aa)",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          {title}
        </div>

        {/* Price Badge */}
        {price && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
            }}
          >
            <div
              style={{
                fontSize: 40,
                fontWeight: 700,
                color: "white",
              }}
            >
              {price}
            </div>
            <div
              style={{
                padding: "10px 20px",
                background: "white",
                color: "black",
                fontSize: 18,
                fontWeight: 800,
                borderRadius: 50,
                textTransform: "uppercase",
              }}
            >
              In Stock
            </div>
          </div>
        )}
      </div>
    </div>,
    {
      ...size,
    },
  );
}
