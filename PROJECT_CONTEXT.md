# MrFlynnIB permanent project context

Last updated: 26 July 2026

## Purpose of this file

This is the durable product memory for MrFlynnIB. Future Codex tasks must read it before making decisions. It captures the important context from earlier ChatGPT and Codex conversations so Rob does not need to explain the business repeatedly. It is a living summary, not a verbatim transcript; update it when lasting decisions change.

## Founder and business

Rob Flynn is building MrFlynnIB.com into a premium, expert-led home for IB Mathematics. Rob is an experienced IB Mathematics teacher who has worked as an IB examiner and moderator, has taught and supported thousands of students, and has received more than one million views on his educational videos. His central strength is explaining difficult IB Mathematics clearly through personal, engaging video lessons.

Authority should feel calm and well evidenced rather than boastful or corporate. Trust should come from clear teaching, useful content, genuine outcomes, verified testimonials, founder presence, and a high-quality experience. Content is specifically designed for the IB Mathematics curriculum rather than adapted from generic mathematics material.

## Vision

The website is the front door to a larger MrFlynnIB platform. The ambition is to become an outstanding home for the whole IB Mathematics journey, serving students, parents, teachers, departments, and international schools.

Possible long-term platform areas include:

- structured courses and bundles
- a searchable question bank
- revision planners and progress tools
- IA guidance and tools
- student dashboards
- teacher resources
- school dashboards and institutional reporting
- calculators and interactive mathematics tools
- carefully designed AI study support
- analytics that help students and schools understand engagement and progress

These are roadmap possibilities, not commitments to build everything immediately. New features must solve a real user or business problem and fit the evolving product strategy.

## Current offers

### Online courses

Courses cover the IB Mathematics pathways AA HL, AA SL, AI HL, and AI SL. Teachable hosts course checkout, enrolment, login, and learning delivery. MrFlynnIB.com should provide premium course landing pages, previews, curriculum information, FAQs, evidence, and clear calls to action, then send customers deliberately and seamlessly to the correct Teachable destination. Existing students need an obvious Teachable login route.

Do not duplicate Teachable's learning platform unless a later strategic decision provides a compelling reason.

### Book

The website includes a book area intended to explain the book, its audience, the problem it solves, reviews or sample material, and verified purchase links. It should support additional books later and cross-promote relevant offers without becoming cluttered. Exact book details and purchase links must be confirmed rather than invented.

### Private tutoring

Tutoring should feel selective, premium, personal, and results-focused—not like a cheap hourly marketplace. The site should explain fit, pathways supported, Rob's approach, session process, availability, commitment, pricing or enquiry strategy, and whether provision is directly from Rob or a future approved team. The application captures useful student, parent, school, timezone, course, grade, target, exam, difficulty, and availability information.

### School licences

The school offer is for teachers, departments, IB coordinators, school leaders, finance teams, and educational organisations. It should clearly explain access, included resources, possible licence tiers, duration, onboarding, teacher support, reporting where appropriate, departmental benefits, and the quotation or demonstration process. The system should be able to support proposals, invoices, and institutional access later.

### Free content

Useful free content builds trust and demand. This can include YouTube lessons, revision guides, topic explanations, formula resources, exam strategy, practice questions, calculators, interactive tools, downloads, email learning, sample lessons, and teacher resources. Free content should genuinely help before asking visitors to buy and should lead naturally to the most relevant next step.

## Audiences and journeys

The principal audiences are:

- IB Mathematics students
- parents and guardians
- IB Mathematics teachers
- heads of mathematics
- IB coordinators and school leaders
- international schools
- existing course customers
- prospective tutoring clients

Do not force everyone through the same funnel. Important journeys include YouTube viewer to useful resource to email subscriber to course; student to course page to Teachable; parent to credibility and outcomes to tutoring enquiry; teacher to free resource to school licence; school leader to licence information to demo or proposal; book buyer to relevant course or email list; and existing customer to Teachable login or support.

## Brand and experience

The desired identity is intelligent, calm, clear, modern, personal, academic without being old-fashioned, premium without being pretentious, and friendly without being childish.

Avoid generic education clichés, excessive stock photography, cartoonish visuals, clutter, aggressive sales language, and template-like layouts. Use generous space, purposeful hierarchy, strong typography, Rob's authentic presence, and the existing blue Mr Flynn IB branding. Stripe, Linear, Apple, and other high-quality modern product experiences can inspire clarity and polish, but their visual identities should not be copied.

The established homepage direction uses the phrase **“IB Maths, explained properly.”** and gives clear routes to students, parents, teachers, and schools. Rob's supplied assets include the blue Mr Flynn IB mark, full logo, professional portrait, and a Dubai mathematics graphic. The mark is used in navigation, footer, and browser icons; the portrait supports founder credibility; the Dubai graphic is used selectively rather than as the principal hero image.

Copy should be clear, specific, warm, confident, expert, and persuasive without pressure. Avoid vague phrases such as “unlock your potential” unless attached to specific evidence. Never invent facts to make copy sound finished.

## Current website and technology

Repository: `robbieflynn/mrflynnib-chatgpt`

Public website previously supplied by Rob: `https://mrflynnib-chatgpt.vercel.app/`

The project is a Next.js App Router website using React, TypeScript, Tailwind CSS, and Vercel. Supabase is prepared for enquiry storage where needed. Stripe should be used only if the main website later needs to process payments directly. Teachable remains the course platform.

The repository currently contains:

- a premium platform-style homepage
- course catalogue and individual AA/AI, HL/SL pages
- Teachable enrolment and login foundations
- free resource library and starter resource pages
- tutoring page and application form
- school licence page and enquiry form
- book, About, Results, Contact, and FAQ pages
- privacy, terms, and cookie foundations
- Supabase-ready enquiry handling and schema
- metadata, sitemap, robots, Open Graph, analytics hooks, and security headers
- responsive components and supplied brand imagery

Launch information still requiring verified input includes live Teachable URLs, precise course availability and prices, book details and purchase link, genuine testimonials and outcomes, tutoring availability and commercial details, confirmed school licence terms, production analytics configuration, and completed legal review.

## Agreed working relationship

Rob wants Codex to act as a long-term product and implementation partner: product strategist, designer, copywriter, engineer, education specialist, and constructive co-founder-like collaborator. This means taking ownership and offering good recommendations, while preserving Rob's authority over business decisions and publication.

The workflow must remain simple:

1. Rob discusses the product and requests a change in the MrFlynnIB Codex project.
2. Codex reads this context and inspects the real repository.
3. Codex makes a focused change on a branch and runs checks.
4. Codex creates a pull request when GitHub authentication allows it.
5. Vercel creates a preview that Rob can inspect without changing production.
6. Codex and Rob revise the preview as needed.
7. The change is merged and published only after Rob approves it.

Do not return to full-site ZIP transfers for ordinary development. Keep one repository and evolve it incrementally.

Accuracy and transparency are especially important. Earlier assistance incorrectly claimed to have visually inspected a protected live deployment. Never repeat that mistake. State the evidence actually available: code, local render, screenshot, public page, or preview.

## Current work in progress

A temporary workflow test was requested: add a large banner at the top of the homepage saying exactly **“Hello, it worked.”** without changing other content.

The banner was implemented and committed locally on branch `agent/add-homepage-success-banner` with commit `59e20ae`. Lint completed with one pre-existing warning in `postcss.config.mjs`, and the full Next.js production build passed. The push was blocked because local GitHub authentication was not configured; therefore no remote branch, pull request, or Vercel preview had been created at the time this context was written.

The local repository also contains untracked generated dependency/build items from verification (`node_modules/`, `.next/`, `pnpm-lock.yaml`, and `pnpm-workspace.yaml`). These are not part of the banner commit and must not be added to a pull request without an intentional dependency-management decision.

## Immediate next steps

1. Complete GitHub write authentication for the local repository.
2. Push `agent/add-homepage-success-banner`.
3. Open a draft pull request targeting `main`.
4. Wait for and report the Vercel preview URL.
5. Let Rob confirm the workflow by viewing the temporary banner.
6. Remove the temporary banner after the test, using the same preview-and-approval workflow.
7. Reconcile and remove unneeded generated local files without including them in product commits.

