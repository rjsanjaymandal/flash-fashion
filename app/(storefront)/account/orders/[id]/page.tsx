import { getMedusaSession } from "@/app/actions/medusa-auth";
import { notFound, redirect } from "next/navigation";
import { OrderDetails } from "@/components/account/order-details";
import { cookies } from "next/headers";

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://127.0.0.1:9000"

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const customer = await getMedusaSession();
  const { id } = await params;

  if (!customer) {
    redirect("/login");
  }

  const cookieStore = await cookies()
  const token = cookieStore.get('medusa_token')?.value

  if (!token) redirect("/login");

  // Fetch Medusa Order directly
  let order = null;
  try {
    const res = await fetch(`${BACKEND_URL}/store/customers/me/orders/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 0 }
    })
    if (res.ok) {
      const data = await res.json()
      order = data.order
    }
  } catch (e) { }

  if (!order) {
    notFound();
  }

  // Map Medusa Order Items to the shape expected by OrderDetails
  const items = order.items.map((item: any) => ({
    id: item.id,
    name_snapshot: item.title,
    quantity: item.quantity,
    unit_price: item.unit_price,
    color: item.metadata?.color || null,
    size: item.metadata?.size || null,
    fit: item.metadata?.fit || null,
    products: {
      name: item.title,
      main_image_url: item.thumbnail,
      slug: item.variant?.product?.handle || "",
      description: item.variant?.product?.description || ""
    }
  }));

  // Map Medusa Order to Legacy shape for the UI
  const mappedOrder = {
    ...order,
    status: mapMedusaStatusToLegacy(order.status),
    tracking_number: order.metadata?.tracking_number || null,
    shipping_name: order.shipping_address?.first_name ? `${order.shipping_address.first_name} ${order.shipping_address.last_name || ""}` : null,
    address_line1: order.shipping_address?.address_1,
    address_line2: order.shipping_address?.address_2,
    city: order.shipping_address?.city,
    state: order.shipping_address?.province,
    pincode: order.shipping_address?.postal_code,
    phone: order.shipping_address?.phone
  };

  return (
    <div className="min-h-screen bg-background">
      <OrderDetails order={mappedOrder} items={items || []} />
    </div>
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
