# Mr Flynn IB website: first production build

A complete first-pass Next.js website for **MrFlynnIB.com**, positioning the business as an expert-led IB Mathematics platform while keeping Teachable as the course delivery and enrolment layer.

## Included

- Responsive homepage with four commercial routes: courses, tutoring, school licences and book
- AA HL, AA SL, AI HL and AI SL course catalogue and dynamic course pages
- Teachable enrolment links and student-login redirect
- Free IA videos, direct syllabus-checklist downloads and native question bank
- Tutoring application form
- School-licence enquiry form and proposed licence tiers
- Book, About, Results, Contact and FAQ pages
- Privacy, terms and cookie-policy foundations
- Server-side enquiry validation and optional Supabase storage
- School-enquiry notifications through the existing Google Workspace account
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
3. Configure the Google Workspace Gmail API variables described below so school enquiries generate an email notification.
4. Optionally create a Supabase project, run `supabase/schema.sql`, and add `SUPABASE_URL` plus `SUPABASE_SERVICE_ROLE_KEY` for contact and tutoring enquiries if those forms are restored later.
5. Confirm final course availability, access periods and operational terms.
6. Complete legal review and configure consent before non-essential tracking.

## Google Workspace school-enquiry setup

The school form stays on the website. After validating a submission, the server uses the Gmail API to send a notification from the existing Google Workspace mailbox to `contact@mrflynnib.com`. The notification contains the form details and sets the enquirer as the reply-to address.

1. In Google Cloud, enable the Gmail API for a project owned by the business.
2. Configure the OAuth consent screen for the Google Workspace organisation as an internal app, then create an OAuth client.
3. Authorise the `contact@mrflynnib.com` mailbox with only the `https://www.googleapis.com/auth/gmail.send` permission and obtain a refresh token.
4. Add `GOOGLE_WORKSPACE_CLIENT_ID`, `GOOGLE_WORKSPACE_CLIENT_SECRET`, `GOOGLE_WORKSPACE_REFRESH_TOKEN`, and `GOOGLE_WORKSPACE_SENDER_EMAIL` to Vercel for Preview and Production.
5. Optionally set `SCHOOL_ENQUIRY_TO_EMAIL`; it defaults to `contact@mrflynnib.com`.
6. Submit one real preview enquiry and confirm that it arrives before publishing the change.

Never commit the client secret or refresh token. Store both only as encrypted environment variables in Vercel.

## Deployment

- Push the folder to a Git repository.
- Import it into Vercel.
- Set environment variables separately for Preview and Production.
- Connect `mrflynnib.com` after the preview build and forms have been tested.
- Confirm the Teachable transition, redirects, analytics events and form retention process.

## Architecture decision

The public website owns brand, positioning, SEO, audience journeys and lead generation. Teachable owns course checkout, login and lesson delivery. The website serves the checklist PDFs directly. Google Workspace sends school-enquiry notifications. Supabase can retain other structured data where needed; it is not added as a duplicate learning platform.

## Image update

The project now includes Rob Flynn's supplied portrait, the Mr Flynn IB brand mark and lockup, and the Dubai mathematics graphic. The brand mark is also used as the browser and Apple touch icon. Images are stored in `public/images` and rendered with Next.js Image optimisation.
