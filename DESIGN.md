---
name: Markhall
description: A Class 9–10 revision desk for all boards, built like an exam-hall seating plan.
colors:
  stamp-blue: '#1E3A5F'
  stamp-blue-deep: '#15293F'
  exam-paper: '#E8E1CF'
  paper-light: '#F7F3E7'
  paper-deep: '#DDD3BC'
  examiner-red: '#B23A2F'
  examiner-red-deep: '#86251D'
  red-soft: '#F0DDD8'
  pencil-grey: '#5F5B50'
  field-paper: '#FFFDF6'
typography:
  display:
    fontFamily: 'Oswald, Bahnschrift Condensed, Arial Narrow, Segoe UI, sans-serif'
    fontSize: '2rem'
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: '0.08em'
  headline:
    fontFamily: 'Segoe UI, Helvetica Neue, Arial, sans-serif'
    fontSize: '1.35rem'
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: '-0.015em'
  body:
    fontFamily: 'Segoe UI, Helvetica Neue, Arial, sans-serif'
    fontSize: '0.9rem'
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: '0'
  label:
    fontFamily: 'Oswald, Bahnschrift Condensed, Arial Narrow, Segoe UI, sans-serif'
    fontSize: '0.7rem'
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: '0.12em'
rounded:
  none: '0'
spacing:
  xs: '6px'
  sm: '10px'
  md: '18px'
  lg: '28px'
  xl: '36px'
components:
  button-primary:
    backgroundColor: '{colors.stamp-blue}'
    textColor: '{colors.paper-light}'
    rounded: '{rounded.none}'
    padding: '12px 20px'
    height: '50px'
  button-primary-hover:
    backgroundColor: '{colors.stamp-blue-deep}'
  button-quiet:
    backgroundColor: 'transparent'
    textColor: '{colors.stamp-blue}'
    rounded: '{rounded.none}'
    padding: '10px 16px'
    height: '42px'
  input:
    backgroundColor: '{colors.field-paper}'
    textColor: '{colors.stamp-blue}'
    rounded: '{rounded.none}'
    padding: '10px 12px'
    height: '44px'
  seat-cell:
    backgroundColor: '{colors.paper-light}'
    textColor: '{colors.stamp-blue}'
    rounded: '{rounded.none}'
    padding: '12px 13px'
  sample-chip:
    backgroundColor: 'transparent'
    textColor: '{colors.pencil-grey}'
    rounded: '{rounded.none}'
    padding: '2px 7px'
---

# Design System: Markhall

## Overview

**Creative North Star: "The Exam-Hall Seating Plan"**

Markhall treats the syllabus as a room with numbered seats. Every chapter has a place on the plan, every completed session stamps that place present, and every weak chapter keeps a red margin mark until it is revised. The world is drawn from exam-hall notices: buff paper, stamp ink, stencil numerals, registration corners, and the quiet authority of a roll-call sheet. It is a revision desk for any Class 9–10 board, not a notice for one board; navigation, controls, and reading order stay standard for a web product.

The brand line is **"Every chapter has a seat."** — **"Every chapter has a seat. Every answer earns its mark."** extends it when a longer line is needed. Keep it in marketing copy and empty states, not as a competing label beside the next action.

The surface is dense but calm. Hard 1px rules and flat paper grounds carry most of the structure, while one committed ink field marks the next seat and gives the screen its focal weight. Red is held back for marks lost, weak seats, and examiner corrections. Purple prose has no place here; the copy is direct, board-neutral, and names the next action.

**Key Characteristics:**
- Buff paper ground with fine ruled lines and flat, unrounded panels.
- One committed stamp-blue field per screen, reserved for the current seat or primary action.
- Condensed stencil numerals for seats, counts, marks, and timers; humanist sans for all reading text.
- Red only as an examiner's signal, never as decoration.
- Rubber-stamp completion marks and a persistent red margin on weak seats.
- One brand mark and wordmark, independent of any board's identity.

## Brand Mark

The Markhall mark is a square seat cell containing a 2×2 seating plan. Three seats are drawn in outline; the bottom-right seat is solid ink and carries a paper-light check cutout. The check is the mark earned, and the filled seat is the chapter a student can hold. It is a seating plan completing itself, not a generic tick.

- **Construction:** A 64-unit square. Outer rule at 3 units. Three 13-unit seat outlines at 32%, 55%, and 55% opacity. A 14-unit solid seat at the bottom-right with a 3-unit checked cutout.
- **Wordmark:** "MARKHALL" in Oswald 700, tracked uppercase, set beside the mark with a 10px gap. The mark is 30px in the top bar and 26px below 760px.
- **On paper:** Stamp-blue mark with a paper-light cutout. **On ink:** Paper-light mark with an ink cutout.
- **Favicon:** A stamp-blue square tile with the same seat grid in paper-light, at `src/app/icon.svg`.
- **Assets:** `public/brand/markhall-mark.svg`, `markhall-mark-inverse.svg`, and `markhall-logo.svg`.
- **Rules:** The mark never rotates, gains a shadow, or uses examiner red. The check is part of the mark, not a separate success icon. The wordmark is always one word, capital M, no space.

## Colors

The palette is the color of an exam hall: buff paper, blue-black stamp ink, examiner red, and a dark pencil grey.

### Primary
- **Stamp Blue** (#1E3A5F): The working ink. Primary buttons, active navigation, the current-seat field, stamped completion, progress fills, and headings.
- **Deep Stamp Blue** (#15293F): Hover and pressed state for primary actions; the darkest structural ink.

### Secondary
- **Examiner Red** (#B23A2F): Weak seats, marks lost, error borders, and the examiner margin. Never used for decoration, emphasis, or brand personality.
- **Deep Examiner Red** (#86251D): Red text on paper or tinted grounds, and the timer when time has expired.
- **Red Soft** (#F0DDD8): The ground for a weak seat, an error callout, or a paused-session banner.

### Neutral
- **Exam Paper** (#E8E1CF): The page ground, with a 1px ruled texture every 32px.
- **Paper Light** (#F7F3E7): Raised working surfaces: cards, the top bar, the right rail, and unstamped seat cells.
- **Paper Deep** (#DDD3BC): Active navigation, selected options, and secondary inset panels.
- **Pencil Grey** (#5F5B50): Secondary text, labels, rules, and disabled navigation. The value is darkened from the original pencil grey to hold 5.2:1 on exam paper.
- **Field Paper** (#FFFDF6): Input and textarea grounds.

### Named Rules
**The Red Margin Rule.** Examiner red appears only where marks were lost, a seat is weak, or the system is reporting an error. It is never a decorative accent.

**The One Ink Field Rule.** Each screen gets at most one large stamp-blue field. It belongs to the next seat or the primary action, never to both competing for attention.

## Typography

**Display Font:** Oswald (self-hosted; with Bahnschrift Condensed, Arial Narrow, Segoe UI, sans-serif)
**Body Font:** Segoe UI (with Helvetica Neue, Arial, sans-serif)
**Label Font:** Oswald, tracked and uppercase

**Character:** The condensed numerals are the room's stencilled seat labels; the humanist sans is the invigilator's working voice. The pairing should feel institutional without feeling cold.

### Hierarchy
- **Display** (700, 1.3–2.2rem, 1.1): Wordmark, seat numbers, roll-call totals, marks, timers, and large scores. Always condensed and tabular.
- **Headline** (700, 1.35–2.25rem, 1.15): Page headings and the current seat name.
- **Title** (600–700, 0.9–1.1rem, 1.3): Seat names, subject names, and card titles.
- **Body** (400, 0.82–0.96rem, 1.5): Reading text, feedback notes, and form copy. Measures stay under 72ch.
- **Label** (700, 0.62–0.78rem, 0.08–0.16em, uppercase): Rail headings, field labels, state labels, and stamp text.

### Named Rules
**The Stencil Numerals Rule.** Condensed, tracked numerals belong to seat numbers, counts, marks, and the clock. Never set a paragraph, sentence, or button label in the condensed face.

**The Tabular Marks Rule.** Any figure that can change—marks, coverage, counts—uses tabular numerals so the column does not jump.

## Layout

The desktop shell is a three-column grid: a 220px navigation rail, a fluid main column, and a 320px right rail. The infrastructure screens (setup, practice, summary) drop the right rail and center a 1000–1040px working column. Density changes at 1180px, 980px, and 760px; below 760px the shell collapses to a single column, the side rail is replaced by a fixed four-item bottom bar, and the right rail follows the seating plan as a stacked set of sections.

The sticky top bar carries the wordmark, the selected class and board, and the syllabus coverage percentage. The board and class line stays plain: `Class 10 · CBSE`, `Class 9 · ICSE / CISCE`, `Class 10 · All boards`. Do not dress a board name as an official crest or claim affiliation.

The seating plan is the spatial signature: subject blocks stack vertically, each with a heading rule and a responsive grid of seat cells at `repeat(auto-fill, minmax(152px, 1fr))`. Cells keep a consistent minimum height so the grid reads as rows of seats, not as cards of varying weight. Spacing follows a 6 / 10 / 18 / 28 / 36px rhythm; space above a heading always exceeds the space below it. The top bar is sticky at 72px on desktop and 64px on mobile.

## Elevation & Depth

The system is flat by default. Depth is tonal, delivered through the paper-light, paper, and paper-deep grounds, and through 1px rules rather than shadows. The seat grid gains depth only on hover, with a soft offset shadow and a 2px lift. The current seat is signaled by a 2px outline, not a glow. Rubber stamps and registration corners are printed flat on the paper.

### Shadow Vocabulary
- **Hover lift** (`0 8px 20px rgba(30, 58, 95, 0.1)`): Seat cells and primary buttons on hover only.

### Named Rules
**The Paper Flat Rule.** Surfaces are flat at rest. A shadow is a state response, never a default container treatment.

## Shapes

Every surface is square. There are no rounded cards, pills, or capsules. Borders are 1px in stamp blue at 22–45% opacity; structural rules are solid ink. The corner language comes from print registration marks: short 1px L-shaped brackets at the top-left and bottom-right of the question card and the current-seat field. The completion stamp is a double-ruled rectangle, rotated 6–11 degrees, with tracked condensed capitals. Weak seats carry a 1px red margin line at the left edge. Buttons and inputs use the same square geometry.

## Components

### Wordmark
- **Lockup:** The seat-grid mark at 30px, a 10px gap, then "MARKHALL" in Oswald 700, 1.35rem, 0.1em tracking.
- **Tone:** Stamp-blue ink on paper; paper-light on the ink field. The cutout check flips with the tone.
- **Behavior:** The wordmark is a link to the landing page on marketing/auth surfaces and a button to the dashboard in the app shell. Hover drops the lockup to 78% opacity; no colour change.

### Buttons
- **Shape:** Square (0 radius), 42px default height and 50px large.
- **Primary:** Stamp blue ground, paper-light text, 12px 20px padding, with an optional right-side meta label separated by a 1px rule.
- **Hover / Focus:** Deep stamp blue on hover with a 1px lift; 2px stamp-blue focus ring with 3px offset. On the ink field, the focus ring flips to paper-light.
- **Quiet:** Transparent ground, 1px rule-strong border, stamp-blue text; a pale ink wash on hover.

### Chips
- **Sample chip:** Transparent ground, 1px rule-strong border, pencil-grey tracked capitals. Used only to mark synthetic or sample content.
- **State:** Static labels, not filters; they never carry a hover or selected state.

### Cards / Containers
- **Corner Style:** Square.
- **Background:** Paper light for working cards; exam paper for inset panels.
- **Shadow Strategy:** Flat at rest; hover lift only on interactive seats and buttons.
- **Border:** 1px rule, with a solid ink rule for section heads and question cards.
- **Internal Padding:** 18–32px depending on density.

### Inputs / Fields
- **Style:** Field-paper ground, 1px rule-strong border, square corners, 44px minimum height; textareas start at 190px.
- **Focus:** 2px stamp-blue outline with a 1px offset.
- **Error:** Red-soft ground with a 1px examiner-red border in the inline error callout.

### Board / Class Selector
- **Shape:** Two square selects in a 2-column row, using the standard input style. They stack at 760px.
- **Content:** Boards are written plainly: `All boards`, `CBSE`, `ICSE / CISCE`, `State board`, `IB / IGCSE`, `Other board`. Classes are `Class 9` and `Class 10`.
- **Behavior:** The choice sets the session label and is stored locally with the student's roll. The sample question set is shared across boards; say so in the setup note and keep the `Sample data` chip visible.

### Coverage Indicator
- **Shape:** A labelled percentage in the top bar: `Syllabus coverage 42%`.
- **Type:** Pencil-grey label, stamp-blue condensed value, tabular numerals.
- **Behavior:** Coverage is calculated from stamped seats only. It replaces countdowns or invented exam dates; do not show a board exam date unless one is supplied and verified.

### Navigation
- **Desktop:** A left rail of full-width text buttons separated by 1px rules; active state uses the paper-deep ground and bold ink. Disabled items carry a tracked "Soon" label and reduced contrast.
- **Mobile:** A fixed bottom bar with four equal items, a 1px top rule, and a 2px inset ink line on the active item.
- No numeric prefixes or icon tiles in navigation.

### Seat Cell (signature)
- **Shape:** Square, 1px rule, 94px minimum height, 12–13px padding.
- **Content:** Condensed seat number at top-right, chapter name limited to two lines, state label at bottom.
- **States:** Not started (paper light), in progress (dashed rule, paper ground), present (tonal paper plus rotated "PRESENT" stamp), weak (red-soft ground, red state label, 1px red margin), current (2px stamp-blue outline and "Start here").
- **Behavior:** The entire cell is a button; the state is always written in text, never carried by color alone.

### Roll-Call Strip
- **Shape:** 1px-ruled paper-light panel with a total at the right and a responsive grid of subject coverage rows.
- **Data:** Each row pairs the subject code, name, present/total count, and a 3px coverage bar. The bar always has an accessible progressbar role.

### Examiner Feedback
- **Shape:** A 2px ink top rule, a score block at the right, a paper-ground note with a 1px red margin, and an ordered list of marking points.
- **Behavior:** Feedback enters after a short checking state and is announced politely. Test-mode sessions hold marks until the summary.

## Do's and Don'ts

### Do:
- **Do** keep one large stamp-blue field per screen and let the rest of the paper breathe.
- **Do** use condensed numerals for every seat number, count, mark, and timer.
- **Do** write state in text as well as color; "Weak seat" is a label, not just a red ground.
- **Do** keep controls square, bordered, and visibly focusable.
- **Do** label synthetic questions, scores, and sample papers as sample content.
- **Do** keep the product board-neutral and let the student choose the board and class.
- **Do** say "not affiliated with any examination board" where legal or trust copy appears.

### Don't:
- **Don't** add kickers or eyebrow labels above headings; let the heading carry the hierarchy.
- **Don't** introduce rounded cards, pills, or soft-shadowed generic dashboard tiles.
- **Don't** use examiner red as decoration or brand accent; it means lost marks or a weak seat.
- **Don't** number navigation items; seat numbers belong to the plan, not the menu.
- **Don't** add streaks, leaderboards, mascots, or invented performance claims.
- **Don't** imply official board affiliation, board-specific syllabi, or examined content that does not exist.
- **Don't** use gradients, glass, Unicode glyph icons, or hard offset shadows.
- **Don't** make the screen read as a literal exam notice or answer booklet; the world supplies type, palette, density, and the seating-plan move only.
