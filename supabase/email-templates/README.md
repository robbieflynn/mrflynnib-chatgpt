# Supabase authentication email templates

The production Supabase dashboard remains the delivery source for these templates. Keep the checked-in copies here so changes can be reviewed with the website route they depend on.

## Confirm sign up

- Subject: `Confirm your Mr Flynn IB account`
- Dashboard template: `confirm-signup.html`
- Required website route: `/auth/confirm`

The template sends Supabase's hashed verification token to the website route. The route verifies the token server-side, establishes the signed-in session, and returns the user to the requested IB or IGCSE account journey.

Do not publish this dashboard template until `/auth/confirm` is available in production.
