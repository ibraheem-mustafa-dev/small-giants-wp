# Ward End Eye Care: client design context

**Status:** draft from Claude Design (`Ward End Eye Care - SGS Gap Handoff/`, live at https://mintcream-lyrebird-224487.hostingersite.com/); hand-built to client-ready on eye-care-test (https://darkcyan-grouse-898606.hostingersite.com). Current state and next steps: `.claude/LEDGER.md` Front F. Page and surface trees: `build/*.tree.json`.

Read before any work on this client. Framework rules are in the root `CLAUDE.md`; this file is only this business.

---

## What the business is

Ward End Eye Care is an independent opticians in the UK. **This project is her online eyewear store, not a website for the practice.** Sunglasses launch first; prescription eyewear follows.

The store is a second revenue line, and its ceiling is potentially higher than the clinic's. That is the reason it exists: treat ecommerce performance as the goal, not practice marketing.

⛔ **Do not design this as a practice website with a shop attached.** An earlier version of the design brief did exactly that, and it would have sent the whole design, and the research behind it, toward optometry practice sites instead of premium retail.

## Why buy from her rather than a general retailer

The optician credential is the commercial engine, not an identity statement. It cashes out as follows:

1. **Price.** Trade access as an optician lets her price competitively. ⚠ Communicate this as a structural advantage, never as a "cheapest" claim: the large chains have far greater buying power, so an undercutting claim would be unsupportable.
2. **Prescription lenses fitted to any frames bought from her**, where the customer supplies a valid prescription. **Confirmed with the client.** Larger retailers often offer this too, so the advantage is execution, not existence. The customer supplies their prescription online during checkout. Lens options, pricing structure and turnaround are **not yet fixed**: design-stage defaults drawn from competitor research are acceptable, and must be confirmed with the client before launch.
3. **Agility.** Fast, direct, personal service from someone who knows eyewear: reachable (WhatsApp included), quick, and able to advise. Small enough to actually answer.
4. **Clinical credentials.** BSc (Hons), MCOptom (Member of the College of Optometrists), DipTp(IP) (therapeutic prescribing: qualified to prescribe medicines for eye conditions) and a Professional Certificate in Paediatric Eye Care. These sit beyond standard optometry registration. Source: her LinkedIn. Always translate the letters for laypeople; unexplained postnominals are authority nobody can read.
5. **A real shop.** Customers can collect online orders and have frames fitted and adjusted in person. **Contain it:** surface as an option at checkout, and mention it only where genuinely relevant (delivery info, FAQs, contact). Not a headline feature. This is the line most likely to drag the design back toward a practice website, so it is the one to watch in any draft.

## Positioning, in one line

**A luxury eyewear store that happens to be run by an independent and highly qualified optician.** The luxury retail experience is the surface; the optician behind it is why you can trust what you are buying. JP Opticians runs the same structure in the opposite direction: independent-optician presentation aimed at value.

Range and choice are also part of the offer. She stocks a broad set of designer brands; no single brand defines the store.

## Brands

She stocks the same 44 brands as JP Opticians (list, with JP's stock depth: `reference/brands.md`). Tom Ford, Kate Spade and Under Armour are marketed by JP but have zero stock there; whether she carries them is unknown.

**Keep all 44 (Bean, 2026-09-12; a 29-brand trim was rejected, correctly).** Why: the mid-tier is the business (JP's top sellers are Ray-Ban, Oakley, Superdry and Gucci); Polaroid, Police, Nike Vision and adidas are real sunglasses ranges and Ferrari Scuderia is a Ray-Ban collaboration; luxury here is the vibe of the site, not a price gate, and presenting the range as exclusionary would cut out the actual buyers.

**Merchandising weight, not exclusion.** Lean the presentation toward the sunglasses names (Ray-Ban, Oakley, Polaroid, Police, Carrera, Ferrari Scuderia, plus Gucci, Prada, Versace, Dolce & Gabbana, Balenciaga and Michael Kors). Others lean optical. Weight them; never hide them.

**The core design tension.** The range runs from a £300 Gucci to a £60 Superdry and both sit on the same shelf. Too far toward luxury and the affordable end looks cheap and the site feels like it is not for you; too far toward value and the Gucci end stops being believable. **Prestigious and completely approachable.** Competitive pricing is a selling point, not something to be coy about.

**These brands are also the best reference set available.** How Gucci, Prada, Balenciaga, Montblanc, Ferragamo, Tiffany and Ray-Ban present eyewear as an object is a far stronger standard than any optician site.

## Media rights and assets

- **Ray-Ban imagery is cleared for use: anything on ray-ban.com**, including product, lifestyle and campaign photography. Good entry point: https://www.ray-ban.com/uk/sunglasses/view-all This is an image-rights fact only. Ray-Ban must not dominate the visual identity; the store reads as a curated multi-brand selection. No other brand's imagery is cleared, so use placeholders elsewhere.
- No real product copy or customer photography exists yet.
- **No final logo.** Draft versions live at `B:\Pictures\Eye Care Logo Drafts`. They are a starting point to refine or choose from, not a locked asset, and have not been reviewed for premium-tier viability.
- Her actual pricing and inventory depth are unknown: the brand list tells us the tier she can access, not what she stocks or charges.

## What the client said

Verbatim: *"Want simple black and white. Classy and easy to navigate."*

She is not a designer and is describing a feeling. Read it as an instinct for restraint, not a specification. Restraint and ambition are not in conflict here, but "simple" must never come out as underdeveloped, because designer eyewear buyers arrive with luxury-retail expectations.

**Preferred accent colours, her ranking:** 1. taupe · 2. sage · 3. navy.

Stated directly by her, so this is real information rather than an inference. It is carried in the design brief as non-binding: a better-reasoned direction may override it, with an explanation. It sits comfortably with "black and white": a monochrome ground with one muted accent is close to what she has described twice.

---

## Competitor: JP Opticians (`https://jpopticians.com/jp_uk`)

Named by the client; 100% ecommerce, and a white-labelled storefront (trading company Fashion Specs Direct Ltd, images from `spex4less.com`, 10-working-day dispatch, no named optician). Do not overstate this: it is about their supply chain, not their presentation. JP presents as an independent optician, so it is a fair strategic reference, aimed at value where Ward End aims at luxury retail. Outside the buying process its design is bland: take the commerce mechanics, not the styling. Naming it is not evidence of her taste.

Worth learning from: trust and friction reduction throughout (FAQs, "contact us" at every stage; the most transferable idea); a filter and sort panel that scales to very many options on desktop and mobile; minimal product tiles with a hover scale; a product page with image-based colour options, a three-column trust bar and the RRP under the price; and the lens flow (Select lenses or Order frame only, a four-step configurator, a step indicator that replaces the header, an image and a `?` on every option). Not worth copying: header, footer and reviews. Full notes: `reference/competitor-jp-opticians.md`.

## The prescription-lens path

This is the most design-critical surface on the site and the least standard. It must be the most intuitive, non-intimidating, lowest-friction and best-looking version of this flow available, benchmarked against several top competitors as well as JP Opticians. It is also the richest cloning-measurement input, because it is a section shape the recogniser has never encountered.

## Design standard

Genuinely premium, and it must move. Motion and interactivity are a large part of why a site reads professional rather than cheap; every interaction should visibly answer the person doing it. This applies equally on phones: mobile is not a reduced desktop site. A large share of eyewear buyers have a vision need and some have low vision, so motion must make the site clearer and more confident to use, never harder, and reduced-motion preferences are respected. This is an argument for motion done well, not for less of it.

## Cloning-pipeline measurement (Q1)

The draft is deliberately non-standardised (no SGS-BEM convention, technical constraints or effect inventory in the brief):
- **Never narrow the design brief to make the clone easier.** The theme is broadly capable so that design leads and the framework follows; a brief that protects the pipeline measures our own constraints instead of Claude's ceiling.
- **A recogniser decline is a result, not a bug.** Record what matched and what was declined, with reasons; the declines are the output.
- **Anything designed that the theme cannot do is a roadmap item**, not a design error.

Context: `.claude/plans/archive/2026-09-10-bem-recognition-and-template-detection-brainstorm.md` (Q1 section, re-read before running the pass).
