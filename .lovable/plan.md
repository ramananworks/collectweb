

## Plan: Enhance Splash Screen Logo Display

Upgrade the splash screen with a more premium, layered entrance animation for the logo and surrounding elements.

### Changes in `src/pages/SplashScreen.tsx`

1. **Larger logo** — Increase from `h-20 w-20` to `h-28 w-28` with a soft glow/ring effect behind it (a radial gradient blur div or a ring shadow)

2. **Staggered entrance animation** — Instead of everything appearing at once:
   - Logo scales up with a spring bounce (delay 0)
   - App name fades up from below (delay 0.3s)
   - Tagline "Smart Distributor Collection Platform" fades in (delay 0.5s)
   - Progress bar slides in (delay 0.7s)

3. **Logo glow effect** — Add a soft radial glow behind the logo using `shadow-2xl` + a subtle animated pulse ring using a `motion.div` with expanding scale and fading opacity

4. **Refined progress bar** — Widen to `w-24` with a gradient fill matching the primary color

All changes contained in one file, purely visual/animation enhancements.

