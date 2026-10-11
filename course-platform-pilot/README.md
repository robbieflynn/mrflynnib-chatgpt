# Mr Flynn IB course platform pilot

This is an isolated, local-only prototype of the future student course experience. It does not change or deploy the public MrFlynnIB website.

## Included

- AA SL, AA HL, AI SL and AI HL course experiences
- All five syllabus topics for every course
- 453 real Bunny Stream videos across 20 organised collections
- Shared SL-and-HL foundations plus clearly labelled HL extensions
- Real Bunny Stream playback, topic navigation and whole-course search
- Lesson completion and resume state stored only in the browser
- Course and topic progress views
- Responsive desktop and mobile layouts
- Prototype single-login screen

## Not yet production functionality

- Real authentication or password storage
- Payments and access expiry
- Secure signed Bunny playback tokens
- Persistent server-side progress
- Email or account administration

Serve the repository root locally, then open `/course-platform-pilot/dist/`.

`dist/library-data.js` is a static, non-secret snapshot of the Bunny library metadata used by the prototype. To refresh it after future uploads, copy the existing Bunny Stream API key in the Bunny dashboard and run `generate-library-data.mjs`; the key is read from the clipboard and is never written to the project.
