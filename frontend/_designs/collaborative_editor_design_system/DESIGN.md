---
name: Collaborative Editor Design System
colors:
  surface: '#13121b'
  surface-dim: '#13121b'
  surface-bright: '#393842'
  surface-container-lowest: '#0e0d16'
  surface-container-low: '#1b1b24'
  surface-container: '#1f1f28'
  surface-container-high: '#2a2933'
  surface-container-highest: '#35343e'
  on-surface: '#e4e1ee'
  on-surface-variant: '#c7c4d8'
  inverse-surface: '#e4e1ee'
  inverse-on-surface: '#302f39'
  outline: '#918fa1'
  outline-variant: '#464555'
  surface-tint: '#c3c0ff'
  primary: '#c3c0ff'
  on-primary: '#1d00a5'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#4d44e3'
  secondary: '#c2c6d2'
  on-secondary: '#2c313a'
  secondary-container: '#444953'
  on-secondary-container: '#b4b8c4'
  tertiary: '#ffb695'
  on-tertiary: '#571f00'
  tertiary-container: '#a44100'
  on-tertiary-container: '#ffd2be'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#dee2ee'
  secondary-fixed-dim: '#c2c6d2'
  on-secondary-fixed: '#171c24'
  on-secondary-fixed-variant: '#424750'
  tertiary-fixed: '#ffdbcc'
  tertiary-fixed-dim: '#ffb695'
  on-tertiary-fixed: '#351000'
  on-tertiary-fixed-variant: '#7b2f00'
  background: '#13121b'
  on-background: '#e4e1ee'
  surface-variant: '#35343e'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: '1.6'
  label-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.01em
  code-editor:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.7'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  gutter: 16px
  editor-padding: 32px
---

## Brand & Style
The brand personality is anchored in deep focus, technical precision, and a "zen-like" professional environment. The design system prioritizes a high-contrast reading experience while maintaining a soft, non-fatiguing visual hierarchy for long-duration work sessions. 

The style is **Modern Minimalism** with a focus on tonal layering. It avoids flashy gradients or aggressive skeuomorphism in favor of structural clarity, crisp borders, and purposeful motion. This design system is intended to feel like a high-end physical tool—utilitarian, reliable, and sophisticated.

## Colors
The palette is a strictly controlled monochromatic scale designed to reduce eye strain. The core is built on a "Ink and Ash" foundation:
- **Primary Contrast:** The interface uses high-contrast text (#E6EAF0) against deep ink backgrounds to ensure legibility.
- **Surface Hierarchy:** Depth is communicated through color, not just shadows. The application moves from the deepest base (#0F1115) to the editor core (#1A1D23) and finally to interactive elevated elements (#22262E).
- **Functional Accents:** While primarily monochromatic, a vibrant Indigo (#4F46E5) is reserved for active states, primary actions, and cursor indicators to provide immediate visual feedback without cluttering the aesthetic.

## Typography
This design system employs a dual-font strategy to separate the "UI Workspace" from the "Content Output":
- **UI Interface (Inter):** Used for all navigation, menus, and meta-information. It is set with tighter letter-spacing in headlines to maintain a modern, compact feel.
- **Editor Core (JetBrains Mono):** Used exclusively within the editor surface. The increased line height (1.7) is critical for code legibility and collaborative markers.
- **Visual Weight:** Use the `text_secondary` color for labels and `text_muted` for comments within the editor to create a clear information hierarchy where the user's focus remains on the primary content.

## Layout & Spacing
The layout follows a **Fluid Sidebar / Fixed Editor** model. 
- **The Sidebar:** Occupies a flexible width (240px-320px) using the `background_app` color to frame the workspace.
- **The Editor Surface:** A centered container or full-bleed panel using `surface_editor`. It utilizes generous internal padding (32px) to provide "white space" that prevents the text from feeling cramped against UI borders.
- **Rhythm:** An 8px linear scale is used for all component spacing, ensuring vertical rhythm is maintained across multi-line comments and nested list items.

## Elevation & Depth
In this design system, depth is primarily communicated through **Tonal Layering** rather than heavy shadows. 
- **Level 0 (Base):** Navigation and background (#0F1115).
- **Level 1 (Surface):** The primary work area (#1A1D23).
- **Level 2 (Elevated):** Modals, tooltips, and floating menus (#22262E). 
- **Outlines:** To maintain a high-contrast but soft feel, every elevated element must have a 1px solid border (#2A2F38). This provides "hard" definition that prevents dark surfaces from bleeding into one another on different monitor calibrations.
- **Shadows:** Use a single, ultra-diffused shadow for Level 2 elements: `0px 8px 24px rgba(0, 0, 0, 0.5)`.

## Shapes
The shape language is defined by a consistent **12px (0.75rem)** radius. This specific curvature strikes a balance between the clinical feel of sharp corners and the overly casual nature of pill-shaped buttons.
- **Primary Components:** Buttons, Input fields, and Cards use the 12px standard.
- **Nested Elements:** Small tags or checkboxes should scale down to 6px.
- **Container Level:** Large layout panels or modals use 16px to emphasize their role as structural anchors.

## Components
- **Buttons:** Primary buttons use the Indigo accent with `text_primary`. Secondary buttons use `surface_elevated` with a border. All buttons have a height of 40px and a 12px radius.
- **Input Fields:** Use `background_app` for the fill to create a "hollow" look against the `surface_editor`. The border should brighten to `text_muted` on focus.
- **Chips/Badges:** Use a subtle background (#2A2F38) with `text_secondary`. These are essential for showing collaborators or file tags.
- **The Editor Gutter:** Line numbers in JetBrains Mono, colored in `text_muted`. The active line should have a very subtle background highlight of #22262E.
- **Collaborative Cursors:** Thin 2px vertical lines using the primary accent color, with a floating 12px rounded label indicating the user's name.
- **Lists:** Sidebar items use a 4px left-accent bar in the primary color to indicate the "Active" state, with a subtle background shift to `surface_elevated`.