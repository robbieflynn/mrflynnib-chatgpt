import type { Curriculum } from "@/lib/account-access";

export type CourseProduct = {
  id: "aa-hl" | "aa-sl" | "ai-hl" | "ai-sl" | "igcse";
  curriculum: Curriculum;
  productCode: string;
  shortTitle: string;
  title: string;
  plans: CoursePlan[];
};

export type CoursePlan = {
  id: "one-year" | "two-years";
  label: string;
  priceUsd: number;
  accessDays: number;
  stripePriceEnv: string;
  badge?: string;
};

const standardPlans: CoursePlan[] = [
  { id: "one-year", label: "12 months", priceUsd: 69, accessDays: 365, stripePriceEnv: "" },
  { id: "two-years", label: "24 months", priceUsd: 99, accessDays: 730, stripePriceEnv: "", badge: "Best value" },
];

function plansFor(envPrefix: string): CoursePlan[] {
  return standardPlans.map((plan) => ({
    ...plan,
    stripePriceEnv: `${envPrefix}_${plan.id === "one-year" ? "ONE_YEAR" : "TWO_YEARS"}`,
  }));
}

export const courseProducts: CourseProduct[] = [
  { id: "aa-hl", curriculum: "ib", productCode: "course_ib_aa_hl", shortTitle: "AA HL", title: "Analysis & Approaches HL", plans: plansFor("STRIPE_PRICE_IB_AA_HL") },
  { id: "aa-sl", curriculum: "ib", productCode: "course_ib_aa_sl", shortTitle: "AA SL", title: "Analysis & Approaches SL", plans: plansFor("STRIPE_PRICE_IB_AA_SL") },
  { id: "ai-hl", curriculum: "ib", productCode: "course_ib_ai_hl", shortTitle: "AI HL", title: "Applications & Interpretation HL", plans: plansFor("STRIPE_PRICE_IB_AI_HL") },
  { id: "ai-sl", curriculum: "ib", productCode: "course_ib_ai_sl", shortTitle: "AI SL", title: "Applications & Interpretation SL", plans: plansFor("STRIPE_PRICE_IB_AI_SL") },
  { id: "igcse", curriculum: "igcse", productCode: "course_igcse", shortTitle: "IGCSE", title: "IGCSE Mathematics", plans: plansFor("STRIPE_PRICE_IGCSE") },
];

export function getCourseProduct(id: string | null | undefined) {
  return courseProducts.find((product) => product.id === id);
}

export function courseProductForCode(productCode: string) {
  return courseProducts.find((product) => product.productCode === productCode);
}

export function getCoursePlan(product: CourseProduct | undefined, planId: string | null | undefined) {
  return product?.plans.find((plan) => plan.id === planId);
}

export function productsForCurriculum(curriculum: Curriculum) {
  return courseProducts.filter((product) => product.curriculum === curriculum);
}
