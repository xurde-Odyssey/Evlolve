# Evolve Repository Instructions

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
