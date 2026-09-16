# Workspace visual foundation

This document defines the shared visual and interaction standards for internal tools. Reuse the tokens, components and patterns below to keep tools consistent and accessible.

Reuse these conventions and the shared components when building or changing a tool. A common foundation does not require every tool to have the same layout or workflow. Tool-specific fields, table columns, status meanings, permissions and business actions belong to the tool's implementation, tests and existing functional documentation—not to this shared design guide. See [architecture](docs/architecture.md) for extension paths and [tool standards](docs/internal-tools-standards.md) for delivery requirements.

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

Use semantic tokens rather than adding tool-specific palettes. Sidebar and header share white surfaces and neutral borders. Active and hovered navigation links use the muted surface; keyboard focus remains independently visible. Informational accents use primary text with a quiet primary-tinted background. Success, warning and error states use the shared status/feedback components. Always pair status color with words.

## Type, spacing and shape

- **Font:** locally bundled Geist Variable, system sans-serif fallback; weights 400, 500 and 600. No network font service. The SIL Open Font License is in `licenses/geist-OFL.txt`.
- **Hierarchy:** page title 28/36px, section/card title 14–16px semibold, panel title 18px, body 14px with 21–24px line height, metadata 11–12px. Reserve uppercase tracking for small section labels.
- **Spacing:** a 4px scale. Typical gaps are 8/12/16px, card padding 20px, panel padding 24px, section separation 32px, and desktop main padding 40px (32px on tablets, 20px on phones).
- **Shape:** 1px borders; 6px status corners, 8px controls, 12px cards. Shadows are limited to overlays.
- **Density:** prefer compact, readable controls without decorative empty space. Shared inputs are 44px high with 16px text; adjacent actions should align with their fields. Choose table row heights and field widths for the content rather than copying another tool's measurements.

## Shared shell and navigation

- Reuse `WorkspaceShell` in the authenticated layout. It supplies persistent navigation, the header, responsive content space and account controls; individual tools should not duplicate them.
- Navigation and the tool catalog consume `lib/tool-registry.ts`. Keep destinations, availability and labels consistent across both surfaces. Registry access labels are descriptive metadata, not permission enforcement.
- Use Next.js links for available destinations and `aria-current="page"` for the selected route. Preview-only entries remain clearly explained and non-navigable; do not imply that an unimplemented tool is functional.
- Preserve the sidebar's expanded, collapsed and mobile modes. Icon-only controls retain accessible names. Account identity and sign-out remain available through the shared footer.
- Align page headings, search and main content to the same left edge. Avoid repeated headings or explanatory text that does not help the current task.
- Let cards and controls wrap on narrow screens. Use `min-width: 0` where needed and contain table overflow within its own viewport rather than widening the page.

## Shared components

Actual [Be UI](https://beui.dev) registry source lives in `components/motion`; required helpers live in `lib`. Shared compositions in `components/shared` provide:

| Pattern | Implementation |
| --- | --- |
| Navigation | Be UI animated sidebar, composed by the shared shell |
| Queue / table | `QueueTable`, wrapping Be UI's typed, virtualized table |
| Detail panel | `DetailPanel`, wrapping Be UI drawer with focus-trap-react |
| Input | Be UI `Input`, with labels, icons and validation states |
| Status | `StatusBadge`, wrapping Be UI animated badge |
| Action feedback | `ActionButton`, wrapping Be UI stateful button; `Feedback` for accessible inline messages |
| Page heading | Title-only `PageHeader`, with optional functional children |

Inspect existing component contracts before extending them. Keep generic presentation in shared components and business-specific composition within each tool. Preserve layer isolation so badges and decorative elements do not paint over sticky headers or overlays.

## Interaction patterns

- **Headings:** use a clear page title and place functional actions nearby. Put workflow guidance, permission indicators and error messages where they are relevant rather than adding redundant page subtitles.
- **Forms:** use labeled native controls and existing card, border and focus tokens. Match control heights within a row, distinguish placeholders from selected values, and preserve keyboard behavior. Decorative select chevrons must have comfortable internal spacing and must not intercept pointer input.
- **Actions:** visually distinguish the primary task from secondary actions such as refresh. Require an explicit choice for consequential decisions and show relevant finality warnings at the point of action. Explanatory copy must describe the tool's actual behavior.
- **Tables:** retain table semantics and an explicit keyboard-accessible action for opening a record. If row clicks activate that action, preserve text selection and nested controls. Choose columns, proportions and minimum widths for each tool's data.
- **Detail panels:** retain list context where useful, keep record identity and close controls visible, and use one scrolling content region. Fit the panel to the viewport, keep the backdrop subdued and restore focus on dismissal. Field grouping and available actions depend on the tool.
- **Help:** use concise contextual guidance. Secondary explanations may use a tooltip that works with hover and keyboard focus, can be dismissed with Escape and does not shift the layout. Essential warnings must not depend on discovering a tooltip.
- **Feedback:** distinguish loading, empty, read-only, validation, request-error and success states. Keep input usable after validation failures, prevent duplicate submissions while busy, offer safe retry where supported and announce only confirmed success. These conventions do not replace server validation or authorization.

## Accessibility and motion

- Provide a skip link, landmarks, headings, input labels and visible text for every status. Decorative icons are hidden from assistive technology.
- Interactive elements show a 2px blue focus outline with 3px offset. Disabled previews remain explained in navigation and catalog surfaces.
- Preserve accessible labels when a visible label would be redundant, and use status/alert semantics for result announcements and feedback.
- Sidebar navigation and controls work by keyboard. Detail panels trap focus, close with Escape or a close control and return focus to the trigger.
- Use Be UI's `useReducedMotion()` behavior. Reduced motion removes positional transitions in overlays; brief opacity fades may remain. CSS disables decorative animation and transitions under `prefers-reduced-motion: reduce`.
- New motion should use opacity or transforms. Do not introduce spring movement in the reduced-motion path.

## Attribution

Be UI source remains attributed and unmodified; its MIT license (Copyright 2026 Saurabh Chauhan) is retained in `licenses/beui-MIT.txt`. See `README.md` for registry provenance, dependencies and the narrow upstream lint compatibility exceptions. Geist retains its OFL notice.
