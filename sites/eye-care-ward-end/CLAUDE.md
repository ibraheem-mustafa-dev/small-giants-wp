# Ward End Eye Care — client design context

**Status:** draft done (Claude Design, `Ward End Eye Care - SGS Gap Handoff/`, live at
https://mintcream-lyrebird-224487.hostingersite.com/); being hand-built to client-ready on
eye-care-test (https://darkcyan-grouse-898606.hostingersite.com). Current state and next steps:
`.claude/LEDGER.md` Front F. Page and surface trees: `build/*.tree.json`.
**Created:** 2026-09-12.

Read this before any design, content or build work on this client. Framework rules live in
the root `CLAUDE.md`; this file carries only what is true about *this* business.

---

## What the business is

Ward End Eye Care is an independent opticians in the UK. **This project is her online
eyewear store, not a website for the practice.** Sunglasses launch first; prescription
eyewear follows.

The store is a second revenue line, and its ceiling is potentially higher than the clinic's.
That is the reason it exists — treat ecommerce performance as the goal, not practice
marketing.

⛔ **Do not design this as a practice website with a shop attached.** An earlier version of
the design brief did exactly that, and it would have sent the whole design — and the
research behind it — toward optometry practice sites instead of premium retail.

## Why buy from her rather than a general retailer

The optician credential is the commercial engine, not an identity statement. It cashes out
as follows:

1. **Price.** Trade access as an optician lets her price competitively. ⚠ Communicate this as
   a structural advantage, never as a "cheapest" claim — the large chains have far greater
   buying power, so an undercutting claim would be unsupportable.
2. **Prescription lenses fitted to any frames bought from her**, where the customer supplies
   a valid prescription. **Confirmed with the client.** Larger retailers often offer this
   too, so the advantage is execution, not existence. The customer supplies their
   prescription online during checkout. Lens options, pricing structure and turnaround are
   **not yet fixed** — design-stage defaults drawn from competitor research are acceptable,
   and must be confirmed before launch.
3. **Agility.** Fast, direct, personal service from someone who knows eyewear — reachable
   (WhatsApp included), quick, and able to advise. Small enough to actually answer.
4. **Clinical credentials.** BSc (Hons), MCOptom (Member of the College of Optometrists),
   DipTp(IP) — therapeutic prescribing, so she is qualified to prescribe medicines for eye
   conditions — and a Professional Certificate in Paediatric Eye Care. These sit beyond
   standard optometry registration. Source: her LinkedIn. Always translate the letters for
   laypeople; unexplained postnominals are authority nobody can read.

5. **A real shop.** Customers can collect online orders and have frames fitted and adjusted
   in person. **Contain it:** surface as an option at checkout, and mention it only where
   genuinely relevant — delivery info, FAQs, contact. Not a headline feature. This is the
   line most likely to drag the design back toward a practice website, so it is the one to
   watch in any draft.

## Positioning, in one line

**A luxury eyewear store that happens to be run by an independent and highly qualified
optician.** The luxury retail experience is the surface; the optician behind it is why you
can trust what you are buying. JP Opticians runs the same structure in the opposite
direction — independent-optician presentation aimed at value.

Range and choice are also part of the offer. She stocks a broad set of designer brands; no
single brand defines the store.

## Brands

She stocks **the same brands as JP Opticians**. Extracted 2026-09-12 from JP's live Brand
filter facet on both `/designer-glasses` and `/designer-sunglasses` — identical 45-brand set
on both, "Show more" expanded, count cross-checked against the DOM, so the list is complete
rather than truncated. Numbers in brackets are JP's in-stock product counts at extraction
time and indicate relative depth, not her inventory.

Adidas Originals (1) · Balenciaga (24) · Barbour (2) · Botaniq (11) · Calvin Klein (2) ·
Calvin Klein Jeans (7) · Carrera (2) · Cat (5) · Chloe (24) · Coach (114) · David Beckham (1) ·
Diesel (50) · DKNY (3) · Dolce & Gabbana (1) · Dsquared2 (2) · Emporio Armani (183) ·
Farah (3) · Ferrari Scuderia (32) · Fila (2) · Giorgio Armani (2) · Gucci (308) ·
Hugo Boss (2) · Lipsy (4) · Marc Jacobs (2) · MaxMara (1) · Michael Kors (54) ·
Montblanc (35) · Mulberry (2) · Nike (8) · O'Neill (11) · Oakley (52) · Polaroid (15) ·
Police (1) · Prada (2) · Radley (10) · Ralph Lauren (47) · Ray-Ban (102) ·
Salvatore Ferragamo (6) · Superdry (19) · Swarovski (16) · Tiffany (1) · Tommy Hilfiger (4) ·
Valentino (1) · Versace (3) · Vogue (28)

**Marketed but out of stock at JP:** Tom Ford (hero-banner placement), Kate Spade and Under
Armour all have dedicated category pages returning zero products, which is why they are
absent from the filter. Unknown whether that is temporary or discontinued. "Boss" appears as
a separate slug from "Hugo Boss" and is probably the same brand.

### The range is kept broad — Bean-decided 2026-09-12

An attempt to trim this to 29 "relevant" brands was **rejected, correctly.** Only the genuine
duplicate was kept: Calvin Klein Jeans merged into Calvin Klein, leaving **44 brands**.

**Why the trim was wrong:**
- **The mid-tier is the business.** JP's top sellers are Ray-Ban, Oakley, Superdry and Gucci.
  Cutting the mid and value tiers cuts the volume.
- **The dropped brands do genuinely sell sunglasses.** Polaroid and Police are
  sunglasses-first names — Polaroid's whole identity is polarised lenses. Nike Vision and
  adidas eyewear are real licensed ranges. Ferrari Scuderia is a Ray-Ban collaboration. The
  trim cut real sunglasses brands on a fashion-tier judgement.
- **Luxury here is the vibe of the site, not a price gate.** Expensive brands run cheap lines.
  Presenting the range as exclusionary would be pretentious and would cut out the actual
  buyers.

**Merchandising weight, not exclusion.** Lean the presentation toward the sunglasses names —
Ray-Ban, Oakley, Polaroid, Police, Carrera, Ferrari Scuderia, plus Gucci, Prada, Versace,
Dolce & Gabbana, Balenciaga and Michael Kors. Others lean optical. Weight them; never hide
them.

**The core design tension, restored.** The range runs from a £300 Gucci to a £60 Superdry and
both sit on the same shelf. Too far toward luxury and the affordable end looks cheap and the
site feels like it is not for you; too far toward value and the Gucci end stops being
believable. **Prestigious and completely approachable.** Competitive pricing is a selling
point, not something to be coy about.

**These brands are also the best reference set available.** Many run their own eyewear sites
and several are synonymous with luxury. How Gucci, Prada, Balenciaga, Montblanc, Ferragamo,
Tiffany and Ray-Ban present eyewear as an object is a far stronger standard than any optician
site.

## Media rights

- **Ray-Ban imagery is cleared for use — anything on ray-ban.com**, including product,
  lifestyle and campaign photography. Good entry point:
  https://www.ray-ban.com/uk/sunglasses/view-all
  This is an image-rights fact only. Ray-Ban must not dominate the visual identity; the
  store reads as a curated multi-brand selection. No other brand's imagery is cleared —
  placeholders elsewhere.
- No real product copy or customer photography exists yet.
- **No final logo.** Draft versions live at `B:\Pictures\Eye Care Logo Drafts`. They are a
  starting point to refine or choose from, not a locked asset.

## What the client said

Verbatim: *"Want simple black and white. Classy and easy to navigate."*

She is not a designer and is describing a feeling. Read it as an instinct for restraint, not
a specification. Restraint and ambition are not in conflict here — but "simple" must never
come out as underdeveloped, because designer eyewear buyers arrive with luxury-retail
expectations.

**Preferred accent colours, her ranking:** 1. taupe · 2. sage · 3. navy.

Stated directly by her, so this is real information rather than an inference. It is carried
in the design brief as non-binding — a better-reasoned direction may override it, with an
explanation. Note it sits comfortably with "black and white": a monochrome ground with one
muted accent is close to what she has described twice.

---

## Competitor — JP Opticians (`https://jpopticians.com/jp_uk`)

The client named this site. **It is 100% ecommerce**, not a practice website.

⚠ **It is also a white-labelled storefront, not an independent practice's shop.** Verified
2026-09-12 via live browser: the trading company in the footer is Fashion Specs Direct Ltd,
product images are served from `spex4less.com`, and the footer links out to "Great Value
Eyewear by Spex4Less". Dispatch is quoted at 10 working days; no named optician and no GOC
registration are displayed.

**Why that matters — carefully.** Do not overstate this. JP *presents* as an independent
optician, which is structurally close to our own positioning, so as a strategic reference it
is a reasonable fit. The white-label finding is about their supply chain, not their
presentation, and we are not copying their supply chain.

The real reason not to take their visual language is simpler: **outside the buying process
their design is bland and basic.** Take the commerce mechanics, ignore the styling. The
positioning difference is direction of travel — they aim at value, Ward End aims at luxury
retail run by a highly qualified independent optician.

Two further cautions:
- **Naming it is not evidence of her taste.** She has seen it; that is all we know.
- Its homepage currently fails to load images.

### Worth learning from

**Trust and friction reduction, throughout.** Heavy emphasis on FAQs and information, with
prompts to contact them for help at every stage. Paired with genuine optician authority,
this builds real credibility. This is the single most transferable idea on the site.

**Shop page.** The filter and sort panel handles a very large set of filter categories and
options and still works well on both desktop and mobile — a hard problem solved well.

**Product tiles.** Minimal and product-focused: the glasses, the brand logo, colour options,
name, price, a symbol marking faster-delivery items, and the review count. Hovering scales
the tile slightly, which gives a closer look and naturally draws focus.

**Product page.** Image gallery, full frame details, a three-column trust bar under the
gallery, reviews, availability with delivery estimate, and price with RRP beneath for
comparison. **Colour options use actual product images rather than plain swatches** — a
small, clearly better choice.

**The lens-selection flow — the standout.** Two buttons split the purchase: *Select lenses*
and *Order frame only*. "Select lenses" opens a four-step configurator:
- Large product image plus a running total on one side, options for each step alongside.
- **The step indicator replaces the entire header except the logo** while you are in the
  flow. This removes navigation, promotes focus, and shows how short the process is.
- Every option carries a representative image and a `?` help control explaining it.

Net effect: a genuinely intimidating task (choosing lenses) made short, visual and
low-friction.

### Not worth copying

The header, the footer and the reviews section are basic and unattractive. Much of the site
outside the bespoke commerce surfaces is standard template work.

---

## The prescription-lens path

This is the most design-critical surface on the site and the least standard. It must be the
most intuitive, non-intimidating, lowest-friction and best-looking version of this flow
available — benchmarked against several top competitors as well as JP Opticians.

It is also likely the richest input for the cloning measurement below, because it is a
section shape the recogniser has never encountered.

## Design standard

Genuinely premium, and it must move. Motion and interactivity are a large part of why a site
reads professional rather than cheap; every interaction should visibly answer the person
doing it. This applies equally on phones — mobile is not a reduced desktop site.

---

## Role in the cloning pipeline (Q1)

**This draft is deliberately non-standardised.** Claude Design produced it without any SGS-BEM
convention, technical constraints or effect inventory in the brief. It was the first real
measurement input for Q1 (how well the pipeline clones a draft never written for it); since
D1149 (2026-09-24) the site itself is built by hand, and the pipeline work continues
separately.

Rules for that measurement:

- **Never narrow the design brief to make the clone easier.** The theme is broadly capable so
  that design leads and the framework follows. A brief that protects the pipeline measures
  our own constraints instead of Claude's ceiling.
- **A recogniser decline is a result, not a bug.** Record what matched and what was declined,
  with reasons. The declines are the output.
- **Anything designed that the theme cannot do is a roadmap item**, not a design error. That
  list only appears because the brief stayed quiet about existing capability.

## Related

- Live design brief: the Claude Design prompt (see session scratchpad / paste from the
  artefact "The Short Brief").
- Briefing method and its rationale: artefact **The Short Brief**.
- Pipeline measurement context: `.claude/plans/archive/2026-09-10-bem-recognition-and-template-detection-brainstorm.md`
  (Q1 section — re-read before running the pass).

## Design standard — audience note

A large share of eyewear buyers have a vision need and some have low vision. Motion must make
the site clearer and more confident to use, never harder; reduced-motion preferences are
respected. This is an argument for motion done well, not for less of it.

## Open

- **Lens specifics unconfirmed** — options offered, pricing structure, turnaround. Design-stage
  defaults are acceptable; confirm with the client before launch.
- **Her actual pricing and inventory depth** are unknown. The brand list is JP's; it tells us
  the tier she can access, not what she stocks or what she charges.
- **Logo drafts** have not been reviewed for premium-tier viability.
- **Tom Ford, Kate Spade, Under Armour** — marketed by JP but zero stock. Unknown whether
  temporary or discontinued, and unknown whether she carries them.
