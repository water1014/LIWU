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

The interface should feel calm, intimate, capable, and dependable. Content and daily use take priority over decoration.

## 2. Chosen design direction

The confirmed material direction is **refined frosted glass**. The overall page layout is intentionally undecided and must be explored before being standardized. Do not treat this material decision as approval for a particular dashboard, card grid, or navigation composition.

Use a deliberate combination of three design ideas, each with a separate job:

1. **Apple Native Experience** for interaction grammar: semantic controls, predictable navigation, adaptive surfaces, system typography, safe areas, and restrained transitions.
2. **AI-Native UI** for conversation: readable message flow, clear streaming/loading/stopped/error states, and a composer that remains reachable.
3. **Frosted Glass** for material character: translucent layered surfaces, soft background diffusion, fine edge highlights, controlled reflections, and subtle depth.

Glass should feel like a real material rather than a filter placed over the whole screen. Use it where it creates useful depth or separation, while keeping text and controls crisp. Mix glass with clear, quiet surfaces so every page does not become a stack of identical translucent cards.

Explore each room according to its content and purpose. The chat, diary, album, memory, settings, and home may use different compositions. Do not lock the layout system until the user has reviewed alternatives.

## 3. Visual tokens

A light-first direction is preferred for exploration, but the final palette is not locked. Night remains a required theme. Avoid cream, brown, purple-dominant gradients, and generic SaaS indigo. Explore cool neutral, misty blue-grey, and other restrained color relationships without assuming one is final.

### Color roles

| Token | Value | Use |
|---|---|---|
| Background | #F7F8FA | Initial cool light canvas reference |
| Background elevated | #FFFFFF | Clear elevated surfaces |
| Background muted | #EEF1F5 | Pressed/quiet surfaces |
| Primary text | #252B34 | Main text and primary actions |
| Secondary text | #657181 | Supporting text |
| Tertiary text | #8C97A5 | Metadata only, never essential instructions |
| Separator | rgba(35,47,63,.10) | Dividers and subtle outlines |
| Accent | #7B8FA8 | Initial restrained blue-grey reference |
| Shadow | rgba(24,37,54,.07) | Low-elevation separation |

These values are a starting reference, not a final palette lock. Night theme must preserve the same semantic roles and be checked independently.

### Typography

- UI and long-form body: system sans stack, prioritizing the device's native Chinese sans font.
- Brand/room titles and occasional expressive headings: existing Noto Serif SC.
- Numeric/date accent: existing Cormorant Garamond only where it improves hierarchy.
- Body text target: 15–16px with comfortable line-height (1.55–1.8).
- Secondary labels: 12px minimum where practical. Smaller metadata must never carry essential meaning.
- Avoid using letter spacing on ordinary Chinese body text.

### Shape, spacing, depth, and glass

- Use a 4px spacing base; common steps: 4, 8, 12, 16, 20, 24, 32.
- Controls: 10–14px radius. Larger surfaces may use a larger radius when the composition calls for it; do not force every component into one card shape.
- Use thin, low-contrast borders and fine inner highlights to define glass edges.
- Frosted surfaces may use translucent fills, backdrop blur, restrained saturation, and soft ambient shadows. Tune blur and opacity per surface rather than applying one global setting.
- Preserve enough contrast behind and within glass. Essential text must remain crisp and readable in both themes.
- Avoid stacked glass-on-glass panels, thick white outlines, strong reflections, excessive blur, striped textures, neon glow, ornamental noise, and decorative scanlines.
- Do not blur the entire page as a shortcut. Keep the underlying scene calm and legible; use glass as a material layer with clear hierarchy.

## 4. Layout and navigation

- Layout direction is open for exploration. Do not assume a bento dashboard, uniform card grid, magazine/editorial page, or virtual-phone shell.
- Let each room's content determine its composition. The final system may combine distinct page layouts while sharing typography, spacing, glass materials, and interaction rules.
- Mobile-first; verify at 360–390px widths before wider screens.
- Respect `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`.
- Keep the conversation composer anchored to the bottom safe area. The message list owns the remaining height and must scroll independently.
- The side drawer remains the primary navigation. Keep feature entries visible and expanded; do not replace it with a bottom bar.
- A room opens as a distinct full-screen view with a clear back action. Avoid nested panels that make navigation ambiguous.
- No decorative phone mockup shell.
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
- Glass may be used for the composer or transient controls only when it improves separation and does not reduce typing or message readability.

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
- [ ] Glass surfaces retain readable contrast in light and night themes.
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
5. Explore layout alternatives before standardizing page composition.
6. Implement, then run the quality gate above.
7. Report exactly what changed and what was not tested.

Page-specific exceptions belong in `design-system/liwu/pages/<page-name>.md`. They may refine this system but may not silently override preservation constraints.
