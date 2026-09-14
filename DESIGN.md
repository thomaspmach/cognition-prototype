# Workspace visual foundation

This operational workspace adapts the [Vercel design analysis](https://github.com/voltagent/awesome-design-md/tree/main/design-md/vercel): precise type, quiet surfaces, hairline boundaries and disciplined spacing. It uses a graphite sidebar and restrained indigo actions. There are no marketing heroes, decorative gradients, oversized display headings or copied brand assets.

## Tokens

The implemented source of truth is `app/globals.css`. Tailwind's semantic colors map to these CSS variables:

| Use | Token | Value |
| --- | --- | --- |
| Content canvas | `background` | `#f7f8fa` |
| Main text | `foreground` | `#20232b` |
| Cards / header | `card` | `#ffffff` |
| Quiet surface | `muted` | `#f0f1f4` |
| Secondary text | `muted-foreground` | `#626977` |
| Borders | `border` | `#e1e4ea` |
| Primary action | `primary` / `primary-foreground` | `#4f46e5` / `#ffffff` |
| Focus outline | `ring` | `#6366f1` |
| Destructive text | `destructive` | `#b42338` |
| Sidebar surface / text | `sidebar` / `sidebar-foreground` | `#20232b` / `#f4f5f8` |
| Sidebar secondary text / border | `sidebar-muted` / `sidebar-border` | `#afb5c3` / `#373c48` |

The sidebar scopes Be UI's surface tokens to graphite, with `muted: #2e3340` and `primary: #c7c9ff`; its active inset marker and focus ring use `#a5a8ff`. Use semantic tokens for core surfaces. Status messages use restrained Tailwind indigo, emerald and rose backgrounds with dark text. Always pair status color with words.

## Type, spacing and shape

- **Font:** locally bundled Geist Variable, system sans-serif fallback; weights 400, 500 and 600. No network font service. The SIL Open Font License is in `licenses/geist-OFL.txt`.
- **Hierarchy:** page title 28/36px, section/card title 14–16px semibold, panel title 18px, body 14px with 21–24px line height, metadata 11–12px. Reserve uppercase tracking for small section labels.
- **Spacing:** a 4px scale. Typical gaps are 8/12/16px, card padding 20px, panel padding 24px, section separation 32px, and desktop main padding 40px (32px on tablets, 20px on phones).
- **Shape:** 1px borders; 6px status corners, 8px controls, 12px cards. Shadows are limited to modal separation and the active navigation marker.
- **Density:** 48px table rows, 36–40px action controls, minimum 44px navigation rows. Avoid decorative empty space within controls.

## Shell and navigation

`WorkspaceShell` lives in the root layout and survives client navigation. The Be UI sidebar is 264px wide, collapsible to a 68px icon rail, and becomes an 18rem modal drawer (capped at 88vw) below 768px. The sidebar's own scope supplies its foreground and mobile width, including when portaled outside the provider. Content has `min-width: 0`; table overflow scrolls inside its own viewport. Cards move from three columns at 1280px to two on tablets and one on phones.

Both navigation and catalog consume `lib/tool-registry.ts`. Active destinations have a light inset marker, tinted surface and `aria-current="page"`. Next.js links retain sidebar state when switching destinations. Icon-only links retain accessible names and hover titles.

KYC is labeled **UI foundation** until its functional workflow is implemented. Refunds and Feature Flags are **Preview only**: disabled sidebar buttons, no catalog link and no route. Each preview explains that it is not implemented. Planned access labels are metadata, not authorization.

## Shared components

Actual [Be UI](https://beui.dev) registry source lives in `components/motion`; required helpers live in `lib`. Shared compositions in `components/shared` provide:

| Pattern | Implementation |
| --- | --- |
| Navigation | Be UI animated sidebar, with Next.js links in its menu |
| Queue | `QueueTable`, wrapping Be UI's typed, virtualized table |
| Detail | `DetailPanel`, wrapping Be UI drawer with focus-trap-react |
| Input | Be UI `Input`, used for real catalog search |
| Status | `StatusBadge`, wrapping Be UI animated badge |
| Action feedback | `ActionButton`, wrapping Be UI stateful button; `Feedback` for accessible inline messages |
| Page heading | `PageHeader`, shared by Overview and KYC |

The KYC foundation uses an empty queue and an explicitly labeled, read-only detail example. There are no case records, assignment controls, simulated decisions or fake mutations. Future actions may use idle/loading/success/error states without inventing a second button system.

## Accessibility and motion

- Provide a skip link, landmarks, headings, input labels and visible text for every status. Decorative icons are hidden from assistive technology.
- Interactive elements show a 2px indigo focus outline with 3px offset. Disabled previews remain explained in both surfaces.
- Sidebar toggle and links work by keyboard. Detail panels trap focus, close with Escape or a close control and return focus to the trigger.
- Use Be UI's `useReducedMotion()` behavior. Reduced motion removes positional transitions in overlays; brief opacity fades may remain. CSS disables decorative animation and transitions under `prefers-reduced-motion: reduce`.
- New motion should use opacity or transforms. Do not introduce spring movement in the reduced-motion path.

## Attribution

Be UI source remains attributed and unmodified; its MIT license (Copyright 2026 Saurabh Chauhan) is retained in `licenses/beui-MIT.txt`. See `README.md` for registry provenance, dependencies and the narrow upstream lint compatibility exceptions. Geist retains its OFL notice. The linked Vercel analysis is inspiration only; project values and composition are original.
