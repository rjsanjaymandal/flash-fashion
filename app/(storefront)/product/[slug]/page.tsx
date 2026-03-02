import { getReviews } from "@/app/actions/review-actions";
import { ProductDetailClient } from "./product-detail";
import { ReviewSection } from "@/components/reviews/review-section";
import { RecentlyViewed } from "@/components/products/recently-viewed";
import { NewsletterSection } from "@/components/marketing/newsletter-section";
import { ProductCarousel } from "@/components/products/product-carousel";
import { ProductJsonLd } from "@/components/seo/product-json-ld";
import { notFound } from "next/navigation";
import { medusaClient } from "@/lib/medusa";

// Convert Medusa Product to match the storefront's expected UI format
function mapMedusaToProduct(p: any) {
  return {
    id: p.id,
    name: p.title,
    slug: p.handle,
    description: p.description || "",
    price: p.variants?.[0]?.calculated_price?.calculated_amount || 0,
    original_price: p.variants?.[0]?.calculated_price?.original_amount || 0,
    main_image_url: p.thumbnail,
    gallery_image_urls: p.images?.map((i: any) => i.url) || [],
    status: p.status,
    is_active: p.status === "published",
    created_at: p.created_at,
    categories: { name: p.categories?.[0]?.name || "Uncategorized" },
    category_id: p.categories?.[0]?.id || "",
    product_stock: p.variants?.map((v: any) => ({
      id: v.id,
      product_id: p.id,
      size: v.title,
      quantity: v.inventory_quantity || 10,
    })) || [],
    size_options: Array.from(new Set(p.variants?.map((v: any) => v.title) || [])),
    color_options: [], // Colors are handled as metadata/options in Medusa
    seo_title: p.title,
    seo_description: p.description
  };
}

export async function generateStaticParams() {
  try {
    const { products } = await medusaClient.store.product.list({ limit: 100 });
    return products.map((product: any) => ({
      slug: product.handle,
    }));
  } catch (e) {
    return []
  }
}

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let product = null;

  try {
    const { products } = await medusaClient.store.product.list({ handle: slug });
    product = products[0];
  } catch (e) { }

  if (!product) return { title: "Product Not Found" };

  const title = (product.title) + " | Flash Fashion";
  const description = (
    product.description ||
    `Cop the ${product.title}. Premium anime-inspired streetwear dropped by FLASH.`
  ).slice(0, 150);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: product.thumbnail ? [product.thumbnail] : [],
      type: "website",
      siteName: "FLASH",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: product.thumbnail ? [product.thumbnail] : [],
    },
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_SITE_URL || "https://flashhfashion.in"}/product/${product.handle}`,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let rawProduct: any = null;
  try {
    const { products } = await medusaClient.store.product.list({
      handle: slug,
      fields: "*categories,*variants,*variants.calculated_price,*images,*metadata"
    });
    rawProduct = products[0];
  } catch (e) { }

  if (!rawProduct) {
    notFound();
  }

  const product = mapMedusaToProduct(rawProduct);

  let relatedProducts: any[] = [];
  try {
    if (rawProduct.categories?.[0]?.id) {
      const { products: fetchedRelated } = await medusaClient.store.product.list({
        category_id: [rawProduct.categories[0].id],
        fields: "*categories,*variants,*variants.calculated_price,*images",
        limit: 5
      })
      relatedProducts = fetchedRelated.filter((p: any) => p.id !== rawProduct.id).map(mapMedusaToProduct);
    }
  } catch (e) { }

  // Fetch Reviews from metadata
  const reviews = await getReviews(rawProduct.id);

  // Dummy color map (handled via Medusa options in later phases)
  const colorMap: Record<string, string> = {
    'Black': '#000000',
    'White': '#FFFFFF',
    'Red': '#FF0000'
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
          reviews={
            reviews.map((r: any) => ({
              ...r,
              user_name: r.user_name || "Anonymous",
              comment: r.comment || "",
            }))
          }
        />

        <ProductCarousel products={relatedProducts} />
        <RecentlyViewed currentProduct={product} />
      </div>

      <NewsletterSection />
    </>
  );
}
