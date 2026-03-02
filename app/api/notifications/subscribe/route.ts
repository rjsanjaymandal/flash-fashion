import { getMedusaSession } from "@/app/actions/medusa-auth";
import { updateMedusaCustomerMetadata } from "@/lib/medusa-bridge";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { subscription } = await request.json();

  if (!subscription) {
    return NextResponse.json({ error: "Subscription missing" }, { status: 400 });
  }

  const customer = await getMedusaSession();

  if (!customer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Store push subscription in Medusa customer metadata
    await updateMedusaCustomerMetadata(customer.id, {
      push_subscription: JSON.stringify(subscription)
    });

    return NextResponse.json({ message: "Subscribed successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error saving subscription:", error);
    return NextResponse.json({ error: "Medusa Bridge error" }, { status: 500 });
  }
}
