import { createClient } from "@/lib/supabase/server";
import { ProductCard } from "@/components/storefront/product-card";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { CollectionJsonLd } from "@/components/seo/collection-json-ld";
import type { Tables } from "@/types/supabase";
import type { Product } from "@/lib/services/product-service";

type Category = Tables<"categories">;

const CATEGORY_FIELDS =
  "id, name, slug, parent_id, is_active, description, image_url, created_at, updated_at";
const PRODUCT_CARD_FIELDS =
  "id, name, slug, price, original_price, main_image_url, gallery_image_urls, status, is_active, category_id, created_at, is_carousel_featured, size_options, color_options, fit_options, expression_tags, categories(name), product_stock(*)";

import { medusaClient } from "@/lib/medusa";

export const revalidate = 900;
// export const dynamic = "auto";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: slug } = await params;

  if (slug === "all") {
    return {
      title: "Shop All | Flash Store",
      description:
        "Browse our entire collection of premium streetwear and accessories.",
    };
  }

  if (slug === "new-arrivals") {
    return {
      title: "New Arrivals | Flash Store",
      description:
        "The latest drops and freshest fits. Limited edition releases available now.",
    };
  }

  try {
    const { product_categories } = await medusaClient.store.category.list({
      fields: "*category_children",
    });
    const category = product_categories.find((c: any) => c.handle === slug);

    if (!category) {
      return {
        title: "Category Not Found | Flash Store",
      };
    }

    return {
      title: `${category.name} | Anime Streetwear & Japanese Aesthetic | FLASH`,
      description:
        category.description ||
        `Shop the latest ${category.name} drops. Premium anime-inspired apparel, Harajuku style hoodies, and urban graphic tees. Fast shipping on all orders.`,
      alternates: {
        canonical: `https://flashhfashion.in/shop/${slug}`,
      },
    };
  } catch (e) {
    return { title: "Category Not Found | Flash Store" }
  }
}

// Convert Medusa Product to match Supabase Product UI format
function mapMedusaToProduct(p: any) {
  return {
    id: p.id,
    name: p.title,
    slug: p.handle,
    price: p.variants?.[0]?.calculated_price?.calculated_amount || 0,
    original_price: p.variants?.[0]?.calculated_price?.original_amount || 0,
    main_image_url: p.thumbnail,
    gallery_image_urls: p.images?.map((i: any) => i.url) || [],
    status: p.status,
    is_active: p.status === "published",
    created_at: p.created_at,
    categories: { name: p.categories?.[0]?.name || "Uncategorized" },
    product_stock: p.variants?.map((v: any) => ({
      id: v.id,
      product_id: p.id,
      size: v.title,
      quantity: v.inventory_quantity || 10,
    })) || []
  };
}

export default async function ShopPage(props: {
  params: Promise<{ category: string }>;
}) {
  const params = await props.params;
  const { category: slug } = params;

  let products: any[] = [];
  let categoryData: any = null;
  let subCategories: any[] = [];

  try {
    // 1. Fetch ALL categories to build the tree/lookup
    const { product_categories: allCategories } = await medusaClient.store.category.list({
      limit: 100,
      fields: "*category_children"
    });

    if (!allCategories && slug !== "all" && slug !== "new-arrivals") {
      notFound();
    }

    // 2. Determine Scope
    if (slug === "all") {
      categoryData = {
        name: "All Products",
        description: "Browse our entire collection.",
      };
      const { products: p } = await medusaClient.store.product.list({
        limit: 100,
        fields: "*categories,*variants,*variants.calculated_price,*images",
        order: "-created_at"
      });
      products = p.map(mapMedusaToProduct);
    } else if (slug === "new-arrivals") {
      categoryData = {
        name: "New Arrivals",
        description: "The latest drops and freshest fits.",
      };
      const { products: p } = await medusaClient.store.product.list({
        limit: 20,
        fields: "*categories,*variants,*variants.calculated_price,*images",
        order: "-created_at" // descending
      });
      products = p.map(mapMedusaToProduct);
    } else {
      // Find the specific category
      const cat = allCategories.find((c: any) => c.handle === slug);

      if (!cat) notFound();
      categoryData = cat;

      // Get immediate children for navigation (Medusa uses category_children)
      subCategories = allCategories.filter((c: any) => c.parent_category_id === cat.id);

      // Fetch Products assigned to this category
      const { products: p } = await medusaClient.store.product.list({
        category_id: [cat.id],
        fields: "*categories,*variants,*variants.calculated_price,*images",
        limit: 100,
        order: "-created_at"
      });

      products = (p || []).map(mapMedusaToProduct);
    }
  } catch (e) {
    console.error(e)
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-20">
      <CollectionJsonLd
        name={
          categoryData && "name" in categoryData
            ? categoryData.name
            : slug.replace("-", " ")
        }
        description={
          categoryData &&
            "description" in categoryData &&
            categoryData.description
            ? categoryData.description
            : ""
        }
        url={`${process.env.NEXT_PUBLIC_SITE_URL || "https://flashhfashion.in"}/shop/${slug}`}
      />
      <div className="container mx-auto px-4 lg:px-8">
        {/* Breadcrumb / Back */}
        <div className="mb-8">
          <Link
            href="/shop"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Shop
          </Link>
        </div>

        {/* Hero Header */}
        <div className="flex flex-col items-center text-center space-y-6 mb-16 animate-in fade-in slide-in-from-bottom-5 duration-700">
          <h1 className="text-4xl md:text-6xl font-light tracking-tight text-foreground capitalize">
            {categoryData ? categoryData.name : slug.replace("-", " ")}
          </h1>
          {categoryData?.description && (
            <p className="text-muted-foreground max-w-2xl text-lg font-light leading-relaxed">
              {categoryData.description}
            </p>
          )}

          {/* Subcategories Nav (Pill Style) */}
          {subCategories.length > 0 && (
            <div className="flex flex-wrap gap-3 justify-center pt-4">
              {subCategories.map((sub) => (
                <Link key={sub.id} href={`/shop/${sub.slug}`}>
                  <Button
                    variant="outline"
                    className="rounded-full px-6 border-muted-foreground/20 hover:border-foreground transition-all"
                  >
                    {sub.name}
                  </Button>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Results Info */}
        <div className="flex justify-between items-center border-b border-border/40 pb-4 mb-8">
          <p className="text-sm font-medium text-muted-foreground">
            Showing {products.length}{" "}
            {products.length === 1 ? "Result" : "Results"}
          </p>
        </div>

        {/* Grid */}
        <div className="flex-1">
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center border px-4 rounded-xl border-dashed">
              <p className="text-xl font-medium mb-2">
                No products found here yet.
              </p>
              <p className="text-muted-foreground mb-6">
                Check back soon for new drops.
              </p>
              <Button asChild variant="outline">
                <Link href="/shop">Browse All Products</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-12">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
