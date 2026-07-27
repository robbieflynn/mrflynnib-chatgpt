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
  { duration: "3 months", price: 49, description: "For focused exam revision", recommended: false },
  { duration: "1 year", price: 69, description: "For a full academic year", recommended: false },
  { duration: "2 years", price: 79, description: "For the complete IB journey", recommended: true },
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
    teachableUrl: process.env.NEXT_PUBLIC_TEACHABLE_AA_HL_URL ?? "https://mrflynnib.com/p/aa-hl",
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
    teachableUrl: process.env.NEXT_PUBLIC_TEACHABLE_AA_SL_URL ?? "https://mrflynnib.com/p/aa-sl",
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
    teachableUrl: process.env.NEXT_PUBLIC_TEACHABLE_AI_HL_URL ?? "https://mrflynnib.com/p/ai-hl",
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
    teachableUrl: process.env.NEXT_PUBLIC_TEACHABLE_AI_SL_URL ?? "https://mrflynnib.com/p/ai-sl",
  },
];

export const resources = [
  {
    slug: "choosing-aa-or-ai",
    title: "AA or AI? How to choose the right IB Mathematics course",
    summary: "A practical guide for students and parents comparing content, style and future options.",
    audience: "Students & parents",
    readTime: "7 min",
  },
  {
    slug: "ib-maths-revision-plan",
    title: "A six-week IB Mathematics revision plan",
    summary: "A realistic structure for revising content, question types and full papers without panic-cramming.",
    audience: "Students",
    readTime: "9 min",
  },
  {
    slug: "what-examiners-look-for",
    title: "What IB Mathematics examiners are actually looking for",
    summary: "How method, notation, interpretation and communication affect marks.",
    audience: "Students & teachers",
    readTime: "8 min",
  },
];

export const faqs = [
  {
    question: "Where are the courses hosted?",
    answer:
      "Course lessons and student access are hosted on Teachable. MrFlynnIB.com explains the courses, helps you choose the right one and links securely to Teachable for enrolment and login.",
  },
  {
    question: "Which IB Mathematics courses are covered?",
    answer:
      "Courses are available for Analysis & Approaches and Applications & Interpretation at both Higher and Standard Level: AA HL, AA SL, AI HL and AI SL.",
  },
  {
    question: "Is tutoring taught personally by Rob?",
    answer:
      "Please email contact@mrflynnib.com for current tutoring information and availability.",
  },
  {
    question: "Can a school buy access for several students?",
    answer:
      "Yes. School licences are designed for departments that want structured student access, teacher onboarding and a straightforward quotation or invoice process.",
  },
  {
    question: "Do the courses replace school lessons?",
    answer:
      "No. They are designed to strengthen understanding, fill gaps, support revision and provide an expert explanation students can revisit whenever needed.",
  },
];
