import type { Curriculum } from "@/lib/account-access";

export type CourseProduct = {
  id: "aa-hl" | "aa-sl" | "ai-hl" | "ai-sl" | "igcse";
  curriculum: Curriculum;
  productCode: string;
  shortTitle: string;
  title: string;
  priceUsd: number;
  accessDays: number;
  stripePriceEnv: string;
};

export const courseProducts: CourseProduct[] = [
  { id: "aa-hl", curriculum: "ib", productCode: "course_ib_aa_hl", shortTitle: "AA HL", title: "Analysis & Approaches HL", priceUsd: 69, accessDays: 365, stripePriceEnv: "STRIPE_PRICE_IB_AA_HL" },
  { id: "aa-sl", curriculum: "ib", productCode: "course_ib_aa_sl", shortTitle: "AA SL", title: "Analysis & Approaches SL", priceUsd: 69, accessDays: 365, stripePriceEnv: "STRIPE_PRICE_IB_AA_SL" },
  { id: "ai-hl", curriculum: "ib", productCode: "course_ib_ai_hl", shortTitle: "AI HL", title: "Applications & Interpretation HL", priceUsd: 69, accessDays: 365, stripePriceEnv: "STRIPE_PRICE_IB_AI_HL" },
  { id: "ai-sl", curriculum: "ib", productCode: "course_ib_ai_sl", shortTitle: "AI SL", title: "Applications & Interpretation SL", priceUsd: 69, accessDays: 365, stripePriceEnv: "STRIPE_PRICE_IB_AI_SL" },
  { id: "igcse", curriculum: "igcse", productCode: "course_igcse", shortTitle: "IGCSE", title: "IGCSE Mathematics", priceUsd: 69, accessDays: 365, stripePriceEnv: "STRIPE_PRICE_IGCSE" },
];

export function getCourseProduct(id: string | null | undefined) {
  return courseProducts.find((product) => product.id === id);
}

export function courseProductForCode(productCode: string) {
  return courseProducts.find((product) => product.productCode === productCode);
}

export function productsForCurriculum(curriculum: Curriculum) {
  return courseProducts.filter((product) => product.curriculum === curriculum);
}
