import { getReviews } from "@/app/actions/review-actions";
import { ProductDetailClient } from "./product-detail";
import { ReviewSection } from "@/components/reviews/review-section";
import { RecentlyViewed } from "@/components/products/recently-viewed";
import { NewsletterSection } from "@/components/marketing/newsletter-section";
import { ProductCarousel } from "@/components/products/product-carousel";
import { ProductJsonLd } from "@/components/seo/product-json-ld";
import { notFound } from "next/navigation";
import { getProductBySlug, getRelatedProducts } from "@/lib/services/product-service";
import { medusaClient } from "@/lib/medusa";

export async function generateStaticParams() {
  try {
    const { products } = await medusaClient.store.product.list({ limit: 100 });
    return products.map((product: any) => ({
      slug: product.handle,
    }));
  } catch (e) {
    return [];
  }
}

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) return { title: "Product Not Found" };

  const title = product.name + " | Flash Fashion";
  const description = (
    product.seo_description ||
    product.description ||
    `Cop the ${product.name}. Premium anime-inspired streetwear dropped by FLASH.`
  ).slice(0, 150);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: product.main_image_url ? [product.main_image_url] : [],
      type: "website",
      siteName: "FLASH",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: product.main_image_url ? [product.main_image_url] : [],
    },
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_SITE_URL || "https://flashhfashion.in"}/product/${product.slug}`,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Fetch product using the centralized service
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  // Fetch related products using the centralized service
  const relatedProducts = await getRelatedProducts(product);

  // Fetch Reviews
  const reviews = await getReviews(product.id);

  // Dummy color map (handled via Medusa options in later phases)
  const colorMap: Record<string, string> = {
    Black: "#000000",
    White: "#FFFFFF",
    Red: "#FF0000",
  };

  // Calculate Review Stats
  const reviewCount = reviews.length;
  const averageRating =
    reviewCount > 0
      ? (
        reviews.reduce((acc: number, r: any) => acc + r.rating, 0) /
        reviewCount
      ).toFixed(1)
      : "0.0";

  return (
    <>
      <ProductJsonLd
        product={{
          ...product,
          stock: product.product_stock?.some((s: any) => s.quantity > 0)
            ? 1
            : 0,
        }}
        reviews={reviews}
      />
      <ProductDetailClient
        product={
          {
            ...product,
            description: product.description || "",
            main_image_url: product.main_image_url || "",
          } as any
        }
        initialReviews={{ count: reviewCount, average: averageRating }}
        colorMap={colorMap}
      />

      <div className="container mx-auto px-4 lg:px-8 space-y-20 pb-20">
        <ReviewSection
          productId={product.id}
          reviews={reviews.map((r: any) => ({
            ...r,
            user_name: r.user_name || "Anonymous",
            comment: r.comment || "",
          }))}
        />

        <ProductCarousel products={relatedProducts} />
        <RecentlyViewed currentProduct={product} />
      </div>

      <NewsletterSection />
    </>
  );
}
