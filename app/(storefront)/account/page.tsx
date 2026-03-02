import { getMedusaCustomerData } from "@/lib/medusa-bridge";
import { getMedusaSession } from "@/app/actions/medusa-auth";
import { AccountClient } from "@/components/account/account-client";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AccountPage() {
  const customer = await getMedusaSession();

  if (!customer) {
    redirect("/login");
  }

  // Fetch Medusa Data (Profile, Orders, Addresses) via Bridge
  const medusaData = await getMedusaCustomerData(customer.email);

  const fullCustomer = medusaData?.customer || customer;
  const orders = medusaData?.orders || [];
  const waitlistedProducts = fullCustomer.metadata?.waitlist || []; // Assuming waitlist is stored in metadata

  // Map Medusa data to safeProfile (Legacy shape for the Client Component)
  const safeProfile: any = {
    name: `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || customer.email.split("@")[0],
    role: (customer.metadata?.role as any) || "customer",
    loyalty_points: (customer.metadata?.loyalty_points as number) || 0,
    pronouns: (customer.metadata?.pronouns as string) || null,
    fit_preference: (customer.metadata?.fit_preference as any) || null,
    created_at: customer.created_at,
    updated_at: customer.updated_at,
  };

  // Map Medusa Addresses
  const addresses: any[] = customer.addresses?.map((addr: any) => ({
    id: addr.id,
    user_id: customer.id,
    name: `${addr.first_name || ""} ${addr.last_name || ""}`.trim(),
    phone: addr.phone || "",
    address_line1: addr.address_1 || "",
    address_line2: addr.address_2 || null,
    city: addr.city || "",
    state: addr.province || "",
    pincode: addr.postal_code || "",
    country: addr.country_code || "IN",
    is_default: (customer.metadata?.default_address_id === addr.id),
    created_at: addr.created_at,
  })) || [];

  // Map Medusa Orders
  const mappedOrders = orders.map((order: any) => ({
    id: order.id,
    user_id: customer.id,
    total: order.total || 0,
    subtotal: order.subtotal || 0,
    status: mapMedusaStatusToLegacy(order.status),
    created_at: order.created_at,
    tracking_number: order.metadata?.tracking_number || null,
  }));

  return (
    <AccountClient
      user={{ email: customer.email, id: customer.id }}
      profile={safeProfile}
      orders={mappedOrders}
      addresses={addresses}
      waitlist={waitlistedProducts}
    />
  );
}

function mapMedusaStatusToLegacy(status: string) {
  switch (status) {
    case "pending": return "pending";
    case "completed": return "delivered";
    case "canceled": return "cancelled";
    default: return "pending";
  }
}
