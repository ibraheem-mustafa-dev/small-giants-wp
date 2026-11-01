# Review evidence: indus-foods (2026-11-01)

151 rows had no mark after Bean's October decisions were restored. 148 are marked in review.md; 3 stay blank (2 adopt-rule, 1 judgement).

## Settled by evidence

- Page map, 8 rows, `accept`: food-service, manufacturing, retail, wholesale, catalogue, delivery, terms, faqs. The draft's own breadcrumb hrefs decide the parent: `Indus Foods Website v2.dc.html` maps `Sectors` to `#/food-service` and `Trade` to `#/apply`, and the manufacturing, retail, wholesale pages carry section `Sectors`; catalogue, delivery, terms, faqs carry section `Trade`.
- Palette roles, 17 rows, `accept`: every proposal follows Bean's ruling (the client palette is the draft's own tokens). The `--text-*`, `--surface-*`, `--selection-bg` and `--border-accent` rows are aliases of a token whose row Bean already accepted. `--ink` and `--selection-fg` stay custom colours like his accepted `--tint-on-blue`. Social and WhatsApp colours are one-off, as his accepted `--social-google`.
- Script effects, 8 rows, `accept` (A-01, A-25, A-31, A-32, A-33, J-13, J-31): same effect shape and wording as twins Bean accepted (A-24, J-12, J-14, J-43 to J-50, J-66).
- Inventory diffs, 3 rows, `ours` (A-25, A-50, A-53): the draft's code calls `.animate(` at `Indus Foods Website v2.dc.html` closeMobile (translateX 340 ms), `TradeApplication.dc.html` next (shake 320 ms) and `EnquiryForm.dc.html` submit (shake 320 ms); animations.json simply omits them (R-47-4: code first).
- Skeleton rows marked `accept`, 112 rows (confident, agent-pick, low): sampled the distinct shapes against the draft's code. The 0.7 icon-list rows (our-story 390 and its 47 copies, careers 580, terms 645) are repeated marker-plus-text rows, and terms 645 is Bean's own ruling (2026-10-31, "the terms index, one numbered list"). Footer 677 is a repeated day-and-hours row (business-info). The iframes (footer 712, contact 538) are the map embed (business-info). The form fields (careers, contact) are the field blocks for their rendered input types, and their labels are removed (Bean, 2026-10-19). Home mega-menu and about "01" spans are sgs/text. page-about 524#0 is Bean's 2026-10-31 ruling (multi-button). page-our-story 328#0 is the current breadcrumb crumb, which sgs/breadcrumbs draws (remove). The `absorbed` and `unwrap` rows follow rules already accepted on sibling rows.
- Rule-changed rows settled with a mark:
  - sticky-header 18#0 "Call", `accept` (keeps sgs/button): it is the mobile-only label inside the header's phone pill, whose block (14#0) is already sgs/button. The rules' sgs/text carries no reason ("because of a rule change") and sgs/text cannot sit inside a leaf button, so Bean's choice stands.
  - footer 728#0, `block:sgs/whatsapp-cta`: the draft element is `<a href="https://wa.me/441217714330" style="position:fixed;right:22px;bottom:22px;...">`, a floating WhatsApp link. sgs/whatsapp-cta holds the whatsapp link kind and the floating variant.
  - page-home 313#0 and 314#0, `block:sgs/button`: `<a href="#/apply">` and `<a href="#/catalogue">` styled as pill buttons (background, 15px 26px padding, radius 999px, hover scale). icon-list is wrong for a single call-to-action link.
  - page-apply TradeApplication/6#0, `block:sgs/container`: it is the two-column grid (`grid-template-columns:{{ L.cols }}`) holding the form card (7#0, the form) and the sidebar aside (86#0). sgs/form on the grid would swallow the sidebar; 7#0 stays the form.
  - trade-account-application 33=container, `remove`: the label "What kind of business are you?" is a field label, which the field block's own label setting draws (Bean, 2026-10-19).

## Adopt rule (decision to delete)

Left blank in review.md so Bean's old choice is replaced by the rule's `absorbed`:
- mobile-tablet-drawer 114#0 (`<indus-logo>`): Bean chose sgs/responsive-logo on 2026-10-29. The drawer's top-row logo is drawn by sgs/nav-drawer from its chrome logo settings (Spec 36 FR-36-6), so a second logo block would duplicate it.
- mobile-tablet-drawer 118#0 (`<button>`): Bean chose sgs/container on 2026-10-29. Its click handler closes the drawer, and close is the drawer block's own chrome (FR-36-6), so a container would be a dead second close button.

## Judgement for Bean

- effect J-218 (left blank): the logo's hover speeds its slow spin up 14 times. SGS has no playback-rate control (only the marquee's hover rate), so the choice is to accept the difference (the logo spins at normal speed on hover) or build a playback-rate setting. Bean answered a comparable pair differently (handler rows: two build, two difference), so it is a design call. Recommendation: `difference`; it is a small flourish on one logo.

## Faults found

- None in the framework code. Note for the next run: rule-changed rows whose rules reason is empty ("because of a rule change", sticky-header 18#0, page-home 313#0, 314#0, page-apply 6#0) carry no explanation, so the reason is lost from the review. The list that builds `ruleWould` should keep the rule's reason.
