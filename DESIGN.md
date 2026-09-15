# Workspace visual foundation

This operational workspace adapts the [Vercel design analysis](https://github.com/voltagent/awesome-design-md/tree/main/design-md/vercel): precise type, quiet surfaces, hairline boundaries and disciplined spacing. It uses matching white sidebar and header surfaces with blue actions based on `#0054e4`. There are no marketing heroes, decorative gradients, oversized display headings or copied brand assets.

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
| Primary action | `primary` / `primary-foreground` | `#0054e4` / `#ffffff` |
| Focus outline | `ring` | `var(--primary)` → `#0054e4` |
| Destructive text | `destructive` | `#b42338` |
| Sidebar surface / text | `sidebar` / `sidebar-foreground` | `var(--card)` / `var(--foreground)` → `#ffffff` / `#20232b` |
| Sidebar secondary text / border | `sidebar-muted` / `sidebar-border` | `var(--muted-foreground)` / `var(--border)` → `#626977` / `#e1e4ea` |

The sidebar shares the header's white surface and neutral border, inheriting the workspace's text, primary and focus colors. Active and hovered navigation links use `muted: #f0f1f4` across their full height; disabled previews keep their neutral text and transparent background on hover. The selected item has no accent border or inset shadow. Text selection mixes `primary` with 90% white for its background and 40% black for its text using `color-mix(in srgb, …)`. Use semantic tokens for core surfaces. Catalog accents and informational messages use `primary` text, 5% primary backgrounds and 10–20% primary borders; success and error messages use emerald and rose backgrounds with dark text. Always pair status color with words.

## Type, spacing and shape

- **Font:** locally bundled Geist Variable, system sans-serif fallback; weights 400, 500 and 600. No network font service. The SIL Open Font License is in `licenses/geist-OFL.txt`.
- **Hierarchy:** page title 28/36px, section/card title 14–16px semibold, panel title 18px, body 14px with 21–24px line height, metadata 11–12px. Reserve uppercase tracking for small section labels.
- **Spacing:** a 4px scale. Typical gaps are 8/12/16px, card padding 20px, panel padding 24px, section separation 32px, and desktop main padding 40px (32px on tablets, 20px on phones).
- **Shape:** 1px borders; 6px status corners, 8px controls, 12px cards. Shadows are limited to overlays.
- **Density:** 48px table rows, 36–40px action controls, minimum 44px navigation rows. Avoid decorative empty space within controls.

## Shell and navigation

`WorkspaceShell` lives in the root layout and survives client navigation. The sidebar brand reads **company / tools**. The Be UI sidebar is 264px wide, collapsible to a 68px icon rail, and becomes an 18rem modal drawer (capped at 88vw) below 768px. The sidebar's own scope supplies its white background, foreground and mobile width, including when portaled outside the provider. Content has `min-width: 0`; table overflow scrolls inside its own viewport. Cards move from three columns at 1280px to two on tablets and one on phones.

Navigation content has 36px top padding below the brand. Section labels use their natural 16px line height with a 4px bottom gap. Tool subtitles use a 16px line height with no top margin beneath their titles; spacing between navigation items is unchanged. The sidebar footer displays the authenticated person's name and role on two lines with no extra margin between them; long names truncate, and an accessible label and tooltip retain the identity when collapsed. An accessible three-dot Account menu sits to the right of the name in the footer and remains available in the collapsed rail. Its native popover opens above the trigger with a Sign out menu item, avoiding sidebar clipping; keyboard focus, Escape, outside-click and resize dismissal are supported. Sign-out errors wrap below the account row and return focus to the trigger. The header contains no duplicate account controls. Semantic lists compose Be UI sidebar items with Next.js links and disabled preview buttons; hover backgrounds belong to each control and follow its content height.

Overview contains its page title, search aligned with the title's left edge and tool cards, without a repeated catalog heading, visible total-count badge or explanatory footer. The catalog retains an accessible region name and screen-reader result announcements.

Both navigation and catalog consume `lib/tool-registry.ts`. Active destinations have a neutral gray surface, dark text and `aria-current="page"`. Keyboard focus retains its blue outline independently of selection. Next.js links retain sidebar state when switching destinations. Icon-only links retain accessible names and hover titles.

KYC is labeled **Available**. The authenticated role appears in the sidebar footer, without a duplicate badge beside the page title. Refunds and Feature Flags are **Preview only**: disabled sidebar buttons, no catalog link and no route. Each preview explains that it is not implemented. Registry access labels remain metadata; server helpers enforce workspace and KYC permissions.

## Shared components

Actual [Be UI](https://beui.dev) registry source lives in `components/motion`; required helpers live in `lib`. Shared compositions in `components/shared` provide:

| Pattern | Implementation |
| --- | --- |
| Navigation | Be UI animated sidebar, with Next.js links in its menu |
| Queue | `QueueTable`, wrapping Be UI's typed, virtualized table |
| Detail | `DetailPanel`, wrapping Be UI drawer with focus-trap-react |
| Input | Be UI `Input`, used for real catalog search |
| Status | `StatusBadge`, wrapping Be UI animated badge with an isolated stacking context so icon/text layers stay below sticky table headers |
| Action feedback | `ActionButton`, wrapping Be UI stateful button; `Feedback` for accessible inline messages |
| Page heading | Title-only `PageHeader`, shared by Overview, KYC and not-found pages |

Page headings show only the title, without an eyebrow label or descriptive paragraph above or below it. `PageHeader` accepts optional functional children such as role badges or actions. The login card follows the same title-only hierarchy. Keep catalog descriptions, workflow guidance, permission indicators, demonstration notices and error feedback in their functional contexts.

Queue controls use 8px horizontal gaps and 16px between wrapped rows. Queue filter selects use decorative 16px chevrons centered vertically and inset 12px from the right edge, with 40px of right padding reserved for them. The browser arrow is hidden, but native selection and keyboard behavior remain; the icons do not intercept pointer input.

Clicking a noninteractive part of a KYC row activates its existing Case button, including blank cell space and status badges. Text selection and nested controls are left alone. Case identifiers use the normal foreground color without link underlining. Rows retain table semantics; the Case button is the keyboard entry point and receives focus for drawer return.

KYC uses the shared table for synthetic cases and the shared detail panel for customer fields, ownership, decisions and chronological history. Its columns fill the table proportionally: Case 13%, Customer 28%, Country 10%, Status 15%, Assignee 16% and Submitted 18%, retaining those shares when reordered. The table's `minColumnWidth` of 150 supplies a 900px total floor for the six percentage-width columns, so narrow viewports scroll inside the table instead of compressing the content. Actions use the shared stateful button and feedback. Native labeled selects and a textarea use the existing card, border and focus tokens. Queue search and filter labels are screen-reader-only. Loaded result counts are also screen-reader-only; loading/error status and Clear filters remain visible when applicable. Refresh queue follows the inputs in the same wrapping row, aligned to the right and matching their 44px height; the controls wrap without page overflow on narrow screens. Empty filter choices use `muted-foreground` at 60% opacity, matching the search placeholder; selected values and nonempty options use `foreground`. Labels in case-action forms remain visible. Pending is informational, Escalated is warning, Approved is success and Rejected is danger; all statuses include text. Viewer and terminal cases explain read-only access. Loading, empty, validation, denied/request-error, retry and committed-success states reflect real server requests. The login screen uses Be UI inputs and the same tokens without the protected workspace navigation.

## Accessibility and motion

- Provide a skip link, landmarks, headings, input labels and visible text for every status. Decorative icons are hidden from assistive technology.
- Interactive elements show a 2px blue focus outline with 3px offset. Disabled previews remain explained in both surfaces.
- Sidebar toggle and links work by keyboard. Detail panels trap focus, close with Escape or a close control and return focus to the trigger.
- Use Be UI's `useReducedMotion()` behavior. Reduced motion removes positional transitions in overlays; brief opacity fades may remain. CSS disables decorative animation and transitions under `prefers-reduced-motion: reduce`.
- New motion should use opacity or transforms. Do not introduce spring movement in the reduced-motion path.

## Attribution

Be UI source remains attributed and unmodified; its MIT license (Copyright 2026 Saurabh Chauhan) is retained in `licenses/beui-MIT.txt`. See `README.md` for registry provenance, dependencies and the narrow upstream lint compatibility exceptions. Geist retains its OFL notice. The linked Vercel analysis is inspiration only; project values and composition are original.
