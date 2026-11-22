---
name: liwu-ui
description: Project-specific UI/UX skill for designing, reviewing, and implementing LIWU interfaces. Use for all LIWU visual, layout, responsive, navigation, and interaction work.
---

# LIWU UI Skill

Before making any UI change, read `design-system/liwu/MASTER.md`.

## Product and stack
LIWU is a mobile-first private AI companion web app built with plain HTML, CSS, and JavaScript. Do not assume React, Vue, Tailwind, or a component framework. Do not add a build system or dependencies for styling-only work.

## Design method
Apply the upstream UI/UX Pro Max approach in a project-specific way:
- Treat refined frosted glass as the confirmed material direction, not as a fixed page layout.
- Keep layout exploration open. Do not impose a generic card grid, dashboard, magazine page, or virtual-phone shell.
- Let each room's content and task determine its composition.
- Use Apple Native Experience for interaction grammar and AI-Native UI for chat behavior.
- Build glass with translucent layers, controlled backdrop blur, fine edges, restrained reflections, and clear text contrast.
- Mix frosted surfaces with clear surfaces. Avoid full-screen blur, stacked glass cards, decorative stripes, and excessive glow.
- Explore a light-first palette, but do not lock final colors before the user reviews them.
- Use semantic color, spacing, and material tokens instead of scattered raw values.
- Prioritize accessibility, touch interaction, responsive layout, and content clarity.

## Required workflow
1. Read the LIWU design master.
2. Inspect the current page, CSS, JavaScript event handlers, and all shared usages.
3. Identify existing features and data contracts that must remain intact.
4. When layout is undecided, prepare distinct, content-aware alternatives before implementing a global pattern.
5. Make the smallest coherent change.
6. Verify mobile widths, safe areas, scrolling, composer position, focus, contrast, and reduced motion.
7. Confirm that navigation and local data behavior still work.

## Hard prohibitions
- No feature deletion or silent content rewriting.
- No localStorage/IndexedDB key changes, data clearing, or destructive migrations without explicit approval.
- A bottom navigation bar is permitted on the homepage only; hide it on every inner room and chat screen.
- No generic bento dashboard, magazine/editorial layout, or 3D/WebGL scene unless explicitly requested.
- No heavy blanket blur, purple-dominant gradients, cream/brown palette, emoji icons, or decorative UI that harms readability.
- Never present an untested page as verified.

## Upstream attribution
Design reasoning adapted from [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill), MIT licensed. This local skill is tailored to LIWU and is not a copy of the upstream runtime or dataset.
