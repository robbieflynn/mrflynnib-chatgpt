import { NextResponse } from "next/server";
import { getPlatformAccess } from "@/lib/platform-server";
import { getCourseProduct } from "@/lib/platform-products";

export async function POST(request: Request) {
  const session = await getPlatformAccess();
  if (!session.user || !session.curriculum) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const product = getCourseProduct(typeof body.courseId === "string" ? body.courseId : "");
  if (!product || product.curriculum !== session.curriculum) return NextResponse.json({ error: "Invalid course" }, { status: 400 });
  if (session.ownedCourses.some((course) => course.id === product.id)) return NextResponse.json({ url: "/learn" });
  const secret = process.env.STRIPE_SECRET_KEY;
  const price = process.env[product.stripePriceEnv];
  if (!secret || !price) return NextResponse.json({ error: "Checkout is not configured in this preview yet." }, { status: 503 });
  const origin = new URL(request.url).origin;
  const params = new URLSearchParams({
    mode: "payment",
    "line_items[0][price]": price,
    "line_items[0][quantity]": "1",
    customer_email: session.user.email || "",
    client_reference_id: session.user.id,
    "metadata[user_id]": session.user.id,
    "metadata[product_code]": product.productCode,
    "metadata[curriculum]": product.curriculum,
    "metadata[access_days]": String(product.accessDays),
    success_url: `${origin}/account/access?checkout=success&course=${product.id}`,
    cancel_url: `${origin}/account/access?checkout=cancelled&course=${product.id}`,
  });
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" }, body: params });
  const checkout = await response.json();
  if (!response.ok || !checkout.url) return NextResponse.json({ error: "Checkout could not be started. Please try again." }, { status: 502 });
  return NextResponse.json({ url: checkout.url });
}
