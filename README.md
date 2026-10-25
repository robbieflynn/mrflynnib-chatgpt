# Mr Flynn IB website: first production build

A connected Next.js learning platform for **MrFlynnIB.com**, combining the public website, native Bunny-hosted courses, question banks, assignments, progress and access management under one account experience.

## Included

- Responsive homepage with four commercial routes: courses, tutoring, school licences and book
- AA HL, AA SL, AI HL and AI SL course catalogue and dynamic course pages
- Native course lessons and past-paper solutions, with Teachable retained as a transition route for existing customers
- Free IA videos, direct syllabus-checklist downloads and native question bank
- Student accounts with synced question progress and editable whiteboard working
- Stripe-ready checkout with webhook-based course fulfilment
- Existing Teachable customer access-transfer requests
- Lightweight school licences and student seat allocation
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

1. Keep the live Teachable URLs configured while existing customers are moved across.
2. Add the live book purchase URL and YouTube channel URL.
3. Configure the Resend variable described below so school enquiries generate an email notification.
4. Create a Supabase project, run `supabase/schema.sql`, and add `NEXT_PUBLIC_SUPABASE_URL` plus `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for student accounts. Add the site and callback URLs in Supabase Auth settings.
5. Optionally add `SUPABASE_URL` plus `SUPABASE_SERVICE_ROLE_KEY` for contact and tutoring enquiry storage if those forms are restored later.
6. Apply the latest Supabase migrations, configure Bunny token authentication, create the five Stripe Price records, add their IDs and register `/api/stripe/webhook` for `checkout.session.completed`.
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

## Native platform setup

Run `npm run build:course-platform` whenever the reviewed course catalogue changes. This regenerates the server video-access map and publishes only the student-facing course files to `public/learn`.

Stripe course access is granted only by the signed webhook after a completed paid Checkout Session. The success page never grants access. Bunny video URLs are issued by the server after it checks the signed-in user’s entitlement or free-sample eligibility. Course progress is saved in Supabase and retained locally during interruptions.

## Architecture decision

MrFlynnIB.com owns the complete customer and learning journey: brand, discovery, one account, native courses, question banks, assignments, progress and access management. Bunny Stream provides video delivery, Stripe provides checkout, Supabase provides authentication and saved platform data, and Resend provides transactional email. Teachable remains available during the customer transition but is no longer the intended long-term learning platform.

## Image update

The project now includes Rob Flynn's supplied portrait, the Mr Flynn IB brand mark and lockup, and the Dubai mathematics graphic. The brand mark is also used as the browser and Apple touch icon. Images are stored in `public/images` and rendered with Next.js Image optimisation.
