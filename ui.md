# SaaS Homepage Build Prompt

You are building the **Home page** for a SaaS product. Read this entire document before writing any code. Follow it precisely — this is a design-quality-critical task, not just a functional one.

---

## 1. Design Philosophy

The goal is an **ultra-modern, premium, editorial-feeling landing page** — the kind of site that looks like it was designed by a senior product designer at a top-tier startup (think Linear, Vercel, Stripe, Arc, Raycast, Resend), NOT a generic AI-generated template.

### Explicitly AVOID ("AI-slop" patterns) — do not do any of these:
- Generic purple/blue gradient blobs floating in the background
- Overused glassmorphism (frosted glass cards everywhere)
- Cheesy 3D rendered objects / isometric illustrations / floating spheres
- Stock "AI robot," "brain," or "network node" imagery
- Default shadcn look with zero customization (rounded-xl cards + soft shadow + gradient text everywhere)
- Emoji used as icons
- Centered hero with a generic headline + subheadline + two pill buttons + a random dashboard screenshot with a glow behind it — unless heavily art-directed and custom
- Overly rounded corners everywhere (rounded-3xl on every element) with no variation in geometry
- Bad/default fonts: no Arial, no default system-ui, no Poppins/Montserrat used carelessly, no Inter used lazily without proper tracking/weight tuning
- Excessive, uniform "fade-up on scroll" applied identically to every single element (the classic AI-slop reveal). Reveal animations must be **intentional, varied, and choreographed**, not copy-pasted on every div
- Cheap parallax and 3D tilt-on-hover effects slapped on everything
- Generic checkmark-list "features" sections with identical icon+title+paragraph cards repeated 6 times

### DO aim for:
- A strong, opinionated **typographic system** — real hierarchy, tight tracking on large headlines, generous leading on body copy
- **Confident whitespace** — let the black/white/gray palette breathe
- Asymmetry and intentional layout breaks (not everything centered and symmetric)
- Micro-interactions that feel *engineered*, not decorative
- Motion that supports meaning (staggered reveals tied to content grouping, scroll-scrubbed animations tied to a narrative, not motion for motion's sake)
- A visual "signature" moment — one standout custom interaction/animation in the hero or a key section that makes the page memorable

---

## 2. Color System — White / Black / Gray

Strict monochrome palette. No blue/purple accent unless explicitly approved.

```
--color-bg:            #FFFFFF   (base background)
--color-bg-inverse:    #0A0A0A   (near-black, not pure #000)
--color-surface:       #F7F7F7   (subtle section separation)
--color-surface-2:     #EFEFEF
--color-border:        #E4E4E4
--color-border-strong: #D4D4D4
--color-text-primary:  #0A0A0A
--color-text-secondary:#5C5C5C
--color-text-tertiary: #8A8A8A
--color-text-inverse:  #FAFAFA
--color-accent:        #171717   (used sparingly for emphasis, not "color" but weight/contrast)
```

Use **contrast and typographic weight** — not color — to create hierarchy. If a single accent is needed for a CTA or status dot, keep it near-black or use a very restrained single accent color (confirm with stakeholder before introducing color). Dark sections (near-black bg, white text) should be used deliberately to break rhythm, e.g., one full-bleed dark section between light sections.

---

## 3. Typography

Do NOT default to Inter without customization or to Poppins/Montserrat/Roboto. Choose ONE of the following pairings (or an equivalent modern, well-licensed alternative):

- **Display/Headlines:** Geist, Söhne, General Sans, Neue Montreal, or Founders Grotesk — tight letter-spacing (-0.02em to -0.04em) at large sizes
- **Body:** Geist, Inter (tuned: -0.01em tracking, 1.6 line-height), or Söhne Buch
- **Monospace accents** (for labels, tags, numbers): Geist Mono or JetBrains Mono, used sparingly for "technical" credibility (e.g. small uppercase eyebrow labels, version tags)

Type scale should be dramatic: hero headline 64–96px desktop, tight down to 32–40px mobile. Body copy 16–18px with generous line-height (1.6–1.75). Use a proper fluid type scale (clamp()) rather than fixed breakpoint jumps.

---

## 4. Layout & Structure

Build the homepage with these sections (adapt copy/content to the actual product, but keep this general structure):

1. **Nav** — minimal, sticky, background blur only on scroll (not permanent glassmorphism), logo left, links center/right, CTA button
2. **Hero** — bold headline, concise subheadline, primary CTA + secondary link, one signature visual/interactive element (not a stock screenshot with a glow)
3. **Logo strip / social proof** — grayscale logos, understated
4. **Feature sections (2–4)** — break the "icon+title+paragraph grid" cliché; alternate layouts (text+visual side by side, full-bleed dark section, horizontal scroll showcase, etc.)
5. **Product showcase** — real UI mockup treated with care (subtle border, no giant drop shadow + gradient), or an abstract custom SVG/canvas visualization relevant to the product's actual function (not generic)
6. **Testimonial / stats** — large typographic stat treatment, not cookie-cutter card grid
7. **Pricing** (if applicable) — clean comparison, restrained use of "highlighted" plan (no rainbow border)
8. **Final CTA** — full-bleed dark (near-black) section, high contrast, strong single CTA
9. **Footer** — minimal, well-organized link columns, small print

---

## 5. Motion & Animation Requirements

Motion must be **deliberate, choreographed, and performant**. Install and use the following:

### Required libraries — install these:
```bash
npm install framer-motion gsap lenis
```
(Use `lenis` — the successor to `locomotive-scroll` — for buttery smooth scrolling. If the project is React/Next.js, use `@studio-freight/lenis` or the latest `lenis` package with a React wrapper via `useEffect` + `requestAnimationFrame`.)

If using GSAP's scroll-triggered features:
```bash
npm install gsap
```
GSAP's ScrollTrigger is bundled in modern GSAP (v3.13+) as a free plugin — no separate paid plugin needed for ScrollTrigger. Import via:
```js
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);
```

### Animation rules:
- **Smooth scroll:** implement with Lenis, synced to GSAP ScrollTrigger's ticker (do not use two separate rAF loops — sync them per Lenis+GSAP integration docs)
- **Reveal animations:** use GSAP ScrollTrigger or Framer Motion `whileInView` — but vary timing, easing, and direction per section so it doesn't feel templated. Stagger children meaningfully (e.g., words in a headline, not just "fade up div by div" identically everywhere)
- **Easing:** use custom cubic-bezier / GSAP `power3.out`, `expo.out`, or similar — never linear, never the default ease
- **Hero signature animation:** build one standout interactive/animated element for the hero — options: a custom animated SVG that responds to scroll/cursor, a canvas-based generative visual, a GSAP timeline that builds up an abstract representation of the product, or a Framer Motion physics-based interaction. This should be custom-built for this product, not a generic Lottie file or 3D sphere
- **Micro-interactions:** buttons, links, and cards should have considered hover/press states (scale, subtle translate, border/color shift) using Framer Motion `whileHover`/`whileTap` or CSS transitions with custom easing
- **Performance:** respect `prefers-reduced-motion`; disable/simplify heavy animations for that setting. Keep animations GPU-accelerated (transform/opacity only, avoid animating layout properties)
- **No 3D unless it serves the product.** Do not add 3D objects/Three.js "just because." Only introduce 3D (react-three-fiber) if it's genuinely tied to the product's function or the client explicitly wants a 3D signature piece — otherwise keep it 2D/typographic.

---

## 6. Tech Stack

```bash
# Core (adjust to actual project stack if already established)
npx create-next-app@latest . --typescript --tailwind --app

# Animation & interaction
npm install framer-motion gsap lenis

# Optional utilities
npm install clsx tailwind-merge
```

Use Tailwind CSS for styling with a custom `tailwind.config` that encodes the color tokens and type scale from sections 2–3 above (don't rely on Tailwind's default gray scale — define custom `black/white/gray` tokens matching section 2).

---

## 7. Deliverable Checklist

Before considering the page done, confirm:

- [ ] No default/unstyled shadcn components — every component is visually customized
- [ ] Color palette strictly white/black/gray (+ at most one restrained accent, only if approved)
- [ ] Custom font pairing installed and applied with proper tracking/weight, no default system fonts
- [ ] Lenis smooth scroll implemented and synced with GSAP ScrollTrigger
- [ ] At least one custom-built signature animation/interaction (not a stock Lottie or generic 3D sphere)
- [ ] Scroll-reveal animations are varied and choreographed, not copy-pasted identically on every element
- [ ] `prefers-reduced-motion` respected
- [ ] No AI-slop visual clichés from Section 1's avoid-list appear anywhere on the page
- [ ] Layout has intentional asymmetry/breaks — not every section is centered text + centered visual
- [ ] Fully responsive: hero and type scale degrade gracefully on mobile, animations simplified/reduced on small screens
- [ ] Page passes a basic Lighthouse performance check (animations don't tank performance/CLS)

---

## 8. Notes for the Agent

- If uncertain about specific copy/content, use clearly-marked placeholder text (`[Product Name]`, `[Feature X description]`) rather than inventing fake product claims.
- Prioritize getting the **typography and spacing system right first** — a monochrome page lives or dies on type and whitespace, since there's no color to hide behind.
- Build the signature hero animation as a self-contained component so it can be iterated on independently.
- Comment the GSAP/Lenis setup code clearly so it's maintainable.