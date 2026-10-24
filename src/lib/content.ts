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
  { duration: "24 months", price: 79, description: "Complete access to one course", recommended: true },
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
      "Course lessons and student access are provided through your Mr Flynn IB account on MrFlynnIB.com, with secure video delivery through Bunny Stream. Teachable remains available as a legacy option during the transition.",
  },
  {
    question: "Which IB Mathematics courses are covered?",
    answer:
      "Courses are available for Analysis & Approaches and Applications & Interpretation at both Higher and Standard Level: AA HL, AA SL, AI HL and AI SL.",
  },
  {
    question: "What access plans are available?",
    answer:
      "Each student course costs US$79 for 24 months of access. It is one payment and does not renew automatically. Approved teachers can optionally choose Teacher Plus for US$99 for 12 months of access to all four IB Mathematics courses.",
  },
  {
    question: "Does each access plan include the complete course?",
    answer:
      "A Free account includes the complete question bank, classroom tools and selected free lessons. Student Plus includes everything in Free, plus every lesson and its extra practice in one chosen IB course. Teacher Plus includes everything in Free, plus every lesson and its extra practice in all four IB courses.",
  },
  {
    question: "I am already enrolled. How do I access my lessons?",
    answer:
      "Sign in or create a Mr Flynn IB account using the same email address as your Teachable account. After you confirm the address, any matching active course is added automatically without another payment. The legacy Teachable site also remains available during the transition.",
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
