# Fold Health — TOC Worklist Platform

A comprehensive healthcare operations platform for Transitional Care Organizations (TCOs), built to coordinate multi-agent patient outreach, track care management goals, monitor population health analytics, and manage AI-powered care workflows.

## Documentation

For comprehensive information about the platform's features, architecture, and API, please refer to the project's **Mintlify Docs**. All detailed technical and feature documentation has been migrated there.

## Getting Started

Make sure you have [Bun](https://bun.sh/) installed.

```bash
# Install dependencies
bun install

# Start the development server
bun run dev
```

The application will start at `http://localhost:5173`. 
The default landing page is the Population Worklist (`/#/population/worklist`), and you can use the sidebar to navigate through the rest of the platform.

## Storybook

Every reusable primitive under `src/components/` has a story. Run locally
with `bun run storybook` (port 6006) or browse the hosted library on
Chromatic:

- **Library (all branches):** https://www.chromatic.com/library?appId=6a61dbc8d0f0c8fbac7a34f1&branch=main
- **Branch preview:** https://\<branch>--6a61dbc8d0f0c8fbac7a34f1.chromatic.com — replace `<branch>` with the branch name; `main` for production, e.g. `main--6a61dbc8d0f0c8fbac7a34f1.chromatic.com`.
- **Setup wizard (one-time):** https://www.chromatic.com/setup?appId=6a61dbc8d0f0c8fbac7a34f1

Publish a new snapshot with `bunx chromatic --project-token=<token>`
(project token lives in Chromatic → Manage → Project token). Storybook
build requires esbuild ≥ 0.28 on Node 26.

## Recent Changes

- **Storybook + Chromatic** — every primitive under `src/components/`
  (Core, Forms, Overlays, Feedback, Data, Navigation, Composed, shadcn/ui)
  now has a story. Storybook is published to Chromatic — links above.
- **HCC worklist** — default assignee filter (role-scoped, "me + In
  Progress"), mandatory doc upload in Add DOS, inline Pass/Fail on chart
  upload, auto-transition of Coder/QA/Compliance status to In Progress on
  first ICD action.
- **Auth** — invited-user flow now sends a single confirmation email
  (was two) and lands the user on a "Set Password" page whose success
  drops them straight into the app.
