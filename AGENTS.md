<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Evolve Project Guidance

- Inspect the existing repository before changing architecture or configuration.
- Preserve working functionality and avoid unrelated modifications.
- Evolve is a premium personal-development application with subtle RPG progression, not a generic admin dashboard or neon gaming UI.
- Use Next.js App Router, React, TypeScript, Tailwind CSS, and Supabase-ready architecture.
- Prefer server components. Use `"use client"` only for required client-side behavior.
- Keep TypeScript strict. Avoid `any`, unnecessary global state, speculative abstractions, and large UI frameworks.
- Use CSS variables/design tokens from `src/app/globals.css`; do not scatter arbitrary colors through components.
- Maintain responsive behavior across mobile, tablet, desktop, and large desktop. Avoid horizontal overflow and clipped navigation.
- Keep reusable components focused and small. Add primitives only when they are clearly useful.
- Do not implement gameplay systems, authentication flows, XP algorithms, quest engines, analytics, or activity tracking until their phase.
