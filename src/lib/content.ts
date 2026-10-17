export type Course = {
  slug: string;
  title: string;
  shortTitle: string;
  level: "HL" | "SL";
  pathway: "Analysis & Approaches" | "Applications & Interpretation";
  promise: string;
  description: string;
  outcomes: string[];
  modules: string[];
  teachableUrl: string;
};

export const courseAccessPlans = [
  { id: "three-months", duration: "3 months", durationMonths: 3, price: 49, description: "For focused exam revision", recommended: false },
  { id: "one-year", duration: "1 year", durationMonths: 12, price: 69, description: "For a full academic year", recommended: false },
  { id: "two-years", duration: "2 years", durationMonths: 24, price: 79, description: "For the complete IB journey", recommended: true },
] as const;

export const courses: Course[] = [
  {
    slug: "analysis-approaches-hl",
    title: "IB Mathematics: Analysis & Approaches HL",
    shortTitle: "AA HL",
    level: "HL",
    pathway: "Analysis & Approaches",
    promise: "Build the depth, fluency and exam judgement AA HL demands.",
    description:
      "A structured video course for students who want difficult ideas explained clearly, then practised in the way IB questions actually test them.",
    outcomes: [
      "Understand the reasoning behind core AA HL methods",
      "Recognise common IB question structures",
      "Move from worked examples to independent exam questions",
      "Use the calculator strategically rather than mechanically",
    ],
    modules: ["Algebra", "Functions", "Geometry & trigonometry", "Statistics & probability", "Calculus"],
    teachableUrl: process.env.NEXT_PUBLIC_TEACHABLE_AA_HL_URL ?? "https://learn.mrflynnib.com/p/aa-hl",
  },
  {
    slug: "analysis-approaches-sl",
    title: "IB Mathematics: Analysis & Approaches SL",
    shortTitle: "AA SL",
    level: "SL",
    pathway: "Analysis & Approaches",
    promise: "Turn a demanding syllabus into a clear, manageable plan.",
    description:
      "Concise teaching, carefully chosen examples and exam-focused practice for AA SL students who need clarity without unnecessary complication.",
    outcomes: [
      "Strengthen essential algebra and functions",
      "Build confidence with non-routine exam questions",
      "Improve calculator and non-calculator technique",
      "Revise efficiently across the full course",
    ],
    modules: ["Number & algebra", "Functions", "Geometry & trigonometry", "Statistics & probability", "Calculus"],
    teachableUrl: process.env.NEXT_PUBLIC_TEACHABLE_AA_SL_URL ?? "https://learn.mrflynnib.com/p/aa-sl",
  },
  {
    slug: "applications-interpretation-hl",
    title: "IB Mathematics: Applications & Interpretation HL",
    shortTitle: "AI HL",
    level: "HL",
    pathway: "Applications & Interpretation",
    promise: "Master modelling, technology and interpretation with purpose.",
    description:
      "A full AI HL course that makes the technology-heavy syllabus feel coherent, with emphasis on modelling, interpretation and communication.",
    outcomes: [
      "Choose and apply appropriate mathematical models",
      "Interpret calculator output accurately",
      "Communicate conclusions in IB-ready language",
      "Connect topics across extended questions",
    ],
    modules: ["Number & algebra", "Functions", "Geometry & trigonometry", "Statistics & probability", "Calculus"],
    teachableUrl: process.env.NEXT_PUBLIC_TEACHABLE_AI_HL_URL ?? "https://learn.mrflynnib.com/p/ai-hl",
  },
  {
    slug: "applications-interpretation-sl",
    title: "IB Mathematics: Applications & Interpretation SL",
    shortTitle: "AI SL",
    level: "SL",
    pathway: "Applications & Interpretation",
    promise: "Learn the maths, use the technology and explain what the answer means.",
    description:
      "A calm, practical course for AI SL students who want a reliable route through the syllabus and clearer exam technique.",
    outcomes: [
      "Use technology confidently and efficiently",
      "Interpret statistics and models in context",
      "Avoid common command-term mistakes",
      "Build a repeatable exam approach",
    ],
    modules: ["Number & algebra", "Functions", "Geometry & trigonometry", "Statistics & probability", "Calculus"],
    teachableUrl: process.env.NEXT_PUBLIC_TEACHABLE_AI_SL_URL ?? "https://learn.mrflynnib.com/p/ai-sl",
  },
];

export const faqs = [
  {
    question: "Where are the courses hosted?",
    answer:
      "Course lessons, payment and student access are being brought into the Mr Flynn IB platform. Until the new course area passes its final checks, existing Teachable access remains available to current students.",
  },
  {
    question: "Which IB Mathematics courses are covered?",
    answer:
      "Courses are available for Analysis & Approaches and Applications & Interpretation at both Higher and Standard Level: AA HL, AA SL, AI HL and AI SL.",
  },
  {
    question: "What access plans are available?",
    answer:
      "Each course has three one-time access options: 3 months for US$49, 1 year for US$69, or 2 years for US$79. The two-year plan offers the best value for students completing the full IB course.",
  },
  {
    question: "Does each access plan include the complete course?",
    answer:
      "Yes. Every access plan includes the same complete course. The only difference is how long you can access it.",
  },
  {
    question: "I am already enrolled. How do I access my lessons?",
    answer:
      "Use your Mr Flynn IB account to open your course dashboard. Existing Teachable students will keep their current access during the transition.",
  },
  {
    question: "How can I find out about tutoring?",
    answer:
      "Please email contact@mrflynnib.com for current tutoring information and availability.",
  },
  {
    question: "Can a school buy access for several students?",
    answer:
      "Yes. Schools can purchase two-year student licences using the pricing shown on the Schools page. Each student receives access to one selected course.",
  },
  {
    question: "Can a school request different courses within one cohort?",
    answer:
      "Yes. A school can request a mixture of AA HL, AA SL, AI HL and AI SL licences. The course allocation and practical setup are confirmed before invoicing.",
  },
  {
    question: "Do the courses replace school lessons?",
    answer:
      "No. They are designed to strengthen understanding, fill gaps, support revision and provide an expert explanation students can revisit whenever needed.",
  },
  {
    question: "Where can I buy the IA book?",
    answer:
      "The book has a dedicated page on this website with more information and a link to purchase it through Amazon.",
  },
];
