import { NextResponse } from "next/server";
import { getPlatformAccess } from "@/lib/platform-server";
import { getCourseProduct, teacherPlusProduct } from "@/lib/platform-products";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ error: "Trial request was rejected." }, { status: 403 });
  try {
    const body = await request.json().catch(() => ({}));
    const product = body.productId === teacherPlusProduct.id ? teacherPlusProduct : getCourseProduct(body.courseId);
    if (!product || product.curriculum !== "ib") return NextResponse.json({ error: "Choose an IB course or Teacher Plus." }, { status: 400 });
    const session = await getPlatformAccess("ib");
    if (!session.user) return NextResponse.json({ error: "Sign in to start your trial." }, { status: 401 });
    const { data, error } = await session.supabase.rpc("start_plus_trial", { requested_product: product.productCode });
    if (error) {
      const messages: Record<string, string> = {
        trial_used: "This account has already used its free trial. Choose a Plus plan to continue.",
        access_active: "You already have course access. Open your course from My account.",
        teacher_required: "Your teacher account must be approved before starting a Teacher Plus trial.",
        confirm_email: "Confirm your email address before starting your trial.",
      };
      const key = Object.keys(messages).find((item) => error.message.includes(item));
      return NextResponse.json({ error: key ? messages[key] : "Your trial could not be started. Please try again shortly." }, { status: key ? 409 : 503 });
    }
    const trial = Array.isArray(data) ? data[0] : data;
    if (!trial?.expires_at) return NextResponse.json({ error: "Your trial could not be confirmed. Please try again." }, { status: 503 });
    const url = product.id === "teacher-plus" ? "/teacher/access" : `/account/access?single=1&course=${product.id}`;
    return NextResponse.json({ url }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Your trial could not be started. Please try again shortly." }, { status: 503 });
  }
}
