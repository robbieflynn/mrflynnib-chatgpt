# Mr Flynn IB website: first production build

A complete first-pass Next.js website for **MrFlynnIB.com**, positioning the business as an expert-led IB Mathematics platform while keeping Teachable as the course delivery and enrolment layer.

## Included

- Responsive homepage with four commercial routes: courses, tutoring, school licences and book
- AA HL, AA SL, AI HL and AI SL course catalogue and dynamic course pages
- Teachable enrolment links and student-login redirect
- Free IA videos, direct syllabus-checklist downloads and native question bank
- Student accounts with synced question progress and editable whiteboard working
- Tutoring application form
- School-licence enquiry form and proposed licence tiers
- Book, About, Results, Contact and FAQ pages
- Privacy, terms and cookie-policy foundations
- Server-side enquiry validation and optional Supabase storage
- Transactional school-enquiry notifications through Resend
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
3. Configure the Resend variable described below so school enquiries generate an email notification.
4. Create a Supabase project, run `supabase/schema.sql`, and add `NEXT_PUBLIC_SUPABASE_URL` plus `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for student accounts. Add the site and callback URLs in Supabase Auth settings.
5. Optionally add `SUPABASE_URL` plus `SUPABASE_SERVICE_ROLE_KEY` for contact and tutoring enquiry storage if those forms are restored later.
6. Confirm final course availability, access periods and operational terms.
7. Complete legal review and configure consent before non-essential tracking.

## Resend school-enquiry setup

The school form stays on the website. After validating a submission, the server uses Resend to send a transactional notification to `contact@mrflynnib.com`. The notification contains the form details and sets the enquirer as the reply-to address. It does not create a subscriber or add the sender to a marketing list.

1. Verify `mrflynnib.com` in Resend without changing the existing Google Workspace mail-delivery records.
2. Create a sending-only API key restricted to `mrflynnib.com`.
3. Add `RESEND_API_KEY` to Vercel for Preview and Production.
4. Optionally set `SCHOOL_ENQUIRY_FROM_EMAIL`; it defaults to `Mr Flynn IB Website <website@mrflynnib.com>`.
5. Optionally set `SCHOOL_ENQUIRY_TO_EMAIL`; it defaults to `contact@mrflynnib.com`.
6. Redeploy, submit one real preview enquiry and confirm that it arrives before publishing the change.

Never commit the API key. Store it only as an encrypted environment variable in Vercel.

## Deployment

- Push the folder to a Git repository.
- Import it into Vercel.
- Set environment variables separately for Preview and Production.
- Connect `mrflynnib.com` after the preview build and forms have been tested.
- Confirm the Teachable transition, redirects, analytics events and form retention process.

## Architecture decision

The public website owns brand, positioning, SEO, audience journeys, question-bank accounts and saved practice data. Teachable owns course checkout, login and lesson delivery. The website serves the checklist PDFs directly. Resend sends transactional school-enquiry notifications. Supabase provides secure student authentication, question progress and whiteboard storage; it is not a duplicate course platform.

## Image update

The project now includes Rob Flynn's supplied portrait, the Mr Flynn IB brand mark and lockup, and the Dubai mathematics graphic. The brand mark is also used as the browser and Apple touch icon. Images are stored in `public/images` and rendered with Next.js Image optimisation.
