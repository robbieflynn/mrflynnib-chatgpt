# Mr Flynn IB website: first production build

A complete Next.js website for **MrFlynnIB.com**, now preparing the native course, account and Ziina checkout journey while preserving Teachable during the controlled transition.

## Included

- Responsive homepage with four commercial routes: courses, tutoring, school licences and book
- AA HL, AA SL, AI HL and AI SL course catalogue and dynamic course pages
- Existing Teachable access preserved during the native-platform transition
- Free IA videos, direct syllabus-checklist downloads and native question bank
- Student accounts with synced question progress and editable whiteboard working
- Ziina-hosted course checkout with signed webhook verification and account entitlements
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
8. Run the Ziina checkout migration, add the Ziina variables below, and complete the test-payment checklist before enabling live payments.

## Ziina course checkout

The website creates payment intents on the server and redirects customers to Ziina's hosted checkout. Ziina confirms the final status through an HMAC-signed webhook; the success redirect alone never grants course access.

1. Run `supabase/migrations/20261017_ziina_checkout.sql` in Supabase.
2. Add `ZIINA_ACCESS_TOKEN` and a long random `ZIINA_WEBHOOK_SECRET` to Vercel Preview only.
3. Keep `ZIINA_TEST_MODE=true`. Set `ZIINA_ALLOW_TEST_ENTITLEMENTS=true` only while checking that a completed test payment grants the expected course and expiry date.
4. Register `https://<preview-domain>/api/webhooks/ziina` in Ziina with exactly the same webhook secret.
5. Test all three access periods, cancellation and failure handling, duplicate webhook delivery, account ownership and expiry dates.
6. Confirm a small real payment, entitlement and Ziina payout before setting `ZIINA_TEST_MODE=false` in Production.

Never expose the Ziina access token or webhook secret in browser code, chat, Git or a `NEXT_PUBLIC_` variable.

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

The public website owns brand, positioning, SEO, audience journeys and the native account experience. Ziina provides hosted payment checkout; Supabase stores authenticated course entitlements, question progress and saved work. Teachable remains available during the controlled migration and must not be removed until the native platform passes final review. The website serves checklist PDFs directly, and Resend sends transactional school-enquiry notifications.

## Image update

The project now includes Rob Flynn's supplied portrait, the Mr Flynn IB brand mark and lockup, and the Dubai mathematics graphic. The brand mark is also used as the browser and Apple touch icon. Images are stored in `public/images` and rendered with Next.js Image optimisation.
