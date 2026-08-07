# Mr Flynn IB website: first production build

A complete first-pass Next.js website for **MrFlynnIB.com**, positioning the business as an expert-led IB Mathematics platform while keeping Teachable as the course delivery and enrolment layer.

## Included

- Responsive homepage with four commercial routes: courses, tutoring, school licences and book
- AA HL, AA SL, AI HL and AI SL course catalogue and dynamic course pages
- Teachable enrolment links and student-login redirect
- Free IA videos, syllabus checklist and native question bank
- Tutoring application form
- School-licence enquiry form and proposed licence tiers
- Book, About, Results, Contact and FAQ pages
- Privacy, terms and cookie-policy foundations
- Server-side enquiry validation and optional Supabase storage
- School-enquiry routing and internal notifications through MailerLite
- Metadata, Open Graph image, sitemap, robots rules and security headers
- GA4 hook, enabled only when an ID is supplied
- Explicit placeholders rather than invented prices, testimonials or claims

## Run locally

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`.

## Configure before launch

1. Add the live Teachable school, login and course URLs to `.env.local`.
2. Add the live book purchase URL and YouTube channel URL.
3. Add `MAILERLITE_API_TOKEN` for checklist delivery and school-enquiry routing, plus `MAILERLITE_MARKETING_GROUP_ID` for the separate consent-only mailing-list group.
4. Optionally create a Supabase project, run `supabase/schema.sql`, and add `SUPABASE_URL` plus `SUPABASE_SERVICE_ROLE_KEY` for other enquiry types if they are restored later.
5. Confirm final course availability, access periods and operational terms.
6. Complete legal review and configure consent before non-essential tracking.

## Deployment

- Push the folder to a Git repository.
- Import it into Vercel.
- Set environment variables separately for Preview and Production.
- Connect `mrflynnib.com` after the preview build and forms have been tested.
- Confirm the Teachable transition, redirects, analytics events and form retention process.

## Architecture decision

The public website owns brand, positioning, SEO, audience journeys and lead generation. Teachable owns course checkout, login and lesson delivery. MailerLite handles checklist delivery, mailing-list groups and school-enquiry notifications. Supabase can retain other structured data where needed; it is not added as a duplicate learning platform.

## Image update

The project now includes Rob Flynn's supplied portrait, the Mr Flynn IB brand mark and lockup, and the Dubai mathematics graphic. The brand mark is also used as the browser and Apple touch icon. Images are stored in `public/images` and rendered with Next.js Image optimisation.
