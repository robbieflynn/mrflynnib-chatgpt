# MrFlynnIB permanent project context

Last updated: 29 July 2026

## Purpose of this file

This is the durable product memory for MrFlynnIB. Future Codex tasks must read it before making decisions. It captures the important context from earlier ChatGPT and Codex conversations so Rob does not need to explain the business repeatedly. It is a living summary, not a verbatim transcript; update it when lasting decisions change.

## Founder and business

Rob Flynn is building MrFlynnIB.com into a premium, expert-led home for IB Mathematics. Rob is an experienced IB Mathematics teacher who has worked as an IB examiner and moderator, has taught and supported thousands of students, and has received more than one million views on his educational videos. His central strength is explaining difficult IB Mathematics clearly through personal, engaging video lessons.

Rob lives in Dubai, United Arab Emirates, and currently operates Mr Flynn IB personally rather than through a separate incorporated company. For website legal and privacy copy, identify the operator as **Robert Flynn, operating as Mr Flynn IB**, without stating his location. Use `contact@mrflynnib.com` for legal and privacy enquiries.

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

Courses cover the IB Mathematics pathways AA HL, AA SL, AI HL, and AI SL. Teachable hosts course checkout, enrollment, login, and learning delivery. MrFlynnIB.com should provide premium course landing pages, previews, curriculum information, FAQs, evidence, and clear calls to action, then send customers deliberately and seamlessly to the correct Teachable destination. Existing students need an obvious Teachable login route.

Every individual course will offer the same three one-time access options: **3 months for US$49**, **1 year for US$69**, and **2 years for US$79**. The two-year option is the recommended, best-value plan. Every option includes the same complete course; only the access period changes. Do not use an invented crossed-out price or make the one-year option more expensive than two years.

Keep the prospective-customer and existing-student journeys distinct. The main Courses page should simply say **“Choose your course”** and present AA HL, AA SL, AI HL, and AI SL without prices or unnecessary course-choice advice. Each individual course page should preview the three access options but use one principal **“View access plans and enroll”** button leading to that course's Teachable purchase page, where the student selects and purchases a plan. Existing students should have a persistent, obvious **“My courses”** route to Teachable in the website navigation and a supporting **“Already enrolled?”** route on course pages.

Do not duplicate Teachable's learning platform unless a later strategic decision provides a compelling reason.

### Book

Rob's book is **IB Mathematics IA: The Complete Guide to the Internal Assessment**, published under the name Robert Flynn by Zouev Elite Publishing in 2025. It is a 320-page paperback with ISBN-10 `1068444231` and ISBN-13 `9781068444234`. The verified purchase destination supplied by Rob is `https://www.amazon.ae/dp/1068444231`. The website should give the book a dedicated page, connect it to Rob's wider IA expertise, and cross-promote relevant free IA videos without becoming cluttered.

The Amazon UAE listing was verified on 27 July 2026 as showing **5.0 out of 5 from 3 reviews**. The book page may show this as a restrained linked rating, but it is time-sensitive and must be rechecked before production launch or future copy changes.

### Private tutoring

For the current launch, the tutoring route should remain intentionally simple and should say: **“For more information about tutoring, please email contact@mrflynnib.com.”** The email address must be clickable. Do not promise availability, prices, delivery by Rob personally, or a detailed tutoring process until Rob confirms those details.

### School licences

The school offer is for teachers, departments, IB coordinators, school leaders, finance teams, and educational organisations. It should clearly explain access, included resources, possible licence tiers, duration, onboarding, teacher support, reporting where appropriate, departmental benefits, and the quotation or demonstration process. The system should be able to support proposals, invoices, and institutional access later.

School packages provide two years of access for a defined student cohort. Each student licence is assigned to one selected course: AA HL, AA SL, AI HL, or AI SL. A school may request different course allocations within its cohort, but an individual student does not receive all four courses. Current agreed launch pricing is:

- 10 student licences at US$50 each: US$500 total for two years
- 25 student licences at US$40 each: US$1,000 total for two years
- 50 student licences at US$30 each: US$1,500 total for two years
- 100 student licences at US$20 each: US$2,000 total for two years
- More than 100 students: custom quote

These should be sold as fixed cohort packages with one school invoice rather than consumer-style subscriptions. The 50-seat option is the “Most popular” package. Package headings should be neutral and factual, using the number of student licences rather than labels that imply a particular school, department, or cohort size. Each student receives two years of access to one selected course, complete lessons across all five topic areas, IA guidance, and past-paper solutions. Package buttons should prefill the corresponding student count in the school enquiry form. Keep the final free-text field optional and label it “Any other information”. Before publication, confirm access start dates, account provisioning, support, taxes, mixed-course allocation and renewal arrangements for each new cohort.

School enquiry submissions are stored in Supabase when configured. The website also contains a Resend notification foundation that emails new school enquiries to `contact@mrflynnib.com` by default. Production email requires `RESEND_API_KEY` and a verified `ENQUIRY_FROM_EMAIL`; `ENQUIRY_NOTIFICATION_EMAIL` may override the recipient. The database record remains the reliable copy if email delivery fails. The public site must not be described as sending email notifications until these production settings and a real submission have been tested.

### Free content

Useful free content builds trust and demand. This can include YouTube lessons, revision guides, topic explanations, formula resources, exam strategy, practice questions, calculators, interactive tools, downloads, email learning, sample lessons, and teacher resources. Free content should genuinely help before asking visitors to buy and should lead naturally to the most relevant next step.

The unfinished standalone written **Free Resources** area and its three starter articles have been removed from the current website, navigation and sitemap. Do not restore or link to a general Resources section until Rob chooses to develop it properly. The verified YouTube lessons, IA playlists, syllabus checklist and question bank remain the current free-content routes.

The verified homepage sample lesson is `https://www.youtube.com/watch?v=o3aDg3PZraY&list=PLcvv9pSnukaU11Abk84eQ1OZVqXsqATQh&index=3`. Use video ID `o3aDg3PZraY` for the privacy-enhanced embed and do not invent a title that has not been verified.

Verified official social channels are:

- YouTube: `https://www.youtube.com/mrflynnib`
- Instagram: `https://www.instagram.com/mrflynnib/`
- TikTok: `https://www.tiktok.com/@mrflynnib/`

Link these from the global footer so they are available throughout the website. Give YouTube the strongest prominence because it supports Mr Flynn IB's established teaching credibility.

The homepage offers a secondary **“Get the free syllabus checklist”** route beside the main course button. It leads to an email-capture section immediately after the four principal route cards and before “Who is Mr Flynn?”. Ask only for first name, email address, and one of AA HL, AA SL, AI HL, or AI SL, then use a clear **“Email me my checklist”** action. Present the checklists as an established free resource in the customer-facing design rather than as an interest list or forthcoming product. The downloadable files, MailerLite subscriber routing and four delivery automations are now configured.

MailerLite is the agreed mailing-list and marketing-email platform. Rob created the account using `mrflynnib@gmail.com` as the private account login and added `mrflynnib.com` as the sending domain so public emails can come from `contact@mrflynnib.com`. The customer-facing checklist form must remain on the Mr Flynn IB website; MailerLite should operate invisibly in the background. The implemented journey is a single on-site form, subscriber grouping by AA HL, AA SL, AI HL or AI SL, and automatic delivery of the requested checklist from the Mr Flynn IB domain. Because ordinary business email is routed through Google, the single root SPF record must authorise both Google (`_spf.google.com`) and MailerLite (`_spf.mlsend.com`).

MailerLite sending-domain authentication was completed successfully on 28 July 2026. The authoritative Cloudflare records were independently verified as containing MailerLite's domain verification TXT record, the `litesrv._domainkey` DKIM CNAME, and the combined SPF value `v=spf1 a mx include:_spf.google.com include:_spf.mlsend.com ~all`. The Google MX record remained intact, and MailerLite reported the domain setup as complete.

The four MailerLite subscriber groups have been created: `Syllabus checklist - AA HL` (`194264072949073276`), `Syllabus checklist - AA SL` (`194264085870675092`), `Syllabus checklist - AI HL` (`194264098118042767`), and `Syllabus checklist - AI SL` (`194264136110049031`). These group IDs are public configuration rather than secrets. The homepage form has a dedicated server-side MailerLite signup route that validates the submission and maps each course to its group.

The MailerLite API token has now been stored as a sensitive Vercel environment variable for Production and Preview, and the preview was redeployed. All four approved syllabus checklist PDFs are published from the website under `/downloads/`: `mr-flynn-ib-aa-hl-syllabus-checklist.pdf`, `mr-flynn-ib-aa-sl-syllabus-checklist.pdf`, `mr-flynn-ib-ai-hl-syllabus-checklist.pdf`, and `mr-flynn-ib-ai-sl-syllabus-checklist.pdf`. MailerLite should use four group-triggered automations, each linking to the matching website-hosted PDF rather than attaching the file to the email.

The four delivery automations were completed and activated in MailerLite on 29 July 2026: `Send AA HL syllabus checklist.` (`194270478121043381`), `Send AA SL syllabus checklist.` (`194320643077965086`), `Send AI HL syllabus checklist.` (`194323874578433999`), and `Send AI SL syllabus checklist.` (`194324726714205752`). The AA HL journey was successfully tested end to end. A subsequent live test exposed duplicated AA HL download targets inside the AI email designs; all four download buttons were then standardised and verified individually on 29 July. Each now uses the same centred primary-blue style, 14px text, 8px vertical spacing and the course-specific label pattern `DOWNLOAD MY [COURSE] CHECKLIST`, with hidden extra line breaks removed. Until the main domain is moved from Teachable to Vercel, all four buttons use the stable `agent/homepage-redesign` Vercel preview domain with their matching `/downloads/...` PDF paths. Change them to canonical `https://mrflynnib.com/downloads/...` links at production launch. Copies of all four PDFs are also stored in MailerLite's file manager.

MailerLite's group-join trigger sends each checklist automation once when a subscriber first joins that course group. Re-submitting the same address for the same course does not retrigger the email; joining a different course group does trigger that course's automation. Keep this one-time behaviour for launch to avoid accidental repeated sends. Use a fresh address or Gmail `+` alias for repeat testing, or later add an immediate post-signup download link if customers need a self-service second download.

Checklist delivery and ongoing marketing permission are now presented separately. The checklist form includes an optional, unticked email-marketing choice. A checklist request is still added to the relevant course-delivery group so its one-time automation can run; an affirmative marketing choice is recorded through MailerLite's `opted_in_at` value. Future marketing campaigns must use a consent-based audience and must not treat membership of a checklist-delivery group alone as marketing permission.

On the main Courses page, each course card should use its complete visible name, including the level: **Analysis & Approaches HL**, **Analysis & Approaches SL**, **Applications & Interpretation HL**, and **Applications & Interpretation SL**. Keep these cards intentionally simple: course code, complete name, and a “View course” action, without a separate promotional promise. Preserve each course-specific promise on its individual course page. Individual course pages should not show a syllabus-lesson, topic-area, or access-option statistics strip. Introduce the outcomes section as **“What you’ll learn”**. Within each collapsible curriculum topic, show the lessons as one continuous vertical sequence rather than an alternating two-column grid so the syllabus order is unambiguous.

### Question bank

The question bank is one of the four principal product routes and should be presented as free for now, with the possibility of paid access later. Rob supplied the first working collection as a self-contained HTML artifact created with Claude. It contains 53 legacy HL questions from four May 2014 papers, complete mark schemes, filters, and nine questions with mathematical diagrams. This verified content is now the foundation of the native website question bank rather than a “coming soon” placeholder.

Keep the first release transparent about its scope: it currently contains Legacy HL rather than the four present-day AA/AI pathways. Students should be able to search and filter by course, paper, topic, subtopic, difficulty, and exam session, and reveal the mark scheme only when ready. Preserve the mathematical notation and diagrams when extending or migrating the data. Future additions should use the same structured data model so the bank can grow without redesigning the page.

The question-bank journey should begin with four prominent course choices: **AA HL, AA SL, AI HL, and AI SL**. Treat these as the primary routes rather than burying course choice inside a dropdown. Until verified current-course questions have been classified and added, keep the supplied 53 questions in a clearly separate **Legacy HL archive**; do not guess which current AA/AI course an older question belongs to.

The agreed launch access model is a two-level free release. Visitors may use a useful public sample without an account. Creating a free MrFlynnIB website account unlocks the remainder of the question bank during an initial one-to-two-month early-access period. Present this honestly as free early access and make clear that access arrangements may change later. Logging in and joining the marketing mailing list must remain separate choices; do not add question-bank account holders to marketing emails without explicit consent. The later paid model, price, duration and any inclusion with Teachable courses or school licences remain to be decided.

Rob has confirmed that he previously worked with the IB and received direct guidance that questions may be used when they have been changed sufficiently. He confirms that the questions intended for this bank have been changed accordingly and does not want their original sources displayed publicly. Treat this as Rob's product-owner confirmation rather than an independently verified legal opinion. Preserve any private provenance or working notes included in supplied files, but do not add public source labels unless Rob requests them or a particular third-party licence expressly requires attribution.

Rob supplied the English November 2020 Legacy HL source papers and matching markschemes for Paper 1, Paper 2 and the Calculus Paper 3. The set has been inspected and contains 27 questions in total: 12 in Paper 1, 11 in Paper 2 and 4 in Calculus Paper 3. The notation, diagrams and question-to-markscheme pairings are readable. Treat these PDFs as private source material for classification and sufficiently changed question-bank content. Do not publish the original paper pages, original markscheme pages or verbatim IB wording.

### Internal Assessment (IA)

IA guidance is a major part of Rob's reputation and should be treated as a prominent, dedicated website area rather than buried inside general course or free-resource content. The homepage should introduce this expertise clearly and lead to an IA section containing Rob's videos, his complete IA guide playlist, an IA ideas playlist, and the IA book. The playlists should remain clearly distinguished so visitors can choose between learning the full process and exploring possible topics.

Verified YouTube sources:

- Complete IA guide playlist: `https://www.youtube.com/watch?v=pp_CLHH8OgY&list=PLcvv9pSnukaVkFh_OkFceh0aD9Ov02UjV` (opens with “IB Math IA Complete Guide Part 1: An Introduction”)
- IA ideas playlist: `https://www.youtube.com/watch?v=e5cLTtFzKnI&list=PLcvv9pSnukaVyAMiGPRxJsh6L2wydKFPm` (opens with “IB Math IA: Modelling a Skateboard Ramp”)

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

The homepage headline is **“The home of IB Mathematics.”** The hero should be simple and brand-led: no portrait, credentials, authority strip, “expert-led” label, free-lesson chip, or YouTube metric in the opening banner. Its supporting line should lead with **complete IB Mathematics courses**, trusted IA guidance, and focused support for students, teachers, and schools. Do not end the hero by naming Rob; use the Mr Flynn IB brand voice.

Keep a clear **Contact** route in the top navigation. Retain **Explore courses** as the header's primary call to action for now, but do not include a separate **Explore IA guidance** button in the homepage hero; the IA section provides that route later on the page.

Keep the general Contact page deliberately simple. Show `contact@mrflynnib.com` prominently with a direct email action rather than a general-purpose form. Direct existing students to **My courses** and schools to the dedicated school enquiry form, which remains structured because those enquiries require specific information.

The four principal routes are **Courses, Question bank, Schools, and Tutoring**. They should appear immediately below the homepage hero, without a “Start here” eyebrow or generic route-selection explanation. Treat the four cards consistently rather than making Courses a dark-blue visual exception. Keep the Courses description simple: **“Complete online courses for all IB Mathematics courses.”** Keep the Schools description general and do not mention annual pricing or a single invoice on the homepage card. The four individual course cards, price comparison, and “compare all four courses” prompt belong on the Courses page rather than the homepage because students normally already know their IB pathway.

After the four routes, the homepage should include a separate **“Who is Mr Flynn?”** credibility section with a small supporting portrait, not a dominant full-height image, and no “About Mr Flynn” button. Use the relevant evidence: experienced IB Mathematics teacher, IB examiner, IA moderator, and **1 million+ YouTube views**. Its introduction should say that his lessons have helped IB students across the world succeed in IB Mathematics. Avoid calling him “Rob” in customer-facing homepage copy; use “Mr Flynn” or “Mr Flynn IB”. Do not use the generic `24/7` proof point.

The book and IA each receive prominent separate sections rather than becoming a fifth primary route. Place the complete example lesson before IA guidance on the homepage. Present it as an **example lesson**, not as “See how Rob teaches”, and do not describe it as something to watch before choosing a course. Its adjacent student-experience panel should be simple and precisely aligned with the video. Keep the IA introduction direct: begin with the complete video guide, possible ideas, and the book without stating that the IA made Mr Flynn well known. Blend the Dubai/Burj Al Arab mathematics image into the dark IA guidance background. Keep Student experiences as a separate light section after IA so the page alternates between light and dark content rather than placing two dark sections together. Do not add a repeated “Ready to begin?” course CTA after the book section.

Rob's supplied assets include the blue Mr Flynn IB mark, full joined logo, professional portrait, and a Dubai mathematics graphic. Use the full joined Mr Flynn IB logo in the top-left header and retain the standalone blue mark for the favicon. The portrait should appear at a restrained size within the homepage credibility section and may also support the About page, but it should not dominate the homepage hero or founder section. The Dubai graphic should be blended into the homepage IA section rather than serving as the principal hero image. Keep the image clearly recognisable—especially the Burj Al Arab and Rob's mathematical overlay—rather than darkening it until it is barely visible, while preserving sufficient contrast behind the IA copy.

Remove the temporary yellow workflow banner and simplify the previous busy hero mockup. Do not show invented progress percentages, “lesson ready” states, or unverified interface metrics. The `1M+` proof point must explicitly say **YouTube views**.

Copy should be clear, specific, warm, confident, expert, and persuasive without pressure. Avoid vague phrases such as “unlock your potential” unless attached to specific evidence. Never invent facts to make copy sound finished.

Use **enroll**, **enrolled** and **enrollment** with two Ls throughout customer-facing copy and project documentation. This is Rob's preferred spelling even where other surrounding copy follows British conventions.

Avoid em dashes in all customer-facing website copy. Rewrite sentences naturally with full stops, commas, colons or separate clauses instead of mechanically substituting hyphens. Do not call the founder “Rob” or “Rob Flynn” in public website copy. Use **Mr Flynn IB**. Preserve **Robert Flynn** only where the formal published author name is appropriate, such as book metadata, the cover description and the book's author section.

Use visible breadcrumb navigation on internal pages so visitors can move through the website without relying on browser history. Breadcrumbs should begin with Home and show the current section, with a parent route where one exists, such as **Home / Courses / AA HL**.

## Current website and technology

Repository: `robbieflynn/mrflynnib-chatgpt`

Public website previously supplied by Rob: `https://mrflynnib-chatgpt.vercel.app/`

Rob currently administers the `mrflynnib.com` domain and business email, including `contact@mrflynnib.com`, through services associated with Bluehost. A public DNS check on 28 July 2026 confirmed that the authoritative nameservers are actually Cloudflare (`harlee.ns.cloudflare.com` and `gannon.ns.cloudflare.com`) and that inbound email is routed through Google (`smtp.google.com`). Treat Cloudflare as the active DNS manager and preserve the Google mail records. Bluehost may remain the registrar or billing route, but that account relationship still needs to be confirmed before cancelling or changing any service. The intended launch arrangement is for the website records to point to Vercel while the existing email-related DNS records remain intact.

The same DNS check confirmed that the root domain and `www` currently resolve to Teachable (`mrflynnib.teachable.com` / `gcp-proxy.teachable.cloud`). This matches Teachable's historical setup instructions, which direct custom-domain users to Cloudflare. Removing the custom domain inside Teachable will not automatically return DNS management to Bluehost. Keep Cloudflare as the DNS manager unless a separate, carefully planned DNS migration is genuinely needed. For launch, first establish a Teachable course subdomain such as `learn.mrflynnib.com`, then point the root and `www` website records to Vercel while preserving Google mail and MailerLite authentication records.

The project is a Next.js App Router website using React, TypeScript, Tailwind CSS, and Vercel. Supabase is prepared for enquiry storage where needed. Stripe should be used only if the main website later needs to process payments directly. Teachable remains the course platform.

The repository currently contains:

- a premium platform-style homepage
- course catalogue and individual AA/AI, HL/SL pages
- Teachable enrollment and login foundations
- verified free video, syllabus-checklist and question-bank routes
- tutoring page and application form
- school licence page and enquiry form
- book, About, Results, Contact, and FAQ pages
- privacy, terms, and cookie foundations
- Supabase-ready enquiry handling and schema
- metadata, sitemap, robots, Open Graph, analytics hooks, and security headers
- responsive components and supplied brand imagery

The agreed legal-page approach is intentionally minimal. The public website has one concise Privacy Policy and one concise Terms of Use page. Cookie and analytics information is folded into the Privacy Policy, and the old `/cookies` route redirects to that section. Both pages identify Robert Flynn as the individual operating Mr Flynn IB but do not state his location. Course payment and checkout details remain governed by the information and applicable terms shown through Teachable. The current website terms cover personal use, intellectual property, educational limitations, school and tutoring enquiries, availability, external services and contact. Do not add question-bank terms, anti-scraping clauses, a governing-law clause, or references to Dubai or the UAE until Rob chooses to address them later.

Verified Teachable course destinations are:

- AA HL: `https://mrflynnib.com/p/aa-hl`
- AA SL: `https://mrflynnib.com/p/aa-sl`
- AI HL: `https://mrflynnib.com/p/ai-hl`
- AI SL: `https://mrflynnib.com/p/ai-sl`

Rob supplied genuine testimonials from 18 named students across Hong Kong, Italy, the UK, India, Canada, Poland, Sweden, Tunisia, Spain, Greece, Denmark, South Korea, Portugal, Saudi Arabia, the UAE, and Egypt, and explicitly approved using their first names and locations. Preserve their meaning and make only light spelling or punctuation corrections. The strongest verified outcome currently supplied is Abdulaziz's report of moving from a 4 to a 7 in his first-semester exams; present it as that student's statement, not as a guaranteed result.

Rob also supplied full course curriculum spreadsheets for AA HL, AA SL, AI HL, and AI SL. These have been converted into structured project data while leaving the original workbooks unchanged. Launch information still requiring confirmation includes final school licence operational terms, production analytics configuration, completed legal review, and the Teachable setup for the three confirmed individual-course access plans.

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

The temporary banner workflow test succeeded and has been superseded by the first complete content-led website redesign on branch `agent/homepage-redesign`. Draft pull request #2 is the active review: `https://github.com/robbieflynn/mrflynnib-chatgpt/pull/2`. Its Vercel preview is `https://mrflynnib-chatgpt-git-agent-homepage-redesign-mr-flynn-ib.vercel.app`.

The preview includes the redesigned homepage and complete course, IA, school, book, tutoring, testimonial, navigation, metadata, and legal-draft journeys. The question-bank route is being upgraded from its placeholder into a usable native bank based on Rob's supplied 53-question collection. Lint passes with one pre-existing PostCSS warning and no errors; the Next.js production build passes and generates all 30 routes. The deployed Vercel preview has also been opened and rendered successfully. It must not be merged or published to production until Rob approves it.

The local repository also contains untracked generated dependency/build items from verification (`node_modules/`, `.next/`, `.pnpm-store/`, `pnpm-lock.yaml`, and `pnpm-workspace.yaml`). These are not part of the website commit and must not be added to a pull request without an intentional dependency-management decision.

## Immediate next steps

1. Rob reviews the Vercel preview on desktop and mobile and identifies any copy, layout, pricing, or journey changes.
2. Codex iterates on the same branch and preview until Rob approves the finished website.
3. Confirm school licence operations, production analytics and final legal copy before production launch.
4. Merge and publish only after Rob explicitly approves it.
