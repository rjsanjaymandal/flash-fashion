import { getMedusaSession } from "@/app/actions/medusa-auth";
import { AccountClient } from "@/components/account/account-client";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://127.0.0.1:9000"

async function fetchFromMedusa(path: string, token: string) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 0 }
  })
  if (!res.ok) return null
  return res.json()
}

export default async function AccountPage() {
  const customer = await getMedusaSession();

  if (!customer) {
    redirect("/login");
  }

  const cookieStore = await cookies()
  const token = cookieStore.get('medusa_token')?.value

  if (!token) redirect("/login");

  // Fetch Medusa Data Natively
  const [customerData, ordersData] = await Promise.all([
    fetchFromMedusa("/store/customers/me", token),
    fetchFromMedusa("/store/customers/me/orders", token)
  ])

  const fullCustomer = customerData?.customer || customer;
  const orders = ordersData?.orders || [];
  const waitlistedProducts = fullCustomer.metadata?.waitlist || []; // Assuming waitlist is stored in metadata

  // Map Medusa data to safeProfile (Legacy shape for the Client Component)
  const safeProfile: any = {
    name: `${fullCustomer.first_name || ""} ${fullCustomer.last_name || ""}`.trim() || fullCustomer.email.split("@")[0],
    role: (fullCustomer.metadata?.role as any) || "customer",
    loyalty_points: (fullCustomer.metadata?.loyalty_points as number) || 0,
    pronouns: (fullCustomer.metadata?.pronouns as string) || null,
    fit_preference: (fullCustomer.metadata?.fit_preference as any) || null,
    created_at: fullCustomer.created_at,
    updated_at: fullCustomer.updated_at,
  };

  // Map Medusa Addresses
  const addresses: any[] = fullCustomer.addresses?.map((addr: any) => ({
    id: addr.id,
    user_id: fullCustomer.id,
    name: `${addr.first_name || ""} ${addr.last_name || ""}`.trim(),
    phone: addr.phone || "",
    address_line1: addr.address_1 || "",
    address_line2: addr.address_2 || null,
    city: addr.city || "",
    state: addr.province || "",
    pincode: addr.postal_code || "",
    country: addr.country_code || "IN",
    is_default: (fullCustomer.metadata?.default_address_id === addr.id),
    created_at: addr.created_at,
  })) || [];

  // Map Medusa Orders
  const mappedOrders = orders.map((order: any) => ({
    id: order.id,
    user_id: fullCustomer.id,
    total: order.total || 0,
    subtotal: order.subtotal || 0,
    status: mapMedusaStatusToLegacy(order.status),
    created_at: order.created_at,
    tracking_number: order.metadata?.tracking_number || null,
  }));

  return (
    <AccountClient
      user={{ email: fullCustomer.email, id: fullCustomer.id }}
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
