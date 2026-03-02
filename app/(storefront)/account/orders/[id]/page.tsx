import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { OrderDetails } from "@/components/account/order-details";
import { getMedusaCustomerData } from "@/lib/medusa-bridge";

export default async function OrderPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const { id } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch Medusa Data via Bridge to get all orders and then find this specific one
  // In a production app, we'd have a specific bridge endpoint for a single order
  // But for now, we can use the bridge to verify and get data
  const medusaData = await getMedusaCustomerData(user.email!);

  if (!medusaData) {
    notFound();
  }

  const order = medusaData.orders.find((o: any) => o.id === id);

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

  // Map Medusa Order to Supabase shape for the UI
  const mappedOrder = {
    ...order,
    status: mapMedusaStatusToSupabase(order.status),
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

function mapMedusaStatusToSupabase(status: string) {
  switch (status) {
    case "pending": return "pending";
    case "completed": return "delivered";
    case "canceled": return "cancelled";
    default: return "pending";
  }
}
