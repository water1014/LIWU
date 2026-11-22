# LIWU Visual Research Notes · 2026-11-23

This note records a small design-method review used for the visual-direction study. It does not lock the final layout or replace the LIWU MASTER.

## References reviewed

- Taste Skill: https://github.com/Leonxlnx/taste-skill
  - Useful method: plan the page as a complete composition before writing sections; use photography with an intentional role; establish a single typographic and spacing system; avoid generic section/card assembly; verify across viewport sizes in a real browser.
- Frontend Craft: https://github.com/nattergabriel/frontend-craft
  - Useful method: check touch target size, safe areas, contrast over images, content overflow, focus states, empty/loading/error states, reduced motion, and mobile typography.
- UI UX Pro Max: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
  - Project's existing adaptation remains in MASTER. Apply the design-system-first approach, matching style to product context rather than blindly applying trends.

## LIWU-specific interpretation

1. The home screen is a relationship portrait, not a dashboard.
2. One chosen photograph should carry the atmosphere. Do not fill the page with unrelated stock images.
3. Portraits, relationship metadata, music, one shared photo, and the chat entry should form a single visual hierarchy.
4. Glass is a selective foreground material. It must not erase the image or reduce text contrast.
5. Side navigation remains the primary navigation. No bottom tab bar.
6. Mobile composition is the source layout. Desktop may gain a persistent expanded sidebar, but must not become a different product.
7. Use real user-provided assets in the eventual product. Preview initials and sample copy are placeholders, not stored profile data.
8. Do not connect mock navigation to production features until the user approves the visual direction.

## Preview scope

visual-direction-study.html is a visual study only. It does not alter app.js, style.css, data.js, localStorage/IndexedDB, API configuration, or the production app. The preview allows selecting a local photo for the photo tile; this is in-memory only and is not uploaded or saved.
