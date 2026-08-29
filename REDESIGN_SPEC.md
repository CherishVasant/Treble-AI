# TrebleAI — Frontend Redesign Specification

> **Status:** Pending implementation  
> **Target:** `frontend/` (Next.js 14 App Router, Tailwind CSS, shadcn/ui)  
> **Do not modify code until explicitly instructed.** This file is a design specification only.

---

## 1. Overview

Replace the current vertically-stacked single-column layout (Practice Studio page) with a **Studio layout** — a professional DAW-style interface using a persistent three-panel grid with collapsible sidebars and a fixed bottom dock.

The existing purple/blue gradient color system and glassmorphism aesthetic are **kept as-is**. No color rework in this pass.

---

## 2. Default Layout — "Studio Mode"

### 2.1 Grid Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  [Left Sidebar — 264px, collapsible]  │  [Center Panel — 1fr]  │  [Right Panel — 360px, collapsible]  │
│                                       │                         │                                      │
│  TrebleAI logo                        │  Sheet Music Viewer     │  AI Chat (Treble)                    │
│  Nav links                            │  (scrollable)           │  Upload controls                     │
│  Chat History                         │                         │  Processing pipeline                 │
│  New Chat btn                         │                         │  Chat messages                       │
│  Settings / Logout                    │                         │  Chat input                          │
│                                       │                         │                                      │
├───────────────────────────────────────┴─────────────────────────┴──────────────────────────────────────┤
│  [Piano Strip — full width, collapsible — 160px tall when expanded, 24px when collapsed]               │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│  [Audio Dock — full width, always visible — 68px tall]                                                  │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 CSS Grid Definition (conceptual — implement with Tailwind or CSS)

```css
.app-shell {
  display: grid;
  grid-template-columns: [left] var(--left-w) [center] 1fr [right] var(--right-w);
  grid-template-rows: [main] 1fr [piano] var(--piano-h) [dock] 68px;
  height: 100dvh;
  overflow: hidden;
}

/* Collapsed states */
--left-w:  264px;   /* collapsed: 0px (or 64px icon-only variant — see §4) */
--right-w: 360px;   /* collapsed: 0px */
--piano-h: 160px;   /* collapsed: 24px (just the drag handle) */
```

### 2.3 Panel Assignments

| Panel | Grid Area | Default State |
|-------|-----------|---------------|
| Left Sidebar | `left / main` (spans all rows) | Open |
| Center Sheet Viewer | `center / main` | Always visible |
| Right AI Chat Panel | `right / main` | Open |
| Piano Strip | `left+center+right / piano` | Open (160px) |
| Audio Dock | `left+center+right / dock` | Always visible, never collapsed |

---

## 3. Color System — Keep Existing

**Use the existing Tailwind/CSS color tokens from the current site exactly.** No new palette.

Key tokens to reuse (from existing `globals.css` / `tailwind.config`):

| Role | Current Token | Notes |
|------|--------------|-------|
| Primary gradient | `bg-gradient-primary` (purple→blue) | Used on CTAs, active states |
| Card surface | `bg-card/25` + `backdrop-blur-md` | Glassmorphism cards |
| Card border | `border/30` | Hairline borders |
| Glow effect | `shadow-glow` | Used on key elements |
| Background | existing dark bg | Keep |
| Text | existing text tokens | Keep |

The Studio layout panels should use the **same glassmorphism card style** as the existing components — `bg-card/25 backdrop-blur-md border border-white/10 rounded-xl`.

---

## 4. Left Sidebar — Collapsible

### 4.1 Content (same as existing `sidebar.tsx`)
- TrebleAI logo + wordmark at top
- Navigation links: Practice Studio, Theory Tutor, Music Library
- Contextual chat history list (scrollable)
- "New Chat" button
- Settings + Logout at bottom

### 4.2 Collapse Behavior
- **Trigger:** A toggle button at the top-right edge of the sidebar (a `«` / `»` chevron icon)
- **Collapsed state:** Sidebar slides to `width: 0` and is hidden entirely (not icon-only — full hide)
  - Alternatively: collapses to **64px icon-only rail** showing just nav icons with tooltips (preferred — mirrors the Studio mockup's icon rail)
- **Expanded state:** 264px (matches existing sidebar width)
- **Transition:** `transition: width 250ms ease-in-out` — smooth slide
- **Persistence:** Store preference in `localStorage` key `treble_sidebar_left` — remember state across page loads
- **Collapse button position:** Sticky at the top of the sidebar, not scrolling with history

### 4.3 Icon Rail (collapsed state — preferred variant)
When collapsed to 64px:
- Show only icon for each nav item (no labels)
- Show tooltip on hover with the label
- Show TrebleAI logo mark (icon only, no wordmark)
- Hide chat history
- Show a `»` chevron to re-expand

---

## 5. Right Panel (AI Chat) — Collapsible

### 5.1 Content
- Upload file strip at top (current `SheetMusicUploader` component repurposed as a compact strip)
- OMR pipeline progress (3-step: Upload → OMR → MIDI & Audio)
- AI Chat header (Treble avatar + name + online indicator)
- Chat message list (scrollable)
- Chat input + send button

### 5.2 Collapse Behavior
- **Trigger:** A `×` / `chat` icon button in the top-right corner of the panel header, OR a floating toggle button on the right edge of the center panel
- **Collapsed state:** Panel slides to `width: 0`, hidden entirely
- **Expanded state:** 360px
- **Transition:** `transition: width 250ms ease-in-out`
- **Persistence:** Store in `localStorage` key `treble_sidebar_right`
- **Re-open button:** When right panel is collapsed, show a small floating icon button on the far right edge of the center panel (pill or tab shape, like `💬 Chat`) to re-open it

### 5.3 Default
Open by default (first visit or no stored preference).

---

## 6. Piano Strip — Collapsible

### 6.1 Content
- Header bar (32px, always visible even when collapsed):
  - Label: "Piano Keyboard" (monospace, uppercase, small)
  - Active note badges: e.g. `E4`, `E5` (colored chips matching gradient accent)
  - "Next note" badge: dimmed chip
  - Toggle chevron `∧` / `∨` on the right
- Piano key visualization (SVG or CSS): 3 octaves visible by default, horizontally scrollable
- Active/highlighted keys rendered in the gradient accent color

### 6.2 Collapse Behavior
- **Expanded:** 160px total (32px header + 128px key area)
- **Collapsed:** 24px (just the header bar — keys hidden)
- **Transition:** `transition: height 200ms ease-in-out`
- **Persistence:** `localStorage` key `treble_piano_open`
- The header bar is **always visible** (it acts as the collapse handle)

### 6.3 Note Highlighting
Map current playback position from audio player to highlight the corresponding piano keys. Active notes use `bg-gradient-primary`. Upcoming notes use a dimmer tinted version.

---

## 7. Audio Dock — Always Visible

### 7.1 Position
Fixed at the very bottom of the screen. Full width. 68px tall. Never hidden.

### 7.2 Content (left to right)
1. **Track info** (140px): Piece title + composer/key label
2. **Transport controls** (center): ⏮ Rewind 8m | ⏪ | ▶/⏸ Play/Pause | ⏩ | ⏭ Forward 8m
3. **Waveform / progress bar**: Flex-grow, takes remaining space. Clickable to seek.
4. **Time display**: `1:08 / 3:22` (monospace)
5. **Loop toggle**: `LOOP M.1–8` toggle button
6. **Volume**: Volume icon + slider (72px)

### 7.3 Style
Use existing glassmorphism: `bg-card/40 backdrop-blur-lg border-t border-white/10`. Play button uses `bg-gradient-primary`. All controls use existing icon style.

---

## 8. Center Panel — Sheet Music Viewer

### 8.1 Panel Header (48px, sticky top)
- Left: "Score" label (mono, uppercase) + piece name + key/tempo metadata
- Right: Status badge (● Live / Processing) + difficulty badge + Export button

### 8.2 Sub-toolbar (34px)
- Current measure number (e.g. `M.1`)
- Loop range indicator (`⟳ Loop: M.1 → M.24`)
- Right: BPM, time signature, total measures

### 8.3 Body
- Scrollable vertically
- Renders the existing `SheetMusicViewer` component (or its OMR output)
- Background: slightly lighter than app bg (like a "paper" surface using the existing card glassmorphism)
- Sheet music content centered within the area

---

## 9. Layout Switcher

### 9.1 What It Does
Allows switching between:
- **Studio** (the new layout — default)
- **Classic** (the existing stacked single-column layout)

### 9.2 Placement
Add a **layout switcher control in the panel header / sub-toolbar area** of the center panel. Suggested position: the right side of the panel header bar, next to the Export button.

Visual: Two small icon buttons side by side (like VS Code's editor layout switcher):
- `⊞` (grid/columns icon) = Studio layout (active by default)
- `☰` (stacked rows icon) = Classic layout

Or alternatively: a small segmented control `[ Studio | Classic ]`.

### 9.3 Behavior
- Clicking switches the layout immediately with a smooth transition
- Preference stored in `localStorage` key `treble_layout` with values `"studio"` or `"classic"`
- **Default:** `"studio"` (new layout) for all users
- When on Classic layout, the existing Practice Studio page renders as-is (current scrolling stack of components)
- When on Studio layout, the new grid shell renders instead

### 9.4 Implementation Approach
In `frontend/app/practice-studio/page.tsx`:
- Read `treble_layout` from localStorage (default `"studio"`)
- Conditionally render:
  - `<StudioLayout>` — the new 3-panel grid shell (new component to create)
  - `<ClassicLayout>` — the existing page content (current implementation)
- The switcher UI is rendered in both layouts (always accessible)

---

## 10. Component Mapping (Existing → New)

| Existing Component | New Location in Studio Layout |
|-------------------|-------------------------------|
| `sidebar.tsx` | Left sidebar (collapsible, 264px → 64px icon rail) |
| `SheetMusicUploader` | Compact strip at top of right panel |
| `MusicPlayer` | Audio dock (bottom, full width) |
| `PianoKeyboard` | Piano strip (collapsible, above audio dock) |
| `SheetMusicViewer` | Center panel body |
| Score Analysis cards | Collapsed into the right panel below the pipeline, or accessible via a panel tab |
| `AIChat` | Right panel (below upload strip) |

> **Note on Score Analysis:** The 4 analysis cards (difficulty, key/diatonicity, harmony/cadences, fingering/rhythm) need a home in the Studio layout. Options:
> 1. Add them as a collapsible section inside the right panel below the chat (preferred — keeps center panel clean)
> 2. Add a tab switcher in the right panel header: `Chat | Analysis`

**Recommendation: Right panel tab switcher** — `[ Chat | Analysis ]` tabs in the panel header. Analysis tab shows the 4 cards. Chat tab is default.

---

## 11. Responsive Behavior

Studio layout targets **desktop only** (≥ 1280px wide). On smaller screens:
- Fall back to Classic layout automatically
- Show a banner: "Studio layout is available on wider screens"
- Store the auto-fallback separately from the user preference

---

## 12. New Files to Create

```
frontend/
  components/
    studio/
      StudioLayout.tsx          # Main grid shell
      StudioLeftSidebar.tsx     # Collapsible left panel (reuses sidebar.tsx logic)
      StudioRightPanel.tsx      # Collapsible right panel (chat + upload + analysis tabs)
      StudioPianoStrip.tsx      # Collapsible piano strip with header
      StudioAudioDock.tsx       # Always-visible audio dock
      StudioCenterPanel.tsx     # Sheet music viewer + header + sub-toolbar
      LayoutSwitcher.tsx        # The Studio ↔ Classic toggle control
  hooks/
    useLayoutPreference.ts      # localStorage hook for layout + panel states
```

---

## 13. Files to Modify

| File | Change |
|------|--------|
| `frontend/app/practice-studio/page.tsx` | Wrap existing content in `<ClassicLayout>`, add layout preference logic, render `<StudioLayout>` when preferred |
| `frontend/components/sidebar.tsx` | Extract to be reusable inside `StudioLeftSidebar` (or keep as-is and compose) |

**No changes to:** color tokens, Tailwind config, existing component logic, auth flow, API calls. Studio layout is a **shell-only** change — all data/state logic stays the same.

---

## 14. Interaction Details

### Keyboard Shortcuts (optional, nice-to-have)
- `Ctrl+\` — Toggle left sidebar
- `Ctrl+Shift+\` — Toggle right panel
- `Ctrl+P` — Toggle piano strip
- `Space` — Play/Pause audio

### Drag-to-resize (optional, Phase 2)
The right panel could be resizable via a drag handle on its left edge (min 280px, max 480px). Not required for initial implementation.

---

## 15. Summary of Decisions

| Decision | Choice |
|----------|--------|
| Default layout | Studio (3-column grid) |
| Fallback layout | Classic (existing stacked layout) |
| Color scheme | Existing purple/blue + glassmorphism — unchanged |
| Left sidebar collapsed | 64px icon-only rail |
| Right panel collapsed | 0px (fully hidden) with floating re-open button |
| Piano collapsed | 24px header-only strip |
| Audio dock | Always visible, 68px, full width |
| Layout switcher location | Center panel header, top-right area |
| State persistence | localStorage (layout, left sidebar, right panel, piano) |
| Right panel default | Open |
| Score Analysis location | Right panel, tab-switched with Chat |
| Responsive fallback | Classic layout below 1280px |

---

*Spec written: 2026-08-29*  
*Do not implement until instructed. Another session may be actively modifying the codebase.*
