# LIWU Design System · MASTER

> Project-specific adaptation of UI/UX Pro Max. This document is the visual and interaction source of truth for LIWU.
> Upstream reference: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill (MIT)
> Adaptation date: 2026-11-23

## 1. Product definition

LIWU is a private, mobile-first space for one person and her AI companion. It is not a social network, public character directory, dating-game interface, marketing landing page, or 3D room.

Primary product surfaces:
- Conversation: the main, always-available working surface.
- Personal rooms: diary, album, memory, settings, and future tools.
- Navigation: a clear side drawer with visible entries; no bottom tab bar.

The interface should feel calm, intimate, capable, and dependable. Use monochrome surfaces with quiet blue-grey accents. Content and daily use take priority over decoration.

## 2. Chosen design direction

Use a deliberate combination of three upstream design ideas, each with a separate job:

1. **Apple Native Experience** for interaction grammar: semantic controls, predictable navigation, adaptive surfaces, system typography, safe areas, and restrained transitions.
2. **AI-Native UI** for conversation: minimal chrome, readable message flow, clear streaming/loading/stopped/error states, and a composer that remains reachable.
3. **Soft UI Evolution** for visual finish: subtle surface separation, soft but legible shadows, measured radii, and restrained depth.

Do not combine every visual effect from these styles. Apple-like clarity is the foundation; the soft treatment is a finish, not the structure.

## 3. Visual tokens

Paper is the default and primary theme: a cool near-white canvas (#F7F8FA), white elevated surfaces, soft cool-grey separators, and restrained blue-grey details. Night is optional. Do not use cream, brown, purple-dominant gradients, or generic SaaS indigo.

### Color roles

| Token | Value | Use |
|---|---|---|
| Background | #F7F8FA | Main light canvas |
| Background elevated | #FFFFFF | Sheets, panels, composer |
| Background muted | #EEF1F5 | Pressed/quiet surfaces |
| Primary text | #252B34 | Main text and primary actions |
| Secondary text | #657181 | Supporting text |
| Tertiary text | #8C97A5 | Metadata only, never essential instructions |
| Separator | rgba(35,47,63,.10) | Dividers and subtle outlines |
| Accent | #7B8FA8 | Restrained blue-grey emphasis and selected states |
| Shadow | rgba(24,37,54,.07) | Low-elevation separation |

Night theme: background #111419, elevated #191E25, muted #242B34, primary text #F1F3F6, secondary #B1BAC5, tertiary #85909D, accent #91A4BC. Preserve the same semantic roles and test contrast independently.

### Typography

- UI and long-form body: system sans stack, prioritizing the device's native Chinese sans font.
- Brand/room titles and occasional expressive headings: existing Noto Serif SC.
- Numeric/date accent: existing Cormorant Garamond only where it improves hierarchy.
- Body text target: 15–16px with comfortable line-height (1.55–1.8).
- Secondary labels: 12px minimum where practical. Smaller metadata must never carry essential meaning.
- Avoid using letter spacing on ordinary Chinese body text.

### Shape, spacing, depth

- Use a 4px spacing base; common steps: 4, 8, 12, 16, 20, 24, 32.
- Controls: 10–14px radius. Larger sheets/panels: 14–18px.
- Borders are thin and low-contrast; use them to define structure, not decorate every element.
- Shadows are soft and sparse. Avoid stacked neumorphic shadows.
- Glass is reserved for small overlays or navigation surfaces when it improves separation. Never put heavy blur over the whole page.
- Do not use large gradient blobs, neon glows, ornamental noise, or decorative scanlines.

## 4. Layout and navigation

- Mobile-first; verify at 360–390px widths before wider screens.
- Respect `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`.
- Keep the conversation composer anchored to the bottom safe area. The message list owns the remaining height and must scroll independently.
- The side drawer remains the primary navigation. Keep feature entries visible and expanded; do not replace it with a bottom bar.
- A room opens as a distinct full-screen view with a clear back action. Avoid nested panels that make navigation ambiguous.
- No magazine/editorial grid, dashboard bento wall, or decorative phone mockup shell.
- No 3D scene or WebGL dependency in the active interface unless the user explicitly asks to revisit 3D.

## 5. Interaction rules

- Minimum interactive target: 44×44 CSS px as a baseline; expand small visual icons with hit areas.
- Keep at least 8px between unrelated touch targets.
- Every icon-only control needs an accessible name.
- Provide visible keyboard focus and clear pressed, disabled, loading, success, and error states.
- Press feedback may change color, opacity, or elevation; do not shift surrounding layout.
- Typical transitions: 160–240ms ease-out. Use longer motion only when it explains spatial navigation.
- Respect `prefers-reduced-motion`.
- Never rely on hover to expose a required action.
- Forms need persistent labels, inline validation, and helpful error text.
- Avoid placeholder-only labels and tiny low-contrast helper text.

## 6. Conversation-specific rules

- Keep the message stream readable and visually quiet.
- Distinguish user and companion messages through alignment and restrained surface treatment, not oversized bubbles.
- Keep timestamps and reasoning secondary; reasoning must be collapsible and must not dominate the message.
- Streaming must update in place without jumping the page or losing the user's scroll position.
- The composer stays reachable above the system gesture area and must not cover the final message.
- Stop, send, attachment, and file actions need clear feedback and adequate hit areas.

## 7. Preservation and scope guardrails

These are hard constraints, not aesthetic suggestions:

- Do not remove existing features, navigation entries, settings, import/export paths, or data fields as part of a visual redesign.
- Do not rewrite user-facing copy unless asked.
- Do not clear, migrate, rename, or overwrite localStorage/IndexedDB keys without explicit approval and a migration plan.
- Do not replace a working interaction with a static mockup.
- Do not add dependencies for decorative effects when CSS or native browser behavior is sufficient.
- Before changing a shared component, inspect all pages that use it.
- Make small, verifiable changes. Keep the app runnable after each commit.

## 8. Quality gate before delivery

- [ ] Existing features and navigation entries remain present.
- [ ] No horizontal overflow at 360px, 375px, and 390px.
- [ ] Header, drawer, full-screen views, and composer respect safe areas.
- [ ] No content is hidden behind fixed elements or the keyboard.
- [ ] Main text contrast is at least 4.5:1 against its surface.
- [ ] Touch targets meet the 44px baseline.
- [ ] Keyboard focus is visible; controls have semantic labels.
- [ ] Reduced-motion preference is respected.
- [ ] Light and night themes are both checked.
- [ ] Existing local data keys and import/export behavior are untouched.
- [ ] No console errors or broken navigation after the change.

## 9. How to use this system

For every UI task:
1. Read this MASTER first.
2. Inspect the current page and its existing behavior before editing.
3. Identify the smallest component/page scope that solves the request.
4. Preserve existing features and data contracts.
5. Implement, then run the quality gate above.
6. Report exactly what changed and what was not tested.

Page-specific exceptions belong in `design-system/liwu/pages/<page-name>.md`. They may refine this system but may not silently override preservation constraints.
