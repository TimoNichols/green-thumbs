# Handoff: Green Thumbs (React Native + Expo)

Plant-care companion app. User photographs a plant → gets back species ID, a 2×2 care grid (water/light/soil/humidity), and an amber-toned AI diagnosis card if they flagged symptoms.

---

## About the design files

The HTML/JSX in this folder is a **design reference**, not production code. Everything was prototyped in React-on-the-web with hand-rolled SVG icons and CSS-in-JS — that's the wrong shape for React Native.

**Your job:** recreate these designs in **React Native + Expo** using its established patterns:
- `View` / `Text` / `Pressable` / `ScrollView` / `FlatList` instead of `<div>`
- `react-native-svg` for icons (the SVG paths in `app.jsx` translate 1:1 — just replace `<svg>` with `<Svg>` and `<path>` with `<Path>`, etc.)
- `expo-linear-gradient` for the CTA gradient
- `expo-camera` for the live viewfinder
- `expo-image-picker` for the gallery picker
- `expo-blur` for the tab bar's translucent backdrop
- React Navigation (bottom tabs + native stack) for routing

Use the `theme.js` file in this folder as-is.

## Fidelity

**High-fidelity.** Final colors, type, spacing, and interactions are all locked in. Recreate pixel-perfectly.

## How to view the design reference

Open `Green Thumbs.html` in a browser. It's a clickable prototype with all 7 screens in iOS frames laid out on a pannable canvas. Tap through the "Interactive flow" artboard to see real navigation between every screen.

There's also a Tweaks panel (toolbar toggle) that lets you swap a few values live: starting screen, symptom flag on/off, confidence %.

---

## Setup

```bash
npx create-expo-app green-thumbs --template
cd green-thumbs

# Fonts
npx expo install expo-font @expo-google-fonts/fraunces @expo-google-fonts/manrope @expo-google-fonts/jetbrains-mono

# Native bits the design needs
npx expo install expo-linear-gradient expo-camera expo-image-picker expo-blur expo-haptics react-native-svg

# Navigation
npm install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
npx expo install react-native-screens react-native-safe-area-context

# Gestures (for swipe-to-delete)
npx expo install react-native-gesture-handler react-native-reanimated
```

Drop `theme.js` from this folder into `src/theme.js` (or wherever your app keeps tokens). All values below come from it — don't re-type hexes.

---

## Information architecture

**Bottom tab bar** (5 slots):

| Slot | Tab | Screen | Notes |
|---|---|---|---|
| 1 | Home | `Home` | Daily glance |
| 2 | Plants | `MyPlants` | The hub. Has an internal Plants/Wishlist segmented control. |
| 3 | **Scan** | `Camera` (modal stack) | Raised circular CTA with leaf→pine gradient |
| 4 | Garden | `Garden` | Care calendar / reminders |
| 5 | You | `Profile` | Account + settings |

**Camera** and **Analyzing** are presented modally over the tab bar (no tabs visible). **Report** can be pushed onto either the Plants stack (when entered from history) or the modal stack (after a fresh scan).

The tab bar itself is **translucent over a fading-to-cream gradient**, NOT a solid bar. See "Tab bar" component spec below.

---

## Screens

### 1. Home
**Path:** `app/(tabs)/index.tsx`
**Purpose:** Calm landing page. Single dominant CTA, a glance at the most-recent scans, route to anywhere else via tabs.

**Layout (top→bottom):**
1. **Header row** — `paddingTop: 56` for status bar.
   - Left: greeting block — JetBrains Mono `meta` label (e.g. "FRIDAY · APR 27") above a Fraunces `h1` italic greeting (e.g. "*Good* morning")
   - Right: 40×40 circular avatar button (Pressable). Background `colors.bgSage`, border `colors.line`. Tapping pushes to Profile.
2. **Stats row** — three pills/cards in a row, each `bgRaise` with `line` border, `radii.xl`, `padding: 14`. Show count + JetBrains Mono uppercase label: "6 PLANTS" / "42 SCANS" / "89% HEALTHY".
3. **Primary CTA** — full-width 64-tall button.
   - Background: `LinearGradient(colors.gradients.cta)` (vertical, leaf→pine)
   - Shadow: `shadows.cta`
   - Inset top highlight: `borderTopColor: 'rgba(255,255,255,0.2)'`, `borderTopWidth: 1`
   - Content: row, `gap: 12` — scan icon (#FBFAF3, 22) + Manrope 16/700 "*Scan a plant*" + chevron right
4. **Next reminder card** — `bgRaise` card. Left rail leaf icon in `bgMint` 36×36 rounded square. Right column: serif italic plant name, mono "WATER · TODAY". Tapping pushes to Garden.
5. **Recent scans rail** — horizontal scroll, `gap: 12`, item width 110.
   - Each item: 110×140 striped placeholder (gradient `bgMint`/`bgSage` at 135°, `radii.xl`) with the first-word of the species name in JetBrains Mono 8pt across the top, centered. Below the placeholder: Fraunces 14 italic species name + JetBrains Mono 9 date.
   - Tapping an item navigates to `Report` for that plant.

**Background:** `colors.bg` (cream) throughout.

---

### 2. Camera
**Path:** `app/scan.tsx` (modal route)
**Purpose:** Capture a plant photo with optional symptom context BEFORE shooting (this is the key UX decision — context goes into the AI request).

**Layout:**
1. **Top bar** (over the camera feed) — 8px padding top, 20px sides. Left: 40×40 round translucent close button (rgba(255,255,255,0.12)). Right: 40×40 round flash toggle.
2. **Viewfinder area** — `flex: 1`. The actual `<CameraView>` from `expo-camera`. Overlay these in absolute-positioned `<View>`s on top:
   - **Rule-of-thirds grid** — two horizontal + two vertical white lines at 1/3 and 2/3, `opacity: 0.35`, `width/height: StyleSheet.hairlineWidth × 2`.
   - **Focus brackets** — 4 corner brackets, ~28px on each side, 2px white lines, positioned 60px from each viewfinder edge. Each bracket is just two `<View>`s forming an L.
3. **Symptom chip row** — horizontal `ScrollView`, padding 16/8, gap 8. Above the shutter.
   - Chips: `['None', 'Yellow edges', 'Brown tips', 'Drooping', 'Spots']`
   - Inactive: `rgba(255,255,255,0.10)` bg, white text
   - Active: cream (`#F4F1E8`) bg, forest text — **only one selected at a time**
   - Each chip: height 36, padding 0/14, `radii.pill`, Manrope 12.5/600
   - **Selected symptom must be passed to the next screen** as a param: `navigation.navigate('Analyzing', { symptom })`.
4. **Bottom controls row** — three columns, height 100.
   - Left: gallery picker icon (#F4F1E8, 22) — opens `expo-image-picker`
   - Center: **shutter button** — 84×84 outer ring (3px solid #F4F1E8 border, transparent interior, `padding: 4`), inner solid #F4F1E8 disc. On press: `expo-haptics` light impact + `Camera.takePictureAsync` + navigate to Analyzing.
   - Right: flip-camera icon (#F4F1E8, 22)

**Background:** `colors.bgDeep` (#0E1A12) — this is the ONLY screen with a dark surface.

---

### 3. Analyzing
**Path:** `app/analyzing.tsx` (modal route, no back button)
**Purpose:** Loading state for the 3-step AI pipeline. Animates step-by-step — feels deliberate, not techy.

**Layout:**
- Centered vertical stack, all on `colors.bg`.
- Top: 56-padding from status. JetBrains Mono "ANALYZING" label, then Fraunces 32 italic "*One* moment".
- Middle: 3-step list, each row 60 tall:
  1. "Identifying species" (with a small icon)
  2. "Checking care database"
  3. "Generating diagnosis"
- Each row has a **state**: idle (muted) → active (forest text + spinning ring on the icon) → done (leaf check icon, muted text). Step state advances every ~1.4s.
- Bottom: a thin progress bar (`bgMint` track, `leaf` fill) animating left-to-right across all 3 steps.
- After step 3 completes (~600ms), navigate to `Report` and replace the modal stack.

**Animation:** use Reanimated. Each row's state change should be a 200ms color/opacity tween.

---

### 4. Report
**Path:** `app/report/[plantId].tsx`
**Purpose:** The payoff. Species + confidence, full care grid, optional diagnosis card.

**Layout:**
1. **Header** — sticky at top with a `bg`-fading gradient behind it. 36×36 round back button (`bgRaise`, `line` border) on the left.
2. **Hero block** (padding 56/24/0):
   - JetBrains Mono "SPECIES IDENTIFIED" label
   - Fraunces 32 italic species binomial: "*Monstera* deliciosa" — italicize ONLY the genus, not the species epithet
   - Manrope 14 mute common name beneath
   - Pill row: `[88% confidence]` (sage pill) + `[Easy / Moderate / Hard]` difficulty pill
3. **Care grid** — 2×2, `gap: 8`, `padding: 0/12`. Each tile:
   - `bgRaise`, `radii['2xl']`, padding 18/16, aspect 1
   - Top: 32×32 rounded square in `bgSage` containing the icon (drop / sun / soil / humid)
   - Bottom (after 16px): JetBrains Mono uppercase label ("WATER" / "LIGHT" / "SOIL" / "HUMIDITY") + Fraunces serif primary value (e.g. "Weekly", "Bright indirect", "Well-draining", "60–70%") on the next line
4. **Diagnosis card** — RENDER ONLY when `symptoms` is set and not "None". Wholly different visual treatment to signal "this is Claude reasoning, not a database lookup":
   - Background: `colors.amberSoft`
   - Border: 1px `colors.amberLine`
   - `radii['2xl']`, padding 18/20, margin 16/12
   - Top row: alert triangle icon (`colors.amber`) + small uppercased label "DIAGNOSIS" in JetBrains Mono `colors.amberDeep`
   - Title: Fraunces 22 italic in `amberDeep` — e.g. "*Likely* underwatering"
   - Body: Manrope 13.5/`amberDeep`, 1.5 line-height — 2-3 sentences explaining what's probably wrong + recommended action
   - Footer chip: "REASONING · symptom: yellow edges" in JetBrains Mono 10/`amberDeep` opacity 0.7
5. **Health tips list** — header "Health tips" (Fraunces 20 italic). 3-4 list rows, each with a `colors.leaf` `Ico.check` and Manrope 13.5 body text.

**Background:** `colors.bg`.

---

### 5. MyPlants (Plants tab — the hub)
**Path:** `app/(tabs)/plants.tsx`
**Purpose:** History of every scan + a wishlist + manual add. Three jobs in one screen via a top segmented control.

**State variables needed:**
- `tab: 'plants' | 'wishlist'` (default 'plants')
- `items: PlantRow[]` (the scan history)
- `wishlist: WishRow[]`
- `filter: 'All' | 'Healthy' | 'Flagged'` (Plants only)
- `showAdd: boolean`
- `addTarget: 'plants' | 'wishlist'`
- `swipedId: string | null`

**Layout:**
1. **Header row** (padding 56/24/8):
   - Left column: JetBrains Mono dynamic count label + Fraunces 32 italic title — "*My* plants" or "*Wish*list" depending on tab
   - Right: two buttons in a row, gap 8 — `[+]` (`bgRaise`, opens AddManually sheet) and `[scan icon]` (leaf bg, opens Camera)
2. **Plants/Wishlist segmented control** — full width, `bgRaise` container with `line` border, padding 4, `radii.xl`. Two equal pills inside; active pill has solid `colors.text` bg + cream label. Each shows label + tiny mono count.
3. **Filter chips** (Plants tab only) — small mint chips: "All" / "Healthy" / "Flagged". Active = `bgMint` with `pine` text, inactive = transparent with `textMute`.
4. **List** — each row is a `Pressable` with **swipe-to-delete** (use Reanimated + GestureHandler):
   - Underlay: red `colors.danger` background with a centered trash icon + "Delete" / "Remove" label, exposed when swiping left up to 92px
   - Foreground row (`bgRaise`, `line` border, `radii.xl`, padding 12/14, height ~76):
     - Plants rows: 56×56 striped placeholder, italic species, mute common name, mono date, status chip (Healthy / [symptom name] / Manual)
     - Wishlist rows: 56×56 sage tile with a bookmark icon, italic name, common name, priority pill, optional italic note, and a small **GOT IT** button on the right that promotes the row into the plants list
   - Tapping a Plants row navigates to `Report/[id]` (UNLESS it's a manual entry, which has no AI report — disable that nav)
5. **Empty states** — when filtered list is empty, render a centered card on `bgRaise` with a leaf icon, italic title, body copy, and a CTA button that opens AddManually with the right target.

#### AddManually bottom sheet
**Component:** `<AddManuallySheet>`
**Purpose:** Add a plant without scanning. The whole point of this feature is to **avoid an AI query** when the user already knows what they have.

Use `@gorhom/bottom-sheet` or `react-native-bottom-sheet` — animate up from the bottom over a 45%-opacity scrim.

Fields, in order:
1. **Where to save** — segmented control, two options: "My plants" / "Wishlist". Defaults to whichever tab the user was on.
2. **Plant name** (required) — Fraunces italic input, 48 tall, `bgRaise`, focus border `leaf`. Placeholder: "e.g. Monstera deliciosa"
3. **Common name** (optional) — Manrope input, same dimensions. Placeholder: "e.g. Swiss cheese plant"
4. **If target = My plants:**
   - "What you know" — two rows of selectable chips
     - Water: `[Water —] [Low water] [Med water] [High water]` (— is the unset state)
     - Light: `[Light —] [Low light] [Bright indirect] [Direct sun]`
   - **Info banner** — sage tint, leaf icon + copy: "Adding what you already know means we won't query the AI for this plant unless you ask for a diagnosis later."
5. **If target = Wishlist:**
   - Priority — three equal-width pills: Low / Medium / High (active = solid forest)
   - Note (optional) — text input

**Footer:** "Cancel" (transparent + line border) on left, "Add to my plants" / "Add to wishlist" (CTA gradient) on right (2:1 width ratio).

Submitting prepends to the right list and closes the sheet. Manual entries get `manual: true` so the list row shows the gray "Manual" pill instead of a Healthy/symptom badge.

---

### 6. Garden
**Path:** `app/(tabs)/garden.tsx`
**Purpose:** Per-plant care reminders. Calendar-ish.

**Layout:**
1. Header (56 top): JetBrains Mono "APRIL · WEEK 17" + Fraunces 32 italic "*The* garden"
2. **Week strip card** — `bgRaise` rounded card, 14 padding. 7-column grid, equal width.
   - Each cell: column with mono day initial (M/T/W/T/F/S/S), serif day-of-month number, and a tiny dot (`leaf`) if there are tasks that day
   - Today's cell: solid `colors.text` bg, cream foreground
3. **Today's tasks** — Fraunces 20 italic header "*Today*". List of task rows:
   - Each: `bgRaise` `radii.xl`, padding 12/14
   - Left: 36×36 `bgMint` rounded tile with task-type icon (drop / leaf / etc.)
   - Middle: serif italic plant name + Manrope 12.5 task description ("Water" / "Mist leaves" / "Rotate" / "Repot")
   - Right: a tiny circle checkbox — tap to mark done (haptic + line-through animation)
   - **Overdue tasks** get amber pill treatment — `amberSoft` bg + amber text (only the high-priority "due today" item)
4. **Upcoming** — collapsed sections grouped by day below

---

### 7. Profile / You
**Path:** `app/(tabs)/profile.tsx`
**Purpose:** Account, stats, settings. Real screen — not a placeholder.

**Layout:**
1. Header: 56 top, JetBrains Mono "PROFILE", Fraunces 32 italic "*Your* garden"
2. **Avatar block** — centered, vertical stack:
   - 96×96 round avatar in `bgSage` with serif initials "RH" (Fraunces 36)
   - Manrope 18/600 "Riley Hayes"
   - Manrope 13 mute "riley@example.com"
3. **Stats row** — 3 cards, equal width: "42 SCANS" / "6 PLANTS" / "89% HEALTHY". Same look as Home stats.
4. **Achievement strip** — horizontal `gap: 8`, 4 small badges (trophy icon, mono label, sage tile)
5. **Settings list** — `bgRaise` card containing rows separated by `lineSoft` hairlines:
   - Reminders (with right-side toggle, On)
   - Watering schedule
   - Share garden
   - Edit profile
   - App settings
   - Sign out (red text)
   - Each row: 32×32 `bgSage` icon tile + label + chevron / value. Padding 14/14.

---

## Reusable components to extract

| Component | Where used |
|---|---|
| `<Pill kind="default|leaf|amber|sage">` | Confidence, difficulty, symptom flag, priority |
| `<CareTile icon label value>` | 2×2 care grid on Report |
| `<DiagnosisCard symptom title body>` | Amber card on Report — keep visually isolated, this is THE warning surface |
| `<SymptomChips value onChange>` | Single-select chip row on Camera |
| `<PlantRow item swipable onPress>` | Both Plants and Wishlist lists |
| `<TabBar active onChange>` | Bottom tab — translucent with raised center button |
| `<EmptyState icon title body cta onCta>` | Empty Plants and empty Wishlist |
| `<AddManuallySheet defaultTarget onSubmit onClose>` | Bottom sheet from Plants header |
| `<SegmentedControl options value onChange>` | Plants/Wishlist switch + AddManually destination |

---

## Interactions & behavior

### Swipe-to-delete (Plants + Wishlist rows)
- PanGestureHandler on the row, follows finger left up to -100px
- On release: if `dx < -50`, snap to -92px and reveal the destructive button. Otherwise spring back to 0.
- Tapping outside the swiped row, or scrolling, snaps it back.
- Track only ONE swiped row at a time (`swipedId` state).

### Wishlist → Plants promotion
The "GOT IT" button removes the wish row and prepends a new plant entry to `items` with `date: 'Just added'` and `manual: true`. Auto-switches the tab to Plants so the user sees the new entry.

### Symptom-driven diagnosis
The Camera's selected symptom passes through Analyzing → Report as a route param. On Report:
```ts
const showDiagnosis = symptom && symptom !== 'None';
```
The diagnosis card only renders when `showDiagnosis` is true. The card's title and body should pick from a small lookup table keyed by symptom (so this works without an actual AI call in dev).

### Confidence display
Render as `${confidence}%` inside a sage Pill. Hide the badge when `confidence == null` (manual entries).

### Tab bar transitions
Active tab icon + label color changes from `textMute` → `pine`. No background pill behind the active tab — keep it subtle. The center scan button is always the gradient circle, regardless of active tab.

### Animations
- Bottom sheet open: 280ms cubic-bezier(0.2, 0.9, 0.25, 1) translateY from 100% → 0
- Sheet scrim fade: 220ms linear
- Analyzing row activation: 200ms color/opacity tween
- All Pressable's: 100ms opacity 1 → 0.7 on press

---

## Component patterns called out for build

### The 2×2 care grid
```tsx
<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12 }}>
  {[
    { icon: 'drop',  label: 'WATER',    value: 'Weekly' },
    { icon: 'sun',   label: 'LIGHT',    value: 'Bright indirect' },
    { icon: 'soil',  label: 'SOIL',     value: 'Well-draining' },
    { icon: 'humid', label: 'HUMIDITY', value: '60–70%' },
  ].map(c => <CareTile key={c.label} {...c} />)}
</View>
```
Each tile is `width: '48%'` (or use `flexBasis`), `aspectRatio: 1`, `bgRaise`, padding 18/16, `radii['2xl']`. Icon tile is 32×32 `bgSage` rounded square top-left. Then a vertical stack: mono label, serif value.

### The diagnosis card
Visually isolated from the care grid:
- Different background (`amberSoft` not `bgRaise`)
- Different border (`amberLine` not `line`)
- Different text color (`amberDeep` not `text`)
- Always preceded by 24+ px of vertical space
- Has its own "REASONING" footer chip — this is what tells the user "this is AI reasoning, not a database lookup"

### The symptom chip row (Camera)
- Single-select. Default value: `'None'`.
- Layout: horizontal `ScrollView` with `contentContainerStyle: { gap: 8, paddingHorizontal: 16 }`
- Each chip is `Pressable`, height 36, `radii.pill`, padding 0/14
- Inactive bg `rgba(255,255,255,0.10)` / white text 12.5/600
- Active bg `#F4F1E8` / forest text
- **Crucial:** chips are selected BEFORE shooting. Pass the value as a route param to Analyzing → Report.

### The bottom tab bar
- `position: 'absolute', left: 12, right: 12, bottom: 24`
- Container: 64 tall, `radii['3xl']`, `BlurView intensity={20}` from `expo-blur`
- Background tint: `rgba(255,255,255,0.85)`
- Border 1px `colors.line`, `shadows.bar`
- 5 columns with the center column rendering the raised gradient button (50×50, `marginTop: -16`, `radii.pill`)
- Above the tab bar, render a `LinearGradient` from `transparent` → `bg` (gradients.cream) so scrolling content fades behind it instead of hard-cutting

---

## Design tokens

All values live in `theme.js` in this folder — copy it in, don't re-type. Quick reference:

**Colors:** cream `#F4F1E8` bg / forest `#1F3A28` text / leaf `#5C8A5C` CTA / amber `#B8842E` diagnosis only

**Type pairing:** Fraunces (display, often italic) + Manrope (UI) + JetBrains Mono (small labels, uppercased)

**Radii:** chip 999 / md 10 / lg 12 / xl 14 (cards) / 2xl 18 (care tiles) / sheet 24

**Spacing:** 4-pt scale, screen horizontal padding is 24

---

## Assets

There are **no real images yet** — the prototype uses CSS-stripe placeholders for plant photos. You'll need to:
- Wire up `expo-camera` for the live viewfinder
- Wire up `expo-image-picker` for the gallery option
- Use stored `uri`s for actual scan history images, with a striped `bgMint`/`bgSage` placeholder as the loading/empty fallback (the design relies on this fallback — keep it)

Icons are all simple line strokes — replicate with `react-native-svg` from the SVG paths in `app.jsx` (search for `Ico = {`).

---

## Files

- `Green Thumbs.html` — the live prototype. Open in a browser to click through.
- `app.jsx` — all React components for the prototype. Source of truth for SVG paths, exact pixel values, copy strings.
- `theme.js` — drop-in tokens for your Expo app.
- `design-canvas.jsx` / `ios-frame.jsx` / `tweaks-panel.jsx` — prototype harness only. **Do not port these.**
