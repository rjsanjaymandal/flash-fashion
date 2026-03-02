import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getWaitlistedProducts } from "@/lib/services/product-service";
import { AccountClient } from "@/components/account/account-client";
import { Database, Tables } from "@/types/supabase";
import { getMedusaCustomerData } from "@/lib/medusa-bridge";

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch Medusa Data (Profile, Orders, Addresses) via Bridge
  const [medusaData, waitlistData] = await Promise.all([
    getMedusaCustomerData(user.email!),
    getWaitlistedProducts(user.id),
  ]);

  const customer = medusaData?.customer;
  const orders = medusaData?.orders || [];
  const waitlistedProducts = waitlistData || [];

  // Map Medusa data to safeProfile (Supabase shape for now)
  const safeProfile: Tables<"profiles"> = {
    id: user.id,
    name: customer ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim() : (user.email?.split("@")[0] || "User"),
    role: (customer?.metadata?.role as any) || "customer",
    loyalty_points: (customer?.metadata?.loyalty_points as number) || 0,
    pronouns: (customer?.metadata?.pronouns as string) || null,
    fit_preference: (customer?.metadata?.fit_preference as any) || null,
    created_at: customer?.created_at || new Date().toISOString(),
    updated_at: customer?.updated_at || new Date().toISOString(),
  };

  // Map Medusa Addresses to Supabase Shape
  const addresses: Tables<"addresses">[] = customer?.addresses?.map((addr: any) => ({
    id: addr.id,
    user_id: user.id,
    name: `${addr.first_name || ""} ${addr.last_name || ""}`.trim(),
    phone: addr.phone || "",
    address_line1: addr.address_1 || "",
    address_line2: addr.address_2 || null,
    city: addr.city || "",
    state: addr.province || "",
    pincode: addr.postal_code || "",
    country: addr.country_code || "IN",
    is_default: (customer.metadata?.default_address_id === addr.id),
    created_at: addr.created_at || new Date().toISOString(),
  })) || [];

  // Map Medusa Orders to Supabase Shape for the UI
  const mappedOrders = orders.map((order: any) => ({
    id: order.id,
    user_id: user.id,
    total: order.total || 0,
    subtotal: order.subtotal || 0,
    status: mapMedusaStatusToSupabase(order.status),
    created_at: order.created_at,
    tracking_number: order.metadata?.tracking_number || null,
    // Add other fields as needed for the UI
  }));

  return (
    <AccountClient
      user={user}
      profile={safeProfile}
      orders={mappedOrders}
      addresses={addresses}
      waitlist={waitlistedProducts}
    />
  );
}

function mapMedusaStatusToSupabase(status: string) {
  // Medusa statuses: pending, completed, archived, canceled, requires_action
  // OrderDetails expects: pending, paid, shipped, delivered
  switch (status) {
    case "pending": return "pending";
    case "completed": return "delivered";
    case "canceled": return "cancelled";
    default: return "pending";
  }
}
