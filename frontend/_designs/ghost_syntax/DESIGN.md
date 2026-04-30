---
name: Ghost Syntax
colors:
  surface: '#131315'
  surface-dim: '#131315'
  surface-bright: '#39393a'
  surface-container-lowest: '#0e0e0f'
  surface-container-low: '#1b1b1d'
  surface-container: '#1f1f21'
  surface-container-high: '#2a2a2b'
  surface-container-highest: '#353536'
  on-surface: '#e4e2e3'
  on-surface-variant: '#c5c6cd'
  inverse-surface: '#e4e2e3'
  inverse-on-surface: '#303032'
  outline: '#8f9097'
  outline-variant: '#44474c'
  surface-tint: '#bcc7dd'
  primary: '#bcc7dd'
  on-primary: '#263142'
  primary-container: '#4a5568'
  on-primary-container: '#becae0'
  inverse-primary: '#545f72'
  secondary: '#c8c6c5'
  on-secondary: '#313030'
  secondary-container: '#474746'
  on-secondary-container: '#b7b4b4'
  tertiary: '#dcc39d'
  on-tertiary: '#3d2e13'
  tertiary-container: '#645234'
  on-tertiary-container: '#dfc6a0'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e3fa'
  primary-fixed-dim: '#bcc7dd'
  on-primary-fixed: '#111c2c'
  on-primary-fixed-variant: '#3c475a'
  secondary-fixed: '#e5e2e1'
  secondary-fixed-dim: '#c8c6c5'
  on-secondary-fixed: '#1c1b1b'
  on-secondary-fixed-variant: '#474746'
  tertiary-fixed: '#f9dfb8'
  tertiary-fixed-dim: '#dcc39d'
  on-tertiary-fixed: '#261902'
  on-tertiary-fixed-variant: '#554427'
  background: '#131315'
  on-background: '#e4e2e3'
  surface-variant: '#353536'
typography:
  h1:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  ui-medium:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  ui-small:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  editor-main:
    fontFamily: JetBrains Mono
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  editor-meta:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
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
  gutter: 20px
  editor-max-width: 840px
---

## Brand & Style

This design system is built for deep focus and technical precision. It targets power users, developers, and writers who require a high-fidelity environment that disappears during the creative process. The aesthetic is ultra-minimalist and hacker-friendly, prioritizing legibility and structural clarity over decorative elements.

The visual language draws from modern minimalism and high-contrast dark modes, utilizing a "reduced-UI" philosophy where interface elements only emerge when necessary. The emotional response is one of calm, professional competence and absolute control.

## Colors

The palette is strictly monochromatic with a singular functional accent. The foundation is a deep, near-black background that minimizes eye strain during long sessions. Surfaces are differentiated by tonal shifts rather than shadows, using a slightly lighter gray for the editor and containers.

The accent color is a muted blue-gray, used sparingly for active states, focus indicators, and primary actions. This ensures that the user's content remains the most vibrant element on the screen. All text is slightly dimmed from pure white to prevent "halation" or glowing effects on high-resolution displays.

## Typography

The typography strategy employs a dual-font system to distinguish between the interface and the content. **Inter** is utilized for all UI elements—menus, buttons, and labels—to provide a clean, neutral, and highly readable institutional feel.

For the core experience, **JetBrains Mono** is used within the editor. This monospaced choice reinforces the "hacker-friendly" narrative, providing the rhythmic horizontal spacing necessary for structured text and code. Line heights are generous (1.6x) to facilitate scanning and reduce vertical crowding.

## Layout & Spacing

This design system uses a hybrid layout model. The global interface follows a fixed grid for the sidebar and utility panels, while the editor workspace is fluid with a strictly enforced maximum width. This "centered focus" approach ensures that text lines do not become too long for comfortable reading.

The spacing rhythm is based on a 4px baseline grid. Large horizontal margins (xl) are encouraged around the primary text area to create a "distraction-free" void. Components are spaced using a "compact but clear" logic, where internal padding is tight (sm/md) but external margins between functional groups are generous.

## Elevation & Depth

Hierarchy is established through **tonal layers** and **low-contrast outlines** rather than traditional shadows. This creates a flat, high-fidelity look that feels integrated into the screen.

- **Level 0 (Background):** #0D0D0D. The lowest layer.
- **Level 1 (Surfaces):** #161616. Used for the editor and sidebar.
- **Level 2 (Popovers/Modals):** #1C1C1C. These use a 1px border (#222) and a very subtle, large-radius black shadow (30% opacity) to provide minimal lift.

Interactive states are indicated by shifts in border color or background brightness rather than physical movement or heavy depth.

## Shapes

The shape language is characterized by a "soft-square" aesthetic. A consistent 10-12px corner radius is applied to all major components, including buttons, input fields, and panels. This softens the technical nature of the dark theme, making the interface feel modern and premium.

Smaller elements like tooltips and internal tags use a reduced radius (4px) to maintain a crisp appearance at small scales. All shapes should be rendered with a 1px solid border to define their boundaries against the dark background.

## Components

### Buttons
Buttons are strictly flat. The primary button uses the accent color (#4A5568) with dimmed white text. Secondary buttons are transparent with a #222 border. Hover states are subtle: a slight increase in background brightness (+5%) and a crisp transition.

### Input Fields & Editor
Input fields are styled as simple containers with a 1px border. On focus, the border transitions to the accent color. The editor itself should have no visible border, using the tonal difference between the surface (#161616) and background (#0D0D0D) to define the writing area.

### Toggle Switches
Toggles are ultra-minimal: a small rectangular track with a 10px radius. The "off" state matches the border color; the "on" state uses the accent color. The "thumb" is a simple circle with no shadow.

### Dropdowns & Menus
Dropdowns use the #161616 surface color with a #222 border. List items have a 4px margin from the edge of the container. The hover state for menu items is a subtle background shift to #222.

### Collaborative Cursors
As a collaborative editor, cursors are thin vertical lines in various muted pastel shades, accompanied by a small label in JetBrains Mono. The label disappears after 2 seconds of inactivity to maintain the distraction-free environment.