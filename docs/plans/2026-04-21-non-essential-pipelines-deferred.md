# Non-essential pipelines — deferrable from small-giants-wp critical path

**Purpose:** identify pipelines that can be built in parallel sessions or after the SGS-theme revenue core ships, without blocking small-giants-wp Phase 1 work.

**Dependencies respected:** each deferred pipeline lists what it needs so it doesn't ship ahead of its prerequisites.

---

## Critical path (do NOT defer — revenue-critical for small-giants-wp)

| Pipeline | Why critical |
|---|---|
| **P1 New client build** | Direct SGS revenue — currently 0 of 6 chargeable pipelines formalised |
| **P2 WP→SGS migration** | Revenue on every migration engagement |
| **P3 Draft→SGS** | Client mockup work — already informal, needs formalising |
| **P4 Audit→proposal** | THE pitch engine — unlocks new-client acquisition |
| **P6 QA→deploy** | Every build uses it — ship blocker if broken |
| **P7 /build-website** | Productised flagship — only one already formalised |
| **P9 Block dev standalone** | Library growth — every other pipeline depends on block inventory |
| **P12 Client onboarding** | "Biggest revenue gap" per CONVERSATION-HANDOFF.md — DNS → live WP |

---

## Deferrable pipelines — non-essential to small-giants-wp revenue core

### P8 — Content creation

**What:** /brand-voice-replicator (NEW) OR /style-replicator → /seo-content → /seo-geo → /clarify → /wp-wpcli-and-ops upload.

**Why deferrable:** content lives IN an SGS site. The SGS site delivery pipelines (P1-P3, P7) ship the vehicle; content fills it. Clients often write their own copy or use retained copywriters. SGS doesn't earn a premium on content generation — it's margin-neutral work.

**Dependencies (must exist before P8 builds):**
- P1 or P2 or P3 or P7 — a live SGS site to upload content into
- /wp-wpcli-and-ops (exists)
- /seo-content + /seo-geo + /clarify (all exist)
- /brand-voice-replicator — NEW skill, can be built in parallel

**When to ship:** after first 2-3 SGS client sites deliver and show content-creation is a recurring bottleneck. Until then, Bean can write client copy manually or dispatch inline /seo-content without formalised pipeline.

---

### P10 — Scroll-animation-originator

**What:** Chase Chapman workflow — AI-originated premium product animations on canvas scroll-scrubber blocks.

**Why deferrable:** premium upsell offering, not core SGS theme work. Also requires fal.ai account signup + LTX-Video ongoing spend (~$3.60 for 20 clips/month). No critical client needs this today; it's a differentiator play, not a deliverable.

**Dependencies (must exist before P10 builds):**
- /sgs-discover (exists — can be used today for premium product landing references)
- /uimax (exists — already the brain)
- /nano-banana-pro (exists)
- fal.ai account created + FAL_KEY in env
- FFMPEG (installed)
- NEW `sgs/scroll-animation` block with 3 variants (individual / container-bg / page-bg)
- /a11y-audit (exists — reduced-motion HARD GATE)
- /visual-qa (exists)
- Split of /animation-harvest — Path A stays, Path B moves here

**Independence from small-giants-wp critical path:** complete. Nothing in P1-P9 or P12 blocks on P10.

**When to ship:** after first SGS flagship client where premium scroll-animation is pitched as an upsell. Demo value > critical delivery value.

---

### P11 — Email campaign

**What:** /email-html-builder → /sgs-email-branding → /uimax pull → /gemini-vision-audit → automation email_send.py (with html=True fix).

**Why deferrable:** email work is separate from SGS website delivery. Invoicing + transactional emails already covered by /invoice-sgs skill. Marketing campaign emails are NOT a current SGS revenue surface — if Bean adds this service it's a new offering, not part of core SGS theme work.

**Dependencies (must exist before P11 builds):**
- /email-html-builder (exists — but needs the 18 gaps from this session's review addressed; see sgs-extraction role-split doc)
- /sgs-email-branding (exists — 3.77 B-grade this session)
- /uimax (exists)
- /gemini-vision-audit (exists — dark-mode render check)
- automation_send.py email_send.py bug fix: **html=True parameter** (Sonnet found this — silent plain-text bug today)

**When to ship:** when SGS adds email-campaign as a service offering. Not on critical path.

---

### P13 — App delivery

**What:** React Native / SwiftUI / Flutter client builds using /uimax stack-specific palettes + NEW /app-block-library.

**Why deferrable:** Bean's stated priority is SGS theme first. Apps are a different delivery target, different stack, different skills. /uimax has the stack data (React Native + SwiftUI + Flutter stacks confirmed in recon) but no SGS-specific app block library exists yet.

**Dependencies (must exist before P13 builds):**
- /uimax stack-aware routing enhancement (spec Section 4 item: "when pipeline target is app, pull React Native palettes/type/spacing not web ones")
- /sgs-discover integration with Mobbin (app UI pattern library — recon found Mobbin not integrated)
- NEW /app-block-library skill (React Native / SwiftUI / Flutter components)
- Mobile-viewport capture tooling (Playwright supports but not wired into sgs-extraction for mobile-primary capture)
- TestFlight / Play Console deploy toolchain

**Independence from small-giants-wp critical path:** complete. Entirely parallel workstream.

**When to ship:** parked per Bean's "SGS theme revenue priority first". Revisit after first 3-5 SGS site clients ship and demonstrate SGS theme revenue flow.

---

## Optional accelerators (not pipelines, but can parallelise)

### `/scroll-animation-originator` skill draft + `/brand-voice-replicator` skill draft

Both can be drafted at any time in parallel with small-giants-wp work. They don't depend on the 6-pipeline orchestrator work. Recommended approach: dispatch to a fresh Sonnet session with the master spec as context, ask it to draft the SKILL.md files through /lifecycle skill-writer. Return to small-giants-wp session afterwards for critical-path execution.

### Autopilot domain-table patch

Not a pipeline. 4 skills invisible to router (playwright, animation-harvest, sgs-discover, sgs-extraction). 1-hour edit to autopilot SKILL.md's domain-classification table. Can be done in any session; doesn't block pipeline work.

### /sgs-extraction 4 factual-error fixes

Small-giants-wp doesn't block on these either. ~30 min of SKILL.md edits. Can be done in any session.

---

## Summary for small-giants-wp Phase 1 scope

**IN scope (critical path):** P1, P2, P3, P4, P6, P7, P9, P12 + gap-analysis/skill-optimiser/pipeline-optimiser enhancements + /qc + /qc-inline + /sgs-extraction remediation + autopilot patch + /frontend-design merge.

**OUT of scope (deferrable, respect dependencies when resumed):** P8, P10, P11, P13 + /brand-voice-replicator + /app-block-library.

**Ship order within the critical path:** P4 first (pitch engine) → P12 (onboarding reveals client-build backlog) → P1/P2/P3 in parallel (unblock revenue) → P7 remediation (already formalised) → P6/P9 support infrastructure.
