# Mr Flynn IB website — first production build

A complete first-pass Next.js website for **MrFlynnIB.com**, positioning the business as an expert-led IB Mathematics platform while keeping Teachable as the course delivery and enrolment layer.

## Included

- Responsive homepage with four commercial routes: courses, tutoring, school licences and book
- AA HL, AA SL, AI HL and AI SL course catalogue and dynamic course pages
- Teachable enrolment links and student-login redirect
- Free-resource library and starter article templates
- Tutoring application form
- School-licence enquiry form and proposed licence tiers
- Book, About, Results, Contact and FAQ pages
- Privacy, terms and cookie-policy foundations
- Server-side enquiry validation and optional Supabase storage
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
3. Create a Supabase project and run `supabase/schema.sql`.
4. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as server-only environment variables.
5. Replace placeholder course availability, prices, access periods and curriculum details.
6. Add permission-cleared testimonials and genuine student outcomes.
7. Add Rob’s professional portrait, the real book cover and course/video imagery.
8. Complete legal review and configure consent before non-essential tracking.

## Deployment

- Push the folder to a Git repository.
- Import it into Vercel.
- Set environment variables separately for Preview and Production.
- Connect `mrflynnib.com` after the preview build and forms have been tested.
- Confirm the Teachable transition, redirects, analytics events and form retention process.

## Architecture decision

The public website owns brand, positioning, SEO, audience journeys and lead generation. Teachable owns course checkout, login and lesson delivery. Supabase is used only where the main site needs to store enquiries; it is not added as a duplicate learning platform.

## Image update

The project now includes Rob Flynn's supplied portrait, the Mr Flynn IB brand mark and lockup, and the Dubai mathematics graphic. The brand mark is also used as the browser and Apple touch icon. Images are stored in `public/images` and rendered with Next.js Image optimisation.
