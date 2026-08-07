# MrFlynnIB Codex instructions

Read `PROJECT_CONTEXT.md` completely before planning or changing this project. Treat it as the durable source of product context. Reconcile it with the actual code and update it whenever Rob confirms a lasting business, brand, product, or workflow decision.

## How to work with Rob

- Rob is the product owner. Communicate in clear, non-technical language and lead with the outcome.
- Take ownership of design, copy, implementation, testing, and technical decisions while explaining important trade-offs plainly.
- Make sensible, reversible assumptions instead of asking unnecessary technical questions. Clearly label assumptions that affect the business or customer experience.
- Never claim to have inspected a live page unless it was genuinely opened and rendered. Distinguish clearly between reviewing source code, a local render, a screenshot, a Vercel preview, and the public website.
- For major visual changes, create or use a preview and obtain Rob's approval before publishing to production.
- Keep changes incremental. Preserve unrelated content and functionality.
- Do not invent testimonials, results, prices, availability, credentials, partnerships, course details, or links. Use clearly labelled placeholders when verified information is missing.
- Prefer one evolving product and repository over regenerated ZIP files or replacement websites.

## Git and delivery workflow

- Treat GitHub as the master copy and Vercel as the deployment platform.
- Begin feature work from the current default branch unless Rob specifies otherwise.
- Use a focused branch such as `agent/<short-description>` for changes.
- Inspect the working tree before editing and never include unrelated user files in a commit.
- Run the most relevant available checks, normally lint and a production build for website changes.
- Push the branch and open a draft pull request when authentication permits.
- Use the Vercel preview deployment for review. Do not merge or publish to production without Rob's approval.
- Report the branch, checks, pull request, and preview URL accurately. If any step is blocked, state exactly what succeeded and what remains.

## Product and engineering principles

- Build a premium, expert-led IB Mathematics platform, not a generic tutoring template.
- Keep Teachable as the course enrolment, login, and lesson-delivery layer unless a later product decision changes this.
- Use the main website for brand, discovery, SEO, free resources, audience journeys, enquiries, and conversion.
- Keep the stack maintainable and avoid unnecessary technology.
- Maintain responsive design, accessibility, performance, security, SEO, analytics foundations, useful error states, and clean reusable components.
- Optimise for students, parents, teachers, schools, and existing customers through distinct journeys rather than one generic funnel.

## Current verification commands

Use the package manager already established by the repository. The expected checks are:

```bash
npm run lint
npm run build
```

If the environment provides a different package runner or dependencies are unavailable, use an equivalent safe command and report the variation.

