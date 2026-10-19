import "server-only";
import { courseAccessPlans, courses } from "@/lib/content";

export type CourseAccessPlanId = (typeof courseAccessPlans)[number]["id"];

export function getCoursePurchase(courseSlug: string, planId: string) {
  const course = courses.find((item) => item.slug === courseSlug);
  const plan = courseAccessPlans.find((item) => item.id === planId);
  if (!course || !plan) return null;

  return {
    course,
    plan,
    amountInBaseUnits: plan.price * 100,
    currency: "USD" as const,
  };
}
