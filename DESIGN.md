# ASTD Value List — Product Design System & Implementation Plan

> **Document status:** Proposed design specification  
> **Project:** ASTD Value List  
> **Design direction:** ASTD Exchange — a community trading platform with the precision of a market tool and the character of a game collection  
> **Scope:** Visual identity, UX consistency, responsive behavior, and frontend presentation  
> **Non-goal:** Replacing the application architecture, redesigning business logic, or changing the product into a different kind of service

---

## 0. How to use this document

This is the implementation source of truth for the visual and UX refinement work described here. Treat it as a design contract, not as permission to rewrite the application wholesale.

### Rules for implementation

1. **Inspect before editing.** Read the current implementation of each target component and its direct dependencies before changing it. The supplied Gitingest export is a project snapshot, not a substitute for checking the current working tree.
2. **Verify file presence.** Some page entry points imported by `App.tsx` were not present in the supplied directory listing. Confirm whether those files exist in the current repository before planning edits to them.
3. **Preserve behavior.** Do not change Supabase queries, Zustand state transitions, trade calculations, authentication rules, URL synchronization, virtualization, inventory mutations, ad interactions, or routing as part of a visual task unless a documented UX defect cannot be corrected otherwise.
4. **Prefer shared tokens.** Use the existing CSS custom-property architecture. Do not introduce a second styling system or a new component library.
5. **Make one coherent change at a time.** Work through the phases in order. Keep each implementation slice small enough to review and revert independently.
6. **Verify every state.** Check default, hover, active, focus, disabled, loading, empty, error, selected, and long-content states where relevant.
7. **Do not invent UI.** Only display metrics, data, actions, badges, and states that the current product actually supports.
8. **Do not claim testing that did not happen.** Record commands run, browser coverage, and known gaps accurately.

### Definition of a successful redesign

The result should still be recognizably ASTD Value List, but should feel like one deliberately art-directed product. Users should be able to scan unit values quickly, understand trade outcomes, manage a collection, and participate in the community without having to decode inconsistent visual patterns.

---

# 1. Product identity

## 1.1 Product positioning

ASTD Value List is a Roblox All Star Tower Defense trading and community platform. Its core product value is the combination of:

- A public unit value and tier reference.
- A trade evaluation tool.
- Community trade listings and interactions.
- A personal inventory and collection manager.
- Profiles, reputation/history, and trading education.

The interface must support both **fast market scanning** and **collector attachment to game units**. Neither should overpower the other.

## 1.2 Chosen design direction: ASTD Exchange

ASTD Exchange is the internal name for this design direction. It is **not** a proposed product rename.

The core idea is:

> A trading exchange with the character of a game collection and the precision of a market tool.

The product should feel:

- **Confident:** important values, trade totals, and actions are easy to find.
- **Tactile:** surfaces, dividers, and occasional metallic details feel intentional rather than sterile.
- **Game-native:** original unit artwork, tier identity, and rarity remain central to the experience.
- **Community-aware:** trader identities and listings feel human, not like anonymous ecommerce inventory.
- **Disciplined:** color, typography, borders, badges, and motion each have defined jobs.

It should not feel like a generic finance terminal, a Discord clone, a fantasy role-playing game UI, or an AI-generated SaaS dashboard.

## 1.3 Visual signature

Use a small set of recurring motifs to make the platform recognizable:

1. **Machined tier framing:** retain and refine the existing metallic U-frame tier banner. It is a product-specific visual asset; do not replace it with a generic gradient heading.
2. **Market notation:** use precise numeric alignment, clear value deltas, compact metadata, and restrained directional indicators.
3. **Collection framing:** let real unit artwork provide most of the color, texture, and personality in card-heavy areas.
4. **Signal accents:** use the warm brand accent for active controls and important emphasis, while reserving tier colors and semantic colors for their own meanings.
5. **Editorial hierarchy:** use concise headings, labels, and separators instead of placing every group inside another card.

Do not invent decorative charts, market tickers, fake live indicators, fake activity, or fabricated statistics to reinforce the theme.

---

# 2. Existing project constraints and baseline

The supplied project snapshot identifies a Vite + React 19 + TypeScript application using Tailwind CSS v4, React Router, Zustand, Supabase, TanStack Query, TanStack Virtual, Framer Motion, Lucide React, and React Icons. Continue using those tools. No new dependency is required for this design direction.

## 2.1 Existing architecture to preserve

- `src/app/App.tsx` owns route composition, shared overlays, the sidebar/top bar shell, and the persistent Trade Analyzer mounting point.
- `src/app/components/MainCanvas/` contains the Value List canvas, tier sections, grid/list presentation, virtualization, and unit-card components.
- `src/app/components/TradeAnalyzer/` contains supporting trade-section, active-row, parser, and summary components.
- `src/app/components/InventoryChannel/` contains inventory-supporting components such as `TradingCardSlot.tsx`, inventory utilities, skeletons, and value breakdown UI.
- `src/app/components/ProfileChannel/` contains profile, wishlist, ad-history, and settings UI.
- `src/store/` contains Zustand stores. Keep existing stores and state ownership.
- `src/styles/theme.css`, `density.css`, `globals.css`, `fonts.css`, and the existing import entry points provide the shared styling foundation.

## 2.2 Important source-snapshot gaps

In the supplied directory listing, `App.tsx` imports these lazy entry points, but their corresponding files were not listed:

- `src/app/components/TradeAnalyzer/index.tsx`
- `src/app/components/InventoryChannel/index.tsx`
- `src/app/components/TradingAdsChannel.tsx`

The supporting component files are present in the export, but the full page compositions are not. This may be an export omission or a difference between the snapshot and the current repository. **Phase 0 must confirm the real working-tree state.** Do not infer page composition or invent replacement entry points.

## 2.3 Current styling baseline from the supplied snapshot

- `theme.css` defines `dark`, `light`, and `discord` theme modes and semantic variables for backgrounds, foregrounds, cards, popovers, primary/secondary, destructive, success, warning, info, borders, inputs, scrollbars, and sliders.
- The default dark theme is documented in the file as Vercel-inspired and uses Discord-like blurple as its primary accent.
- `useLayoutStore.ts` supports `dark | light | discord`, a global compact-mode preference, and the existing display-font options `luckiest-guy | lilita-one | russo-one | rubik-dirt`.
- `main.tsx` imports both `index.css` and `density.css`; density styles are not missing merely because they are not imported by `index.css`.
- `globals.css` and `theme.css` both contain scrollbar-related rules. Consolidate only after verifying the cascade and actual browser behavior.
- `index.html` currently disables user scaling through `maximum-scale=1.0` and `user-scalable=no`. This must be corrected in the accessibility pass.
- The Value List uses TanStack Virtual and a responsive grid. Preserve the virtualization and sizing logic unless measured evidence proves a specific defect.
- `MainCanvas` synchronizes filter state with URL search parameters. Preserve share, refresh, and Back/Forward behavior.

## 2.4 Non-negotiable engineering constraints

Do not:

- Replace React, Vite, React Router, Zustand, Supabase, TanStack Query, TanStack Virtual, or Framer Motion.
- Change database schemas, RLS, RPCs, API routes, or server behavior for visual polish.
- Replace application state with local component state or a new state library.
- Remove a feature because it complicates the layout.
- break desktop, tablet, or mobile Analyzer behavior.
- Remove drag/drop, selection, quantity, pin, wishlist, copy, history, or save-to-vault interactions.
- Disable zoom, paste, keyboard operation, visible focus, or reduced-motion support.
- Add packages, icon libraries, font packages, chart packages, or component libraries without a concrete, reviewed need.
- Apply broad global selectors that unexpectedly affect every button, input, SVG, or nested component.

---

# 3. Global design principles

## 3.1 Hierarchy before decoration

Every screen should answer these questions in order:

1. Where am I?
2. What is the primary task on this screen?
3. What information do I need to make a decision?
4. What is the next action?
5. What supporting information can safely be quieter?

Use layout, spacing, alignment, typography, and dividers to establish hierarchy. A border or background panel should be used only when it clarifies grouping, separation, or interaction.

## 3.2 Density is a product feature

This is a data-heavy application. Do not make it spacious at the expense of information efficiency. Instead:

- Keep labels readable.
- Align repeated information consistently.
- Use stable row heights where comparison matters.
- Reduce redundant boxes and decorative padding.
- Allow users to scan more than one item at a time.
- Make the compact mode denser through spacing, not by making text microscopic.

## 3.3 Distinct features, shared language

The Value List, Analyzer, Ads, Vault, Profile, Home, and Tutorial should not all use identical cards. They should share the same typography roles, spacing logic, control behavior, surface rules, border language, and semantic color meanings. Each feature can use a different composition suited to its task.

## 3.4 Color must communicate

- Brand accent: active navigation, focused controls, selected states, and occasional high-value emphasis.
- Tier colors: tier identity and tier-related markers only.
- Positive/negative: actual favorable/unfavorable outcomes, not decoration.
- Warning: caution or uncertainty.
- Information: neutral explanatory context.
- Neutral surfaces: the majority of the interface.

Never communicate a state through color alone. Pair semantic color with text, iconography, shape, or another redundant cue.

## 3.5 Decoration must be earned

Avoid routine use of:

- Glassmorphism and backdrop blur.
- Glow borders and neon effects.
- Gradients on generic buttons or every panel.
- Deep shadows on ordinary cards.
- Excessive pill shapes.
- Excessive uppercase and letter spacing.
- Unnecessary badge clusters.
- Animated counters and constant motion.

These treatments are not prohibited. Use them only when they support a real hierarchy or product-specific identity.

---

# 4. Design tokens

The values below are the **proposed starting tokens** for the ASTD Exchange dark theme. They are not claimed to be current project values. Before implementation, compare them against the current live UI and existing theme variables. Adjust only where contrast, actual screenshots, or theme behavior reveal a concrete issue.

## 4.1 Core dark palette

| Token | Proposed value | Intended use |
|---|---:|---|
| `--background` | `#0D1014` | Main application canvas |
| `--sidebar` | `#151A20` | Navigation surface |
| `--card` | `#1C2229` | Standard card/panel surface |
| `--popover` | `#242C35` | Menus, popovers, elevated content |
| `--secondary` | `#252D36` | Secondary control/surface |
| `--muted` | `#20262E` | Quiet surface and grouped metadata |
| `--accent` | `#303B46` | Neutral hover/active surface |
| `--foreground` | `#F2F0EA` | Primary text |
| `--muted-foreground` | `#AAB3BC` | Secondary text |
| `--border` | `#343E49` | Structural border/divider |
| `--input` | `#171D24` | Input surface |
| `--primary` | `#D39A62` | ASTD Exchange brand accent |
| `--primary-foreground` | `#17130F` | Text/icons on primary accent |
| `--success` | `#4DAA7A` | Positive trade outcome / success |
| `--destructive` | `#D96E68` | Negative outcome / destructive action |
| `--warning` | `#D5A04F` | Warning / caution |
| `--info` | `#83AAB9` | Informational state |
| `--ring` | `#E2B27A` | Keyboard focus and focus-within |

### Color implementation rules

- Keep the existing semantic variable names wherever possible so current Tailwind utilities continue to resolve.
- Add only the missing semantic tokens required for a real role (for example, a dedicated sidebar surface or a stronger raised surface).
- Do not replace every literal tier color with the brand accent.
- Do not use the brand accent for positive/negative trade outcomes.
- Validate text contrast in all themes before finalizing values.
- Use `color-mix()` or alpha variants only when browser support and contrast are verified; do not rely on opacity alone for important text.

## 4.2 Theme mapping

The same semantic roles must exist for all supported themes:

- `dark`: the proposed ASTD Exchange palette.
- `light`: equivalent role hierarchy with legible neutral surfaces and a carefully adjusted warm accent.
- `discord`: preserve its recognizable Discord palette, while applying the shared typography, spacing, and component rules.

A theme switch changes token values, not component structure. Avoid `[data-theme]` exceptions inside individual feature components wherever possible.

## 4.3 Typography roles

Use three functional font roles:

| Role | Recommended family | Use |
|---|---|---|
| Display | `Barlow Condensed` | Page titles, tier headings, major section headings, selected branded labels |
| UI / body | `IBM Plex Sans` | Navigation, body copy, labels, buttons, forms, descriptions |
| Data / numeric | `IBM Plex Mono` | Values, quantities, totals, deltas, timestamps, compact market metrics |

Keep `Luckiest Guy` as an optional **brand accent** for carefully selected decorative headings or wordmark treatments if the existing user preference system supports it. Do not use it as the default body font or numeric font. Existing font choices (`Lilita One`, `Russo One`, `Rubik Dirt`, and `Luckiest Guy`) must not be deleted without auditing the current settings UI and persisted values. If retained, they should affect the display role only, never body or numeric roles.

### Type scale

| Role | Desktop | Mobile | Notes |
|---|---:|---:|---|
| Page title | 24–28px | 22–25px | Display face, restrained weight |
| Major section heading | 17–20px | 16–18px | Display or UI face |
| Subsection heading | 14–16px | 14–16px | UI face |
| Body | 13–15px | 14–16px | UI face; comfortable line-height |
| Control label | 12–13px | 13–14px | UI face |
| Supporting metadata | 11–12px | 11–12px | Use sparingly; do not use for primary information |
| Main market value | 18–24px | 17–21px | Numeric face, tabular figures |
| Secondary numeric value | 13–16px | 13–15px | Numeric face, tabular figures |
| Micro-label | 10–11px | 10–11px | Non-essential only; must remain legible |

### Typography rules

- Do not apply display font family to `body`, every `button`, every label, or the numeric role.
- Use tabular numerals for comparable quantities and values.
- Use weight and size before tracking to create hierarchy.
- Use uppercase only for short category labels, tier abbreviations, or compact metadata. Do not uppercase every sentence or control.
- Use consistent line-height and avoid clipping names or headings.
- Use a readable fallback stack so a font-loading failure does not break layout.
- Avoid loading four full font families when only three roles are needed. Subset and load only used families/weights after checking actual glyph coverage and the font provider's license.

## 4.4 Spacing scale

Use a 4px base rhythm:

`4, 8, 12, 16, 20, 24, 32, 40, 48, 64px`

Recommended usage:

- 4px: icon/text micro-gap or compact inline alignment.
- 8px: control internals and tight metadata groups.
- 12px: compact card padding and related content groups.
- 16px: standard panel/card padding and section gaps.
- 20–24px: major section spacing.
- 32–40px: large page-level separation.
- 48–64px: only where the screen composition genuinely needs breathing room.

Continue using the existing density variables (`--page-p`, `--panel-p`, `--card-p`, `--gap-*`) as the responsive implementation mechanism. Do not scatter replacement spacing values throughout individual components.

## 4.5 Density and control sizing

| Element | Standard | Compact | Mobile guidance |
|---|---:|---:|---|
| Standard button height | 36–40px | 32–36px | Aim for 44px interaction target |
| Input height | 38–40px | 34–36px | 44px target; input text at least 16px where required to prevent browser zoom behavior |
| Standard row | 40–48px | 34–40px | 44px or larger when interactive |
| Card padding | 12–16px | 8–12px | 10–14px, content-first |
| Main page padding | 16–20px | 12–16px | 12–16px, adapt to narrow width |

Compact mode must not push primary text below 12px or create touch targets that are difficult to use. Supporting metadata can be smaller only when it is genuinely secondary and remains readable.

## 4.6 Radius, borders, and shadow

| Role | Radius | Treatment |
|---|---:|---|
| Small controls | 3–4px | Crisp, utilitarian |
| Unit/list cards | 6px | Subtle corner, defined edge |
| Larger panels/modals | 8px | Slightly softer grouping |
| Chips/status markers | 3–4px | Compact, not pill by default |
| Circular indicators | 50% | Only when the shape represents a dot/avatar/control |

Border rules:

- Use one-pixel borders for structure and separation.
- Use low-contrast borders for ordinary surfaces.
- Reserve brighter borders for selected, focused, or meaningful states.
- Avoid applying both a strong border and a heavy shadow to every card.
- Keep nested radii visually concentric.

Shadow rules:

- Ordinary cards: usually none or a very subtle shadow.
- Menus/popovers: one clear elevation treatment.
- Modal/drawer: stronger separation from the canvas.
- Tier banner: preserve its custom metallic depth treatment.

## 4.7 Motion tokens

- Micro-interaction: 100–160ms.
- Standard state transition: 140–200ms.
- Modal/drawer transition: 180–240ms.
- Use transform and opacity where possible.
- Do not animate layout properties continuously.
- Motion must be interruptible and must respect `prefers-reduced-motion`.
- Avoid hover lift/scale on every card; use border, surface, or image treatment first.
- No animation should be necessary to understand a value or trade outcome.

---

# 5. Component and page design contracts

## 5.1 Application shell: Sidebar, TopBar, and canvas

### Sidebar

Purpose: orientation and channel navigation.

Rules:

- Keep the existing channel paradigm; do not make it a generic icon-only rail.
- Use clear category labels and a consistent indentation/spacing system.
- The active channel should be identifiable through one coherent active treatment (surface plus text/icon emphasis or a slim indicator), not several simultaneous glows and borders.
- Keep section labels quieter than channel names.
- Unread counts and notification indicators must retain their semantic meaning.
- Icons should be consistent in apparent weight and alignment even if the project currently uses more than one icon package.
- Preserve collapse behavior, thread navigation, keyboard use, and mobile drawer behavior.

### TopBar

Purpose: page context and high-frequency global actions.

Rules:

- Prioritize current channel/page identity, global search, filters where applicable, and Analyzer access.
- Controls must have consistent height, icon size, gap, and focus treatment.
- Keep rarely used tools in a deliberate overflow/menu rather than compressing every control into one row.
- Do not solve narrow widths by clipping controls or hiding critical actions without an accessible alternative.
- Preserve route-specific behavior and global keyboard shortcuts.

### Main canvas

Purpose: provide a predictable content workspace.

Rules:

- Establish a consistent left/right content edge.
- Keep independent scroll regions intentional; avoid accidental double scrollbars.
- Make sticky headers respect focus targets and anchor scrolling.
- Use intrinsic flex/grid sizing over hardcoded measurements where possible.
- Preserve existing Analyzer overlay and mobile/tablet sheet interaction.

## 5.2 Value List

The Value List is the first feature to receive a complete visual refinement because it is central to the product and the supplied screenshot shows it clearly.

### Content hierarchy

1. Page identity and live/value context.
2. Tier/category navigation.
3. Search, filters, sorting, and view controls.
4. Recently viewed items (supporting, compact).
5. Tier banner.
6. Subcategory heading and value range.
7. Unit cards or table rows.

Do not add decorative dashboard statistics above this structure.

### Tier banner

- Preserve the existing custom metallic U-frame concept and tier-specific face colors.
- Improve geometry, responsive spacing, text fitting, and alignment without changing the color philosophy of tier categories.
- Avoid text clipping on long tier labels or subtitles.
- Ensure the subtitle can disappear or wrap gracefully at narrow widths without affecting the tier name.
- Do not replace this distinctive treatment with a generic card, pill, gradient strip, or stock illustration.

### Unit cards

Every card should clearly communicate three layers:

**Layer 1 — identity:** unit artwork, name, and optional subtitle.  
**Layer 2 — market state:** primary value or special value state, with the most relevant status.  
**Layer 3 — supporting metrics:** rarity, liquidity, sentiment, and secondary actions.

Rules:

- Artwork is the dominant visual anchor. Use consistent aspect ratio and image crop behavior.
- Keep the unit name readable and allow long names to wrap or truncate only when a discoverable full-name path exists.
- The market value is the clearest numeric element in the information area.
- Owner's Choice, ranges, N/A, and special display values need explicit visual states; do not force them into numeric formatting.
- Keep rarity and liquidity aligned as related secondary metrics. Reduce box-within-box styling; use a restrained split, divider, or compact two-column metric row.
- Status labels (Stable, Inflated, Lowballed, Highballed, etc.) must be legible and consistent. Avoid stacking multiple loud badges without a clear priority.
- The tier color can identify the card or a meaningful marker, but should not outline every element in that tier color.
- Selection, in-trade, and hover states must be visually distinct from one another.
- Preserve card actions, copy, history, inventory save, drag/drop, voting, and bulk selection.

### Grid and list modes

- Preserve the current adaptive grid and virtualized rendering.
- Maintain a sensible minimum card width; adjust only after inspecting real viewport screenshots and the container's ResizeObserver behavior.
- List/table mode should prioritize quick comparison and stable numeric columns.
- Keep the same semantic hierarchy between grid and list views, even though their compositions differ.
- Avoid layout shifts when images or status data load.

### Toolbar and filters

- Group controls by task: search/filter, sort, selection, and view mode.
- Give Reset a secondary/destructive-outline character; it should not compete with the primary search or selection action.
- Make filter and sort labels readable rather than over-compressed uppercase captions.
- Preserve search state and tier state in the URL where implemented.

## 5.3 Trade Analyzer

The Analyzer should read like a comparison workstation, not like two unrelated piles of unit cards.

### Information hierarchy

1. Give side and Get side.
2. Items and quantities in each side.
3. Total value per side.
4. Absolute and percentage difference.
5. Outcome/evaluation.
6. Supporting forecasts and market metrics.
7. Secondary actions (copy, log, settings, clear, pin, reorder).

Rules:

- Use consistent side labels and a stable distinction between Give and Get.
- The totals must align and be easy to compare.
- Positive/negative colors should represent the direction of the calculated result and be accompanied by text or an explicit label.
- Do not imply certainty where the calculation includes uncertain Owner's Choice values or forecast metrics.
- Keep metrics such as ST Flip, LT Hold, rarity, and liquidity grouped as supporting information.
- Search/add interactions should remain easy to reach; keyboard navigation and parser workflows must continue working.
- Use compact but comfortable active rows. Item actions must not appear only on hover where touch users need them.
- Preserve quantity editing, pinning, drag reorder, cross-side movement, copying, logging, presets/settings, and undo behavior where implemented.
- On mobile/tablet, preserve the established sheet behavior and make sure the page remains scrollable when the Analyzer is open.

## 5.4 Trading Ads

The Ads page should feel like a community exchange board, not an ecommerce catalogue.

### Listing hierarchy

1. Trader identity and reputation/context that already exists.
2. What the trader is offering.
3. What the trader wants or their trade intent.
4. Listing status and relevant timing where available.
5. Interaction controls (open profile, comment, vote, interact/report as supported).

Rules:

- Differentiate an ad from a unit card. Do not reuse the Value List card wholesale.
- Make offer and request content visually scannable.
- Keep avatar and username connected to the listing, with reputation/role details as secondary information.
- Group comments and reactions without letting counters dominate the listing.
- Make empty, logged-out, cooldown, disabled, loading, and error states intentional.
- Preserve guest browsing and authentication gating exactly as currently implemented.
- Do not invent ratings, response speed, online status, or marketplace guarantees.

The complete Ads page entry point was not present in the supplied source listing. Final layout rules must be reconciled against its actual working-tree implementation before edits.

## 5.5 Inventory / Vault

The Vault should feel like an owned collection and management workspace, not a duplicate public value catalogue.

### Information hierarchy

1. Collection overview and ownership context.
2. Collection controls (search, sort, filters, selection, grouping as supported).
3. Unit identity and owned quantity.
4. Current value/estimated collection contribution.
5. Pinned, wishlist, and staged-trade states.
6. Management actions.

Rules:

- The unit image and owned quantity communicate collection identity.
- Quantity and pin states must be discoverable without hovering.
- Staged Give/Get quantities must be clearly distinguishable from owned quantity.
- Wishlist styling must not be confused with owned inventory.
- Value breakdown and portfolio information should be available without competing with the collection itself.
- Keep selection, quick transfer, quantity editing, drag/drop, read-only public views, and trade staging intact.
- Design distinct owned, wishlist, empty, loading, and read-only states.

## 5.6 Profile and community identity

- Make the trader identity the visual anchor: avatar, username, role/reputation information that actually exists, and concise profile content.
- Tabs should be clearly active without looking like unrelated buttons.
- Ad history, wishlist, journal, and settings can have distinct compositions while sharing the same component language.
- Avoid filling profile space with speculative statistics or decorative charts.
- Preserve privacy settings and account actions.

## 5.7 Home, Tutorial, and supporting channels

**Home:** a community bulletin for actual announcements, changelogs, or useful entry points. Do not create generic hero sections or fake stats.

**Tutorial:** an educational handbook. Content hierarchy and readability take precedence over decorative game motifs. The existing simulator and theory tools must remain functional.

**Notifications:** prioritize message, actor, time, and available action. Unread state should be obvious but restrained.

**Extra Notices / Legal:** prioritize long-form readability, clear section hierarchy, and accessible link treatments. These pages do not need a dashboard composition.

---

# 6. Accessibility, responsiveness, and interaction standards

These are release requirements, not optional polish.

## 6.1 Accessibility

- Restore browser zoom by removing `maximum-scale=1.0` and `user-scalable=no` from the viewport configuration. Keep `viewport-fit=cover` only if the current safe-area layout requires it.
- Every interactive control must have an accessible name.
- Use semantic buttons for actions and links for navigation.
- Ensure all important interactions can be completed with keyboard input.
- Maintain visible `:focus-visible` styling with adequate contrast.
- Do not let sticky headers, banners, drawers, or modals obscure focused controls.
- Inputs must have persistent labels or accessible names; placeholders are not labels.
- Ensure tooltips are not the only place where essential instructions or meanings exist.
- Use redundant status cues so color is not the only indicator.
- Respect `prefers-reduced-motion` for transitions, animations, and shimmer.
- Do not block paste or browser autofill.

## 6.2 Responsive behavior

Test at a minimum of:

- 1440px desktop.
- 1280px laptop.
- 1024px small laptop/tablet landscape.
- 768px tablet portrait boundary.
- 390px mobile.
- 360px narrow mobile.

Requirements:

- No unintended horizontal overflow.
- No clipped page headings, tier names, unit names, numeric values, or critical actions.
- No hover-only interactions for essential actions.
- Mobile controls use adequate touch targets (target 44px where practical).
- Inputs remain readable and do not cause unwanted browser zoom.
- The Analyzer sheet must not block the required scroll area or make the close action inaccessible.
- Responsive grids must use available container width rather than relying only on viewport width.
- Safe-area insets must be respected where the application uses edge-to-edge sheets.
- No important information is hidden merely to make the screenshot look cleaner.

## 6.3 Interaction feedback

- Every apparent control must actually work.
- Loading buttons retain their labels and communicate progress.
- Optimistic updates must show failure and recover/undo where the existing operation supports it.
- Destructive actions must confirm or provide a safe undo path.
- Hover, active, selected, disabled, and focus states must not be visually interchangeable.
- Do not add motion to every hover. Feedback should be predictable and calm.

---

# 7. Step-by-step implementation roadmap

Implementation must proceed in this order. Each phase should be reviewed and accepted before proceeding to the next. The listed files are likely targets based on the supplied snapshot; verify their current contents and existence first.

## Phase 0 — Repository verification and visual baseline

**Goal:** Establish that the implementation target matches the supplied snapshot and collect baseline evidence before changing styles.

### Step 0.1 — Verify the working tree

- Check the active branch and uncommitted changes.
- Confirm the actual existence of `DESIGN.md` (avoid overwriting an existing project-specific design document without reviewing it).
- Confirm the presence and current contents of:
  - `src/app/components/TradeAnalyzer/index.tsx`
  - `src/app/components/InventoryChannel/index.tsx`
  - `src/app/components/TradingAdsChannel.tsx`
- Identify actual route entry points for Home, Tutorial, Profile, Notifications, Ads, Inventory, and Analyzer.
- Confirm whether any additional theme or density modes exist beyond the supplied snapshot.

### Step 0.2 — Capture baseline screens

Capture the current implementation, not a mockup, at desktop and mobile sizes for:

- Value List default tier, grid mode.
- Value List list/table mode.
- Value List search/filter state.
- Analyzer with items on both sides and a meaningful value difference.
- Empty Analyzer.
- Inventory owned state, wishlist state, and empty state.
- Trading Ads populated and empty/logged-out states.
- Profile and Tutorial.
- Dark, light, and Discord themes.
- Standard and compact density.

Use representative real data. Avoid fabricating unit values or user details.

### Step 0.3 — Run baseline checks

- Run the existing production build using the repository's documented command (`npm run build`).
- Record current build errors before making changes.
- Inspect `package.json` for available test/lint scripts rather than assuming a script exists.
- Do not change environment variables or database state for a visual audit.
- If optional checks require unavailable credentials, record that they were not run; do not bypass or weaken them.

### Step 0.4 — Record baseline measurements

Record:

- Current font loading behavior and current font preference persistence.
- Current theme token values and computed colors for representative components.
- Current panel/sidebar/Analyzer widths at the target breakpoints.
- Current card minimum width and virtualizer measurement behavior.
- Any existing overflow, text clipping, or layout shift defects.

**Acceptance criteria:** The actual feature entry points and current styles have been located; baseline screenshots exist; build status is recorded; all known export-versus-repository gaps are resolved or documented. No source behavior has changed.

**Likely files inspected:** `package.json`, `src/main.tsx`, `src/app/App.tsx`, `src/styles/*`, `src/store/useLayoutStore.ts`, main feature entry points, and baseline component files.

---

## Phase 1 — Establish the shared visual foundation

**Goal:** Make typography, color, density, and component surfaces consistent before redesigning individual screens.

**Primary files:**

- `index.html`
- `src/main.tsx`
- `src/styles/theme.css`
- `src/styles/globals.css`
- `src/styles/density.css`
- `src/styles/fonts.css`
- `src/store/useLayoutStore.ts`
- Any existing Appearance/Preferences settings components that expose theme, density, or font selection.

### Step 1.1 — Fix viewport accessibility

- Remove zoom-disabling viewport attributes.
- Retain the viewport properties required by the current mobile safe-area/layout behavior.
- Verify that pinch zoom and browser zoom work on mobile and desktop.

### Step 1.2 — Implement typography roles

- Introduce explicit display, UI/body, and numeric font variables.
- Recommended starting families: Barlow Condensed, IBM Plex Sans, and IBM Plex Mono.
- Retain Luckiest Guy only as an optional decorative/brand face if desired.
- Preserve existing persisted font preference values and migration behavior.
- Change the current font selector so it only changes the display role. Body and numeric typography remain stable.
- Load only necessary families and weights; keep robust fallback stacks.
- Audit all broad font assignments and replace only where their role is wrong.

### Step 1.3 — Implement the token map

- Map the proposed ASTD Exchange palette to existing semantic variables.
- Add only missing roles such as sidebar/raised surfaces if required.
- Define dark, light, and Discord theme mappings.
- Keep tier colors, semantic outcome colors, and brand accent separate.
- Verify contrast for normal text, muted labels, controls, and focus states.

### Step 1.4 — Consolidate global styles carefully

- Audit duplicate scrollbar rules in `globals.css` and `theme.css`.
- Keep one authoritative implementation where safe, while preserving actual custom-scrollbar utilities.
- Check both WebKit/Blink and Firefox behavior.
- Audit global button/link transitions and focus rules for unintended side effects.
- Preserve existing reduced-motion rules and confirm new motion classes follow them.

### Step 1.5 — Refine density behavior

- Keep density tokens centralized in `density.css`.
- Raise compact typography floors for primary controls and important labels.
- Ensure mobile hit areas remain comfortable when compact mode is enabled.
- Make density primarily affect padding, gaps, and row heights rather than scaling every font down.

### Step 1.6 — Verify persistence and theme switching

- Test all existing theme selections.
- Test each existing font preference and confirm display-only behavior.
- Test compact mode on/off and refresh persistence.
- Test startup for flash/layout shift caused by preference hydration.

**Acceptance criteria:** All themes remain functional; existing saved preferences do not break; display/UI/numeric roles are visually distinct; compact mode is denser but readable; zoom works; no global styling regression is introduced.

**Regression risks:** persisted font values, first-paint theme selection, Tailwind token mapping, duplicated global CSS, scrollbar appearance, and any component that assumes the previous `--font-sans` behavior.

---

## Phase 2 — Refine the application shell

**Goal:** Make navigation and shared controls feel like one cohesive product before changing feature-specific layouts.

**Primary files:**

- `src/app/App.tsx`
- `src/app/components/Sidebar.tsx`
- `src/app/components/layout/TopBar.tsx`
- `src/app/components/shared/ResponsiveToolbar.tsx`
- Shared button/input/dropdown components under `src/app/components/ui/`

### Step 2.1 — Sidebar hierarchy

- Establish hierarchy between brand area, navigation categories, channels, and nested tier/thread links.
- Define one active-channel treatment.
- Make section labels and secondary channels visibly quieter than primary channel names.
- Standardize icon dimensions and alignment.
- Preserve unread counts, notification indicators, category collapse, and channel routing.

### Step 2.2 — TopBar hierarchy

- Establish a consistent height, vertical alignment, and control sizing.
- Separate current page identity from global controls.
- Group related actions.
- Keep search and Analyzer access prominent where they are core to the current workflow.
- Move less frequent actions into the existing menu/overflow patterns when present; do not remove them.
- Ensure route subtitles can truncate gracefully without squeezing essential controls.

### Step 2.3 — Shared control primitives

Audit and standardize:

- `ui/button.tsx`
- `ui/AsyncButton.tsx`
- `MainCanvas/CustomDropdown.tsx`
- `ui/QuantitySelector.tsx`
- `ui/StatusPill.tsx`
- `ui/EmptyState.tsx`
- `ui/ErrorState.tsx`
- `shared/ResponsiveToolbar.tsx`

Do not force every control into the same shape. Establish primary, secondary, subtle, destructive, selected, disabled, and loading variants where the existing component API supports them.

### Step 2.4 — Shell responsive QA

- Verify sidebar open/close and mobile drawer behavior.
- Verify route changes and browser history.
- Verify top bar wrapping/overflow at tablet and narrow widths.
- Verify the Analyzer panel does not overlap essential navigation controls.
- Verify keyboard focus is not hidden by sticky elements.

**Acceptance criteria:** Navigation is easier to scan; shared controls feel related; no route, shortcut, drawer, or Analyzer behavior regresses; all shell widths pass baseline viewport checks.

---

## Phase 3 — Redesign the Value List presentation

**Goal:** Improve the most visible and most data-dense feature while preserving its current logic.

**Primary files:**

- `src/app/components/MainCanvas/index.tsx`
- `src/app/components/MainCanvas/TierSections.tsx`
- `src/app/components/MainCanvas/UnitGrid.tsx`
- `src/app/components/MainCanvas/UnitListTable.tsx`
- `src/app/components/MainCanvas/UnitCard/TierGridCard.tsx`
- `src/app/components/MainCanvas/UnitCard/GridValueDisplay.tsx`
- `src/app/components/MainCanvas/UnitCard/GridStatBox.tsx`
- `src/app/components/MainCanvas/UnitCard/GridStatusBadge.tsx`
- `src/app/components/MainCanvas/UnitCard/SentimentVoteStrip.tsx`

### Step 3.1 — Refine page-level composition

- Review the current tier tabs, filters, sorting, bulk selection, view controls, recent views, and tier section ordering.
- Group toolbar controls by task.
- Reduce redundant borders and background boxes.
- Keep the recently viewed strip compact and secondary.
- Preserve URL state, keyboard behavior, filter reset behavior, and selection interactions.

### Step 3.2 — Refine tier presentation

- Keep the existing metallic tier banner and tier-specific face colors.
- Improve responsive banner height, skew/frame alignment, text fit, and subtitle behavior.
- Keep tier and subcategory hierarchy distinct.
- Ensure a long tier name or subtitle does not overlap the rails or clip at small widths.
- Preserve existing tier order and category logic.

### Step 3.3 — Establish a unit-card composition

Refactor the visual composition in small steps:

1. Artwork: stable aspect ratio, crop, fallback, and image-loading behavior.
2. Identity: clear unit name and optional subtitle.
3. Status: one consistent status treatment with meaningful visual priority.
4. Value: most prominent information value; special states are explicit.
5. Supporting metrics: rarity and liquidity aligned without unnecessary nested panels.
6. Secondary actions: discoverable but not visually dominant.

Do not rewrite card click/keyboard/drag handlers while changing visual markup. Keep changes isolated where possible.

### Step 3.4 — Refine grid and list modes

- Keep current `ResizeObserver`/virtualization behavior unless it demonstrably causes a layout defect.
- Check minimum card widths at desktop, tablet, and mobile.
- Align list/table numeric columns and labels.
- Confirm that grid and list modes present the same information priority.
- Verify virtual row measurements after typography and card-height changes.

### Step 3.5 — Refine card states

Test and style separately:

- Default.
- Hover.
- Keyboard focus.
- Active/pressed.
- Selected/bulk selection.
- Already in a trade.
- Unobtainable/obtainable or other existing statuses.
- Owner's Choice / special value.
- Missing image/fallback.
- Long unit name.
- Loading/skeleton.

**Acceptance criteria:** Unit identity and value are immediately scannable; status hierarchy is clear; rarity/liquidity remain available; no business interaction is lost; grid/list filters and virtualization work; long names and tier banners do not clip.

**Regression risks:** card event propagation, draggable behavior, modal opening, add-to-trade behavior, save-to-vault, card measurement, selection, and URL state.

---

## Phase 4 — Refine the Trade Analyzer

**Goal:** Make the Analyzer read as a clear Give/Get comparison and decision-support tool.

**Primary files:**

- `src/app/components/TradeAnalyzer/index.tsx` — verify this exists in the actual repository first.
- `src/app/components/TradeAnalyzer/TradeSectionPanel.tsx`
- `src/app/components/TradeAnalyzer/ActiveCardRow.tsx`
- `src/app/components/TradeAnalyzer/TradeSummaryBox.tsx`
- `src/app/components/TradeAnalyzer/TradeNotices.tsx`
- `src/app/components/TradeAnalyzer/SmartParserMenu.tsx`
- `src/app/components/TradeAnalyzer/summaryUtils.tsx`
- `src/app/components/ui/QuantitySelector.tsx`

### Step 4.1 — Establish comparison hierarchy

- Give/Get labels and colors remain consistent.
- Totals use the data typography role and equal visual weight.
- Difference and percentage delta are visually close to the totals they explain.
- The outcome/fairness label must explain the computed result, not rely on color alone.
- Supporting forecasts are grouped below or beside the primary comparison, based on the actual responsive layout.

### Step 4.2 — Refine active item rows

- Keep unit identity, quantity, value contribution, and actions aligned.
- Make pin, remove, quantity, and transfer actions reachable by keyboard and touch.
- Preserve drag/reorder and cross-side movement.
- Keep quantity details compact without hiding the ability to edit them.
- Handle long unit names and small screens.

### Step 4.3 — Refine search and parser interactions

- Keep search/add controls visible and consistent with shared input rules.
- Preserve arrow-key selection and Enter/Escape behavior.
- Keep parser feedback, suggestions, and errors readable.
- Avoid hover-only behavior for essential interactions.

### Step 4.4 — Refine summary metrics

- Prioritize total difference and result.
- Keep ST Flip, LT Hold, rarity, liquidity, and other existing metrics secondary.
- Explain uncertainty for special-value units where the underlying logic does so.
- Preserve copy-trade, log-trade, settings, and breakdown behavior.

### Step 4.5 — Verify panel/drawer behavior

- Test desktop side panel.
- Test tablet and mobile sheet.
- Confirm close control visibility.
- Confirm background canvas can still be used as intended.
- Confirm no modal or backdrop blocks scrolling unexpectedly.

**Acceptance criteria:** Users can identify both sides, totals, difference, and result at a glance; item management remains fully functional; search/parser keyboard behavior works; desktop and mobile Analyzer behavior is intact.

---

## Phase 5 — Refine Inventory / Vault

**Goal:** Make the personal collection feel owned, organized, and manageable without cloning the public market card.

**Primary files:**

- `src/app/components/InventoryChannel/index.tsx` — verify this exists in the actual repository first.
- `src/app/components/InventoryChannel/TradingCardSlot.tsx`
- `src/app/components/InventoryChannel/inventoryUtils.ts`
- `src/app/components/InventoryChannel/InventoryVaultSkeleton.tsx`
- `src/app/components/InventoryChannel/ValueBreakdownModal.tsx`
- `src/app/components/InventoryChannel/Sparkline.tsx`
- `src/app/components/ProfileChannel/tabs/WishlistTab.tsx`
- `src/app/components/ProfileChannel/tabs/WishlistCard.tsx`
- `src/hooks/useInventoryManager.ts`
- `src/store/useInventoryStore.ts`

### Step 5.1 — Audit current collection states

Identify the actual implemented states for owned units, pinned units, wishlist, read-only views, selected items, staged Give/Get, and empty/loading/error states. Do not assume every proposed state exists.

### Step 5.2 — Separate ownership from market metadata

- Make owned quantity clear.
- Keep current value and rarity/liquidity as supporting data.
- Differentiate owned state, wishlist state, and staged trade state.
- Make pinning visible but not overly decorative.

### Step 5.3 — Refine collection management controls

- Search, sort, filters, selection, and transfer actions should use shared control patterns.
- Quantity editing and quick transfer must remain discoverable on touch screens.
- Do not place essential actions exclusively in hover overlays.
- Keep drag/drop as an enhancement, not the only way to move items.

### Step 5.4 — Refine empty and loading states

- Skeletons should reserve the same geometry as the final collection layout.
- Empty states should explain what the user can do next, based on actual capabilities.
- Error states must offer a recovery action where possible.

**Acceptance criteria:** Users can distinguish ownership, wishlist, pin, and staged-trade states; quantities and key actions are accessible; inventory mutations and store behavior are unchanged.

---

## Phase 6 — Refine Trading Ads

**Goal:** Make community listings easy to scan and interact with while retaining their social context.

**Primary files:**

- `src/app/components/TradingAdsChannel.tsx` — verify actual path and existence before edits.
- Existing ad card/listing components discovered from the current repository.
- `src/app/components/layout/AdComposerModal.tsx`
- `src/app/components/AdInteractionModal.tsx`
- `src/app/components/ProfileChannel/AdItemGrid.tsx`
- `src/app/components/ProfileChannel/tabs/AdHistoryCard.tsx`
- `src/store/useTradingAdsStore.ts`
- `src/store/useAdInteractionStore.ts`

### Step 6.1 — Map the actual listing structure

Document the real fields currently displayed on each ad: user, offered units, requested units/intent, status, timestamps, comments, reactions, and actions. Do not create new listing fields for visual reasons.

### Step 6.2 — Define listing hierarchy

- Trader identity is visible but subordinate to the actual offer/request.
- Offer and request information are visually differentiated.
- Units use compact identity/value rows or grouped artwork, not a duplicate full-size Value List card.
- Comments and voting are secondary interaction areas.
- Important states and actions remain clear at narrow widths.

### Step 6.3 — Verify user and auth states

- Guest browse state.
- Logged-in browse state.
- Create-ad flow.
- Existing ad owner actions.
- Cooldown or restriction state.
- Empty board.
- Loading/error state.

Preserve all existing auth, role, cooldown, upvote/downvote, comment, and delete rules.

**Acceptance criteria:** Offers and requests are easy to compare; user identity is clear; guest browsing and sign-in gating remain intact; all ad interactions behave exactly as before.

---

## Phase 7 — Profile, Home, Tutorial, Notifications, and supporting channels

**Goal:** Complete the visual language without making all channels look like the same dashboard.

**Likely files:**

- `src/app/components/HomeChannel.tsx`
- `src/app/components/TutorialChannel/`
- `src/app/components/NotificationsChannel.tsx`
- `src/app/components/ProfileChannel/`
- `src/app/components/ExtraNoticesChannel.tsx`
- `src/app/components/LegalChannel.tsx`
- Shared profile, notification, modal, and skeleton components.

### Step 7.1 — Home

- Establish the current product purpose and useful entry points.
- Prioritize real updates, notices, and meaningful navigation.
- Avoid fake statistics, generic hero filler, or repeated CTA cards.

### Step 7.2 — Tutorial

- Use the codex/handbook influence sparingly.
- Establish a readable content column, stable heading hierarchy, and clear progress/navigation affordances.
- Preserve simulator, sandbox, theory, dictionary, and guide behavior.

### Step 7.3 — Profile

- Make trader identity and actual reputation/context the top-level hierarchy.
- Use consistent tab navigation.
- Give wishlist, ad history, journal, and settings their appropriate content layouts.
- Preserve privacy, profile settings, and account actions.

### Step 7.4 — Notifications and notices

- Prioritize message identity, meaning, time, and available action.
- Ensure unread/read/empty/loading/error states are clear.
- Long-form notices and legal text should optimize for reading rather than visual ornament.

**Acceptance criteria:** All supporting channels use the shared visual system but remain appropriate to their content; no feature is reduced to a generic card grid.

---

## Phase 8 — Global polish and regression pass

**Goal:** Confirm that the full product is visually coherent and behaviorally unchanged.

### Step 8.1 — Responsive pass

Run the viewport matrix for all high-priority screens. Check for:

- Horizontal overflow.
- Clipped headings, names, values, and buttons.
- Unreachable controls.
- Hover-only actions.
- Nested scrolling conflicts.
- Sticky headers covering focused content.
- Incorrect grid column changes.
- Analyzer sheet occlusion.
- Safe-area issues.

### Step 8.2 — Theme and density pass

For each major screen, test:

- Dark theme, standard density.
- Dark theme, compact density.
- Light theme, standard density.
- Discord theme, standard density.
- Light/Discord compact mode where supported.

Do not accept a design that only works in the default dark theme.

### Step 8.3 — Accessibility pass

- Browser zoom and pinch zoom.
- Keyboard navigation and focus visibility.
- Input labels and accessible names.
- Contrast and non-color status cues.
- Reduced-motion preferences.
- Modal focus handling and close controls.
- Touch target sizing.

### Step 8.4 — Functional regression pass

Verify at minimum:

- Routing and browser history.
- Search and filters.
- URL-synchronized Value List state.
- Grid/list modes and virtual scrolling.
- Bulk selection.
- Unit history modal.
- Add to Give/Get.
- Analyzer totals, undo, copy, and log behavior.
- Inventory save, quantities, pinning, and transfer.
- Trading Ads browsing and interactions.
- Profile tabs and settings.
- Theme/font/density preference persistence.

### Step 8.5 — Build and document

- Run `npm run build`.
- Run only test/lint/type-check commands that actually exist in the current repository.
- Record any checks not run and why.
- Update this document if a deliberate design decision changes.

**Release acceptance criteria:** No unintended horizontal overflow at target viewports; all supported themes and density modes remain legible; primary tasks remain usable with keyboard and touch; no core feature behavior is removed; build succeeds; known limitations are documented.

---

# 8. Implementation workflow and review checklist

Use this checklist for each implementation slice.

## Before editing

- [ ] Read the complete target component.
- [ ] Read its direct child components and the state/store hooks used by it.
- [ ] Identify props and public component contracts.
- [ ] Identify event handlers and navigation behavior that must remain unchanged.
- [ ] Locate all CSS tokens/classes affecting the target.
- [ ] Capture the before screenshot at the relevant viewport/theme.
- [ ] State the precise design problem being corrected.

## While editing

- [ ] Prefer a shared token or shared component change when multiple areas need the same correction.
- [ ] Avoid a generic shared component abstraction if only one special case needs it.
- [ ] Keep business logic out of styling changes.
- [ ] Avoid replacing a complete component when a targeted markup/class change is sufficient.
- [ ] Avoid hardcoded theme-specific colors in reusable components.
- [ ] Preserve component props and state behavior unless there is an approved reason to change them.
- [ ] Ensure long text, missing images, and empty states remain safe.

## After editing

- [ ] Compare before/after screenshots at the same viewport and data state.
- [ ] Check default, hover, focus, active, disabled, selected, loading, and error states where applicable.
- [ ] Check the relevant responsive breakpoint.
- [ ] Check other supported themes if a shared token or shared component changed.
- [ ] Exercise every interaction touched by the change.
- [ ] Run the relevant available build/test command.
- [ ] Record modified files, tests run, and unverified behavior.

## Review questions

1. Does this make the product identity more coherent?
2. Does it improve scanning, comprehension, or task completion?
3. Does the component still look appropriate for its specific feature?
4. Is any panel, badge, border, glow, or animation unnecessary?
5. Does the change work in all supported themes and densities?
6. Does it preserve mobile and keyboard interaction?
7. Has any working behavior changed unintentionally?
8. Is there a simpler implementation using the existing architecture?

---

# 9. Explicit non-goals and deferred ideas

Do not include these in the first visual refinement unless a separate, evidence-backed request is approved:

- Replacing the navigation paradigm.
- Renaming the product to ASTD Exchange.
- Replacing the unit card data model.
- Rebuilding the Value List virtualization.
- Introducing a new design system package or component library.
- Rewriting Supabase state/data access.
- Changing trading calculations or market methodology.
- Adding fictional market activity, analytics, charts, ratings, or social proof.
- Replacing all tier graphics or tier colors.
- Introducing a global animation system.
- Redesigning the entire mobile application independently from the desktop system.

---

# 10. Definition of done

The design refinement is complete when all of the following are true:

- [ ] ASTD Value List has a recognizable and consistent visual identity.
- [ ] Display, UI, and numeric typography have separate roles.
- [ ] The default dark theme no longer reads as an unmodified generic Discord/Vercel palette.
- [ ] Light and Discord themes remain supported and legible.
- [ ] Compact density improves efficiency without making primary text or touch controls unusable.
- [ ] The application shell has a consistent navigation and control hierarchy.
- [ ] The Value List prioritizes unit identity, value, and supporting market data.
- [ ] The metallic tier banner remains a recognizable product-specific element and fits responsive widths.
- [ ] The Analyzer makes Give/Get totals and the resulting difference easy to compare.
- [ ] The Vault communicates ownership and collection management distinctly from the public catalogue.
- [ ] Trading Ads communicate trader identity, offer, request, and interactions clearly.
- [ ] Home, Tutorial, Profile, Notifications, and supporting pages use the same visual language without identical layouts.
- [ ] No unintended horizontal overflow or clipped primary content exists at target viewport sizes.
- [ ] Browser zoom, keyboard operation, visible focus, touch access, and reduced motion are supported.
- [ ] Core functionality and application state behavior are preserved.
- [ ] Build and available regression checks pass, or any failures are clearly documented.

---

# 11. Source snapshot references

This document was prepared from the supplied Gitingest snapshot and the accompanying Value List screenshot. These references identify where the baseline observations came from; verify them against the current repository before editing because the working tree may have changed since the snapshot.

| Area | Source location in supplied export | Notes |
|---|---|---|
| Project structure | Directory listing near beginning of export | Shows feature folders and shared styling architecture |
| Package stack | `package.json` | Dependencies and available scripts |
| App shell and route composition | `src/app/App.tsx` | Lazy imports, routes, global panels, shared shell |
| Sidebar | `src/app/components/Sidebar.tsx` | Channel categories and navigation |
| Main canvas | `src/app/components/MainCanvas/index.tsx` | Virtualization, grid/list, filters, toolbar, recent views |
| Tier banner | `src/app/components/MainCanvas/TierSections.tsx` | Existing tier face and metallic U-frame implementation |
| Unit card | `src/app/components/MainCanvas/UnitCard/TierGridCard.tsx` | Artwork, status, values, secondary metrics, interactions |
| Trade Analyzer support | `src/app/components/TradeAnalyzer/` | Trade rows, side panels, summary and parser helpers |
| Inventory support | `src/app/components/InventoryChannel/TradingCardSlot.tsx` | Owned quantity, staged quantity, selection, pinning, wishlist, actions |
| Theme tokens | `src/styles/theme.css` | Existing theme and semantic CSS variables |
| Global styles | `src/styles/globals.css` | Scrollbars, global focus and utility rules |
| Density | `src/styles/density.css` | Standard/compact responsive tokens |
| Style entry points | `src/main.tsx`, `src/styles/index.css` | CSS import order and density import |
| Font persistence | `src/store/useLayoutStore.ts` | Existing theme, density and font preference types |
| Viewport configuration | `index.html` | Current viewport accessibility issue |
| Interface guidance | `AGENTS.MD` and `.agents/skills/web-design-guidelines/SKILL.md` | Existing interaction/accessibility/performance guidance |

