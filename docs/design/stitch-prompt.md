# Work Management Dashboard — Google Stitch Design Prompt

## Design Direction

Create a task/project management dashboard that merges **Todoist's UX clarity** with **Zed IDE's visual aesthetic**. The result should feel like a developer's personal command center — clean, fast, information-dense but never cluttered, dark-mode-first with surgical use of color.

### Visual Identity: Zed IDE-Inspired

**Color System — Dark Mode First (Zed-Accurate)**

CRITICAL: The three background tiers must be nearly indistinguishable — only 3-4 hex steps apart. In Zed, you can barely tell where the sidebar ends and the content begins. The entire UI reads as one dark surface with whisper-thin structural hints.

| Token | Hex | Usage |
|-------|-----|-------|
| `bg-deep` | `#1A1D23` | Main content area background (deepest layer) |
| `bg-surface` | `#1E2127` | Cards, panels, sidebar background — barely distinguishable from deep |
| `bg-chrome` | `#212429` | Top bar, status bar, toolbar — barely distinguishable from surface |
| `bg-hover` | `#262930` | Hover states on rows and cards — subtle shift |
| `bg-active` | `#2A2D34` | Active/selected states |
| `border-subtle` | `#262930` | Panel dividers, card borders — nearly invisible, felt not seen |
| `border-focus` | `#3D5A8A` | Focus rings, active element borders — desaturated blue |
| `text-primary` | `#C8CCD2` | Primary text — warm off-white, noticeably not pure white |
| `text-secondary` | `#7D8490` | Metadata, labels, secondary information — clearly subdued |
| `text-muted` | `#4D525C` | Placeholder text, disabled states — barely readable |
| `accent-blue` | `#5A93CC` | Links, focus states, interactive highlights — desaturated |
| `accent-brand` | `#084CCF` | Logo, primary action buttons (sparingly) |
| `status-green` | `#8BA876` | Health green, success states — olive-muted, not vibrant |
| `status-yellow` | `#B8A06A` | Health yellow, warnings — ochre-muted |
| `status-red` | `#A85D61` | Health red, errors, overdue — brick-muted, not alarming |
| `status-orange` | `#B0825A` | P2 priority — terracotta-muted |
| `priority-p1` | `#A85D61` | P1 checkbox/indicator — same brick-muted red |
| `priority-p2` | `#B0825A` | P2 checkbox/indicator — same terracotta-muted |
| `priority-p3` | `#5A93CC` | P3 checkbox/indicator — same desaturated blue |

All colors use Zed's principle: aggressively muted, deeply desaturated tones — never neon, never vibrant, never attention-grabbing. The UI is near-monochromatic blue-gray. Color appears only for semantic meaning (priority, health, status) and even then it whispers, never shouts. Priority dots and health indicators should be 6-8px circles, not large badges.

**Typography**

| Element | Font | Size | Weight | Color |
|---------|------|------|--------|-------|
| App title / logo | IBM Plex Sans | 18px | 600 | `text-primary` |
| Section headers | IBM Plex Sans | 14px | 600 | `text-primary` |
| Task titles | IBM Plex Sans | 14px | 400 | `text-primary` |
| Metadata / chips | IBM Plex Sans | 12px | 400 | `text-secondary` |
| Muted labels | IBM Plex Sans | 11px | 400 | `text-muted` |

Golden-ratio line height (1.618) for body text. IBM Plex Sans throughout — the same humanist technical feel as Zed's UI.

**Visual Rules**

- **No shadows.** Depth comes from the three-tier background system, but the tiers are so close they read as one surface.
- **Near-invisible borders.** 1px in `border-subtle` (#262930) — you should have to squint to see panel dividers. They're structural, not decorative.
- **Flat surfaces.** No gradients, no gloss, no card "lift" effects.
- **Subtle corner radius** — 6px on cards, 4px on buttons/chips, 2px on small indicators.
- **Anti-ornamental.** Every pixel serves a function. No decorative elements. No colored backgrounds on badges — use small colored dots (6-8px) instead of pills.
- **Color is signal, and signals are quiet.** If something has color, it means something (priority, health, status). The base chrome is entirely colorless gray. Even semantic colors are muted to the point where they blend into the UI until you specifically look for them.
- **Monochrome dominance.** When you step back and squint at any screen, it should read as a single dark monochrome surface with text. Color should be barely perceptible at a glance.

---

### UX Patterns: Todoist-Inspired

**Core layout: Three-panel architecture**

```
+------------------+----------------------------------+-------------------+
|                  |                                  |                   |
|   Left Sidebar   |         Main Content             |   Detail Panel    |
|   (collapsible)  |         (active view)            |   (on demand)     |
|                  |                                  |                   |
|   - Today        |   [View content fills this area] |   [Opens when     |
|   - Portfolio    |                                  |    clicking a     |
|   - Projects     |                                  |    task/project]  |
|     > Project A  |                                  |                   |
|     > Project B  |                                  |                   |
|   - Blockers     |                                  |                   |
|   - Deadlines    |                                  |                   |
|                  |                                  |                   |
+------------------+----------------------------------+-------------------+
```

- Sidebar: navigation + view switching. Always visible on desktop, collapsible via keyboard shortcut.
- Main content: one view at a time, full width. View switching replaces content entirely — never stacked panels.
- Detail panel: slides in from right when a task or project is selected. Two-column internally (content left, attributes right).

**Interaction principles (from Todoist):**

- **Progressive disclosure:** Task rows show only checkbox + title + minimal metadata. Everything else is one click away.
- **Hover-to-reveal:** Action icons (edit, schedule, etc.) appear only on hover. Clean at rest, powerful on demand.
- **Quick-add:** Global shortcut opens a floating input. Single text field. Hit Enter to create.
- **One view at a time:** Each screen is a single list or single board — never a complex multi-widget dashboard.
- **Text as primary interface:** Overwhelmingly text-based. Minimal icons. Task management is text-processing.
- **Consistent spatial rhythm:** Every task row same height, same padding, same alignment. Predictable scanning.

---

## Screens to Generate

Generate **5 prototype screens** at **1440x900px** (desktop). Use realistic sample data from the tables below.

---

### Screen 1: Today View — "What Should I Work On?"

This is the hero screen. The most important view in the entire app.

**Layout:**
- Left sidebar showing navigation (Today is active/highlighted)
- Main content area: flat list of tasks, grouped by deadline bucket
- Top bar with app name "Work Management" (left), search icon, and user avatar (right)
- View title "Today" with subtitle showing date and task count

**Content structure:**
```
OVERDUE (2)
  [red dot] [checkbox] Fix auth token refresh — ADF Framework [P1] [red health dot]
  [red dot] [checkbox] Update connector error handling — Work Management [P2]

TODAY (3)
  [checkbox] Review design brief feedback — Consulting: Acme [P1]
  [checkbox] Draft quarterly board update — Board [P2]
  [checkbox] Migrate user settings schema — SaaS Product [P3]

THIS WEEK (4)
  [checkbox] Write integration tests for sync — Work Management [P2]
  [checkbox] Client presentation prep — Consulting: Acme [P2]
  [checkbox] Refactor KB search ranking — Knowledge Base [P3]
  [checkbox] Update personal budget spreadsheet — Personal [P3]
```

**Visual details:**
- Deadline bucket headers in `text-secondary` with count badge
- "OVERDUE" header in `status-red`
- Each task row: circular checkbox (color = priority), task title in `text-primary`, project name as a subtle chip in `text-secondary`, health dot for troubled projects
- Rows have generous vertical spacing (Todoist-style — each task feels tappable)
- Hover state shows subtle `bg-hover` background
- Connected project tasks show a small sync icon (two arrows) next to the project chip
- Bottom of list: muted text "Showing top 9 across 6 projects"

---

### Screen 2: Portfolio View — All Projects

**Layout:**
- Left sidebar (Portfolio is active)
- Main content: grid of project cards (2 columns)
- Top bar with filter chips: "All" (active), "Dev", "Business", "Personal", "Board", "Consulting"
- "New Project" button in top-right (accent-blue, subtle)

**Project card anatomy:**
```
+-----------------------------------------------+
| [health dot] Project Name              [sync] |
| Category chip   •   8 tasks   •   2 blocked   |
|                                                |
| Current focus: Brief review and finalization   |
| ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░  62% complete            |
+-----------------------------------------------+
```

**Sample project cards (8 projects):**

| Project | Health | Category | Tasks | Blocked | Focus | Complete | Type |
|---------|--------|----------|-------|---------|-------|----------|------|
| ADF Framework | Yellow | dev | 12 | 2 | Plugin system refactor | 45% | connected |
| Work Management | Green | dev | 8 | 0 | Brief review and finalization | 15% | native |
| SaaS Product | Red | dev, business | 24 | 5 | Auth system migration | 68% | connected |
| Consulting: Acme | Green | consulting | 6 | 0 | Q1 delivery sprint | 80% | native |
| Knowledge Base | Green | dev | 10 | 1 | Search ranking improvements | 55% | connected |
| Board Governance | Yellow | board | 4 | 1 | Quarterly review prep | 30% | native |
| Personal | Green | personal | 5 | 0 | Tax prep and filing | 40% | native |
| Capabilities Registry | Green | dev | 3 | 0 | Inventory documentation | 70% | connected |

**Visual details:**
- Cards use `bg-surface` background with `border-subtle` border
- Health dot: colored circle (green/yellow/red) left of project name
- Connected projects show small sync icon in top-right corner of card
- Progress bar: thin (4px height), filled portion uses `accent-blue`, background uses `bg-deep`
- Category chips use small rounded pills in `bg-chrome` with `text-secondary`
- "blocked" count in `status-red` when > 0
- Cards have subtle hover: border shifts to `border-focus`

---

### Screen 3: Project Detail — Planned Project (ADF Framework)

**Layout:**
- Left sidebar (ADF Framework is active under Projects)
- Main content: project header + phase sections + tasks
- A task is selected, so the detail panel is open on the right

**Project header:**
```
[yellow health dot] ADF Framework                    [connected] [sync icon] Last synced: 2 hours ago
dev  •  12 tasks  •  2 blocked  •  45% complete
Focus: Plugin system refactor
Blockers: Waiting on dependency resolution for plugin API
```

**Phase sections with tasks (kanban-list hybrid — Todoist section style):**
```
── Phase 1: Core Refactor (4/6 complete) ──────────────────

  [x] Extract plugin interface           done     P2   S
  [x] Migrate existing hooks             done     P1   M
  [x] Add plugin discovery               done     P2   S
  [x] Update documentation               done     P3   S
  [ ] Resolve dependency conflicts        blocked  P1   M   ← red blocked badge
  [ ] Integration test suite              pending  P2   L

── Phase 2: Plugin System (0/4 complete) ─────────────────

  [ ] Plugin manifest spec                pending  P1   M
  [ ] Plugin loader implementation        pending  P1   L
  [ ] CLI plugin commands                 pending  P2   M
  [ ] Plugin testing framework            pending  P3   M

── Backlog (3 items) ─────────────────────────────────────

  Improve error messages for hook failures       P3  enhancement
  Add plugin dependency resolution               P2  enhancement
  Consider plugin marketplace concept            —   idea
```

**Detail panel (right side) — showing selected task "Resolve dependency conflicts":**
```
Resolve dependency conflicts              [P1] [blocked]
ADF Framework > Phase 1: Core Refactor

Description:
Plugin API has circular dependency between hook
system and plugin loader. Need to extract shared
interface.

Status:        blocked
Blocked by:    Waiting on plugin-api package extraction
Priority:      P1
Size:          M
Owner:         claude-code (agent)
Data origin:   synced [lock icon]
Created:       Feb 8, 2026
Source:        tasks.md#L24

── Activity ──
Feb 10  Status changed: in_progress → blocked (system)
Feb 9   Assigned to claude-code (jess)
Feb 8   Created via ADF connector sync
```

**Visual details:**
- Phase headers use section divider style (thin line + bold text + progress count)
- Completed tasks: checkbox filled with `status-green`, title has strikethrough in `text-muted`
- Blocked tasks: small red "blocked" badge next to status
- Synced tasks show a lock icon indicating read-only
- Detail panel uses `bg-surface` with `border-subtle` left border
- Activity log entries use timeline style — date left-aligned in `text-muted`, action in `text-secondary`

---

### Screen 4: Project Detail — Flat Project (Personal)

**Layout:**
- Same shell as Screen 3, but simpler — no phases, no plan
- Shows how flat (non-planned) projects differ from planned ones

**Project header:**
```
[green health dot] Personal                                           [native]
personal  •  5 tasks  •  0 blocked  •  40% complete
```

**Task list (simple flat list, Todoist-style sections for manual organization):**
```
── Tax & Finance ──────────────────────────────────────────

  [x] Gather W-2 forms                   done     P1
  [ ] Schedule CPA appointment            pending  P2   due: Feb 14
  [ ] Review investment allocations        pending  P3

── Home ──────────────────────────────────────────────────

  [x] Fix kitchen faucet                  done     P3
  [ ] Research standing desk options       pending  P3

+ Add task...
```

**Visual details:**
- No phase headers — sections are simple organizational dividers (user-created)
- "Add task" affordance at the bottom — subtle `text-muted` with plus icon, highlights on hover
- No sync icon, no lock icons — this is a native project, fully editable
- Much simpler than the planned project — demonstrates the flat workflow_type
- Tasks are draggable (grip handle on hover) for manual reordering

---

### Screen 5: Status Kanban — Cross-Project Board

**Layout:**
- Left sidebar (no specific project active — this is a cross-cutting view)
- Main content: 4-column kanban board
- Filter bar at top: project filter dropdown, priority filter, category filter

**Columns:**
```
  PENDING (5)          IN PROGRESS (4)       BLOCKED (3)           DONE (6)
  ─────────────        ─────────────         ─────────────         ─────────────
  ┌─────────────┐     ┌─────────────┐       ┌─────────────┐      ┌─────────────┐
  │ Plugin       │     │ Auth system  │       │ Dep conflicts│      │ Extract      │
  │ manifest spec│     │ migration    │       │ ADF Framework│      │ plugin intf  │
  │ ADF [P1]    │     │ SaaS [P1]   │       │ [P1] [red]  │      │ ADF [P2] [✓]│
  └─────────────┘     └─────────────┘       └─────────────┘      └─────────────┘
  ┌─────────────┐     ┌─────────────┐       ┌─────────────┐      ┌─────────────┐
  │ Client pres  │     │ Review design│       │ Board review │      │ Migrate      │
  │ prep         │     │ brief        │       │ prep         │      │ existing     │
  │ Acme [P2]   │     │ Acme [P1]   │       │ Board [P2]  │      │ hooks        │
  └─────────────┘     └─────────────┘       └─────────────┘      │ ADF [P1] [✓]│
  ┌─────────────┐     ┌─────────────┐       ┌─────────────┐      └─────────────┘
  │ KB search    │     │ Q1 delivery  │       │ Plugin API   │      ┌─────────────┐
  │ ranking      │     │ sprint       │       │ extraction   │      │ Add plugin   │
  │ KB [P3]     │     │ Acme [P2]   │       │ SaaS [P1]   │      │ discovery    │
  └─────────────┘     └─────────────┘       └─────────────┘      │ ADF [P2] [✓]│
                      ┌─────────────┐                             └─────────────┘
                      │ Budget       │
                      │ spreadsheet  │
                      │ Personal [P3]│
                      └─────────────┘
```

**Kanban card anatomy:**
```
┌─────────────────────────┐
│ Task title (2 lines max)│
│ Project chip  [Priority]│
│         [sync icon]     │
└─────────────────────────┘
```

**Visual details:**
- Column headers: status name in `text-secondary` with count badge
- "BLOCKED" column header in `status-red`
- Cards use `bg-surface` with `border-subtle`, 6px corner radius
- Priority shown as colored dot on card (matching priority colors)
- Project name as small chip at bottom of card
- Connected tasks show sync icon
- Cards are draggable between columns (for native tasks only)
- Synced task cards show subtle lock overlay — not draggable
- Done column: cards have reduced opacity (0.7) and checkmark overlay
- Column backgrounds use `bg-deep` with subtle border separating them

---

## Global UI Elements

**Top bar (persistent across all views):**
```
[Logo] Work Management          [Search icon] [Quick-add +] [avatar]
```
- Height: 48px
- Background: `bg-chrome`
- Logo: simple text mark in IBM Plex Sans 600
- Quick-add button: `accent-blue` circle with "+" icon

**Sidebar (persistent, collapsible):**
```
TODAY                    [9]
PORTFOLIO
─────────────────────────
PROJECTS
  ADF Framework          [12]
  Work Management        [8]
  SaaS Product           [24]
  Consulting: Acme       [6]
  Knowledge Base         [10]
  Board Governance       [4]
  Personal               [5]
  Capabilities Registry  [3]
─────────────────────────
VIEWS
  Status Kanban
  Priority Board
  Deadlines
  Blockers               [3]
```
- Width: 240px
- Background: `bg-surface`
- Active item: `bg-active` background with `accent-blue` left border (2px)
- Task counts as muted badges right-aligned
- "Blockers" count in `status-red` when > 0
- Section headers (PROJECTS, VIEWS) in `text-muted`, uppercase, 11px

**Quick-add modal (floating):**
```
┌──────────────────────────────────────────────┐
│  What needs to be done?                      │
│  ─────────────────────────────────────────── │
│  [Project ▾]  [Priority ▾]  [Due date]      │
│                                    [Add Task]│
└──────────────────────────────────────────────┘
```
- Centered floating modal with `bg-surface` background
- Single-line text input as primary interaction
- Optional attribute row below (project, priority, date)
- Keyboard shortcut: `Q` or `Cmd+K`

---

## Validated Patterns (from Stitch Round 1)

These patterns were validated in the first Stitch prototype round and should be preserved:

**Portfolio card anatomy:** Health dot (6px) + project name / metadata line (category chip, task count, blocked count) / "Current focus:" line / thin 4px progress bar with percentage. This information density works well in a 2-column grid.

**Detail panel structure:** Breadcrumb header (Project > Phase) / description block / key-value attributes table / activity log timeline at bottom. The breadcrumb navigation in the panel header aids orientation.

**Phase section dividers:** "PHASE 1: CORE REFACTOR · 4/6 tasks complete" rendered as a thin horizontal rule with inline bold text and progress fraction. Clean Todoist-style section headers.

**Cross-cutting filter bar:** Project dropdown + priority filter + category filter as a persistent row above kanban/board views. Enables multi-project views without sidebar changes.

**Blocked badge:** Small red "BLOCKED" text badge inline with task status. Effective signal without being visually heavy.

**Flat vs. planned visual contrast:** Flat projects (Personal) are noticeably simpler — no phase headers, no sync icons, just section dividers and an "+ Add task" affordance. The visual simplicity itself communicates the workflow type.

**Done de-emphasis:** Completed kanban cards use reduced opacity (0.7) + small checkmark. Completed task rows use strikethrough in `text-muted` with filled checkbox in `status-green`.

---

## Design System Summary

| Principle | Implementation |
|-----------|---------------|
| **Todoist simplicity** | One view at a time. Progressive disclosure. Text-first. Hover-to-reveal actions. |
| **Zed aesthetics** | Dark three-tier backgrounds. No shadows. 1px subtle borders. Muted semantic colors. IBM Plex Sans. |
| **Information density** | Tight but breathable. 15-20 tasks visible on screen. Generous row spacing. Compact metadata chips. |
| **Color discipline** | Monochromatic blue-gray base. Color only for: priority (red/orange/blue), health (green/yellow/red), accent (blue). |
| **Navigation** | Sidebar for context switching. View replaces main content entirely. Detail panel slides in from right. |
| **Connected vs native** | Sync icon + lock icon on connected/synced content. No visual distinction otherwise — same card style. |
