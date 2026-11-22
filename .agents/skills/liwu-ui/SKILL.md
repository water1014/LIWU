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
- Choose a coherent design direction before styling.
- Use semantic color and spacing tokens instead of scattered raw values.
- Prioritize accessibility, touch interaction, responsive layout, and content clarity.
- Use Apple Native Experience for interaction grammar, AI-Native UI for chat behavior, and Soft UI Evolution only for subtle visual finish.
- Keep LIWU's cool blue-white palette and restrained lilac accent.

## Required workflow
1. Inspect the current page, CSS, JavaScript event handlers, and all shared usages.
2. Identify existing features and data contracts that must remain intact.
3. Make the smallest coherent change.
4. Verify mobile widths, safe areas, scrolling, composer position, focus, contrast, and reduced motion.
5. Confirm that navigation and local data behavior still work.

## Hard prohibitions
- No feature deletion or silent content rewriting.
- No localStorage/IndexedDB key changes, data clearing, or destructive migrations without explicit approval.
- No bottom navigation bar.
- No magazine/editorial layout, generic bento dashboard, or 3D/WebGL scene unless explicitly requested.
- No heavy full-screen blur, purple-dominant gradients, cream/brown palette, emoji icons, or decorative UI that harms readability.
- Never present an untested page as verified.

## Upstream attribution
Design reasoning adapted from [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill), MIT licensed. This local skill is tailored to LIWU and is not a copy of the upstream runtime or dataset.
