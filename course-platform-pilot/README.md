# Mr Flynn IB course platform pilot

This is an isolated, local-only prototype of the future student course experience. It does not change or deploy the public MrFlynnIB website.

## Included

- AA SL, AA HL, AI SL and AI HL course experiences
- All five syllabus topics for every course
- 442 verified, student-facing Bunny Stream videos across 20 organised collections
- 640 Teachable-aligned lesson placements across the four courses
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

`dist/library-data.js` is a static, non-secret snapshot of the Bunny library metadata used by the prototype. Refresh it with `generate-library-data.mjs`, passing the verified Bunny snapshot and Teachable catalogue paths. The generator includes only ready AA/AI course collections, maps the exact Teachable lesson catalogue, removes exact duplicate records, prefers combined and Teachable-edit versions, and keeps deliberately suppressed videos out of the student preview. No Bunny API key is written to the project.
