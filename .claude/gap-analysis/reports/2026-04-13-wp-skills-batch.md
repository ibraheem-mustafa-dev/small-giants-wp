# Gap Analysis: WP Skills Batch (10 Skills)

**Date:** 2026-04-13
**Session:** C (SGS Skill System Upgrade)
**Evaluator:** Claude Opus 4.6 (self-preference counteract applied)
**Drift check:** Last 5 skill evaluations avg 3.92. No identical-score pattern. No drift.

## Batch Summary

| # | Skill | Score | Grade | Worst Criterion | Best Criterion | Gaps |
|---|-------|-------|-------|-----------------|----------------|------|
| 1 | sgs-wp-engine | 3.59 | B | exemplar_quality (2.5) | ecosystem_awareness (4.5) | 8 |
| 2 | wp-block-development | 3.64 | B | exemplar_quality (2.0) | completeness (4.2) | 7 |
| 3 | wp-block-themes | 4.00 | B | exemplar_quality (3.0) | ecosystem_awareness (4.5) | 6 |
| 4 | wp-interactivity-api | 4.10 | B | security (3.5) | exemplar_quality (4.5) | 6 |
| 5 | wp-plugin-development | 4.16 | B | exemplar_quality (3.8) | security (4.5) | 6 |
| 6 | wp-rest-api | 3.33 | C | exemplar_quality (1.5) | routing_accuracy (4.0) | 9 |
| 7 | wp-wpcli-and-ops | 3.09 | C | exemplar_quality (1.5) | routing_accuracy (4.0) | 9 |
| 8 | wp-site-extraction | 3.66 | B | security (2.5) | completeness (4.2) | 6 |
| 9 | wp-performance | 4.11 | B | security (3.0) | ecosystem_awareness (4.5) | 6 |
| 10 | wp-project-triage | 2.83 | C | exemplar_quality (1.5) | clarity (3.8) | 6 |

**Batch average: 3.65 (B)**
**Best performer:** wp-plugin-development (4.16)
**Worst performer:** wp-project-triage (2.83)
**C-grade skills requiring priority fixes:** wp-rest-api, wp-wpcli-and-ops, wp-project-triage

## Personas

- Bean (non-coder, ADHD): clarity 1.5x, exemplar 1.3x
- Claude-as-developer: completeness 1.3x, robustness 1.3x

## Cross-Skill Patterns

1. **Missing Worked Examples (7/10)** — single biggest quality differentiator. Skills WITH examples avg 4.13, WITHOUT avg 3.08.
2. **Missing Infrastructure Files (8/10)** — only 2 have correction-ledger, only 1 has backlog.
3. **Security Gaps in Ops Skills (3/10)** — REST (no rate limiting), WP-CLI (no credentials), extraction (no sanitisation).
4. **WP 7.0 Coverage Gaps (3/10)** — watch(), state.navigation, viewport visibility all missing.
5. **SKILL.md vs References Balance (2/10)** — wp-wpcli-and-ops and wp-project-triage too thin.

## Total Gaps: 69

| Opportunity Grade | Count |
|-------------------|-------|
| A (critical) | 11 |
| B (important) | 39 |
| C (nice to have) | 19 |

## Priority Actions (Session E-F)

### P0 (batch, low effort)
1. Create correction-ledger.md + backlog.md for 8 missing skills
2. Add routing destination map to wp-project-triage
3. Add sample JSON output to wp-project-triage
4. Fix duplicate Stage 9 in wp-site-extraction

### P1 (medium effort, high impact)
5. Add worked example to wp-rest-api (Post Grid endpoint)
6. Add worked example to wp-wpcli-and-ops (search-replace migration)
7. Add worked example to wp-block-development (dynamic block build)
8. Add rate limiting + CORS + JWT to wp-rest-api
9. Add WP 7.0 watch() + state.navigation to wp-interactivity-api
10. Bring top 3 workflows into wp-wpcli-and-ops main SKILL.md

### P2 (medium effort)
11. Add WP 7.0 viewport visibility to wp-block-development + wp-block-themes
12. Add CWV measurement to wp-performance
13. Add content sanitisation to wp-site-extraction
14. Sync gotchas to sgs-wp-engine
15. Add create-block-theme plugin to wp-block-themes

## Research Sources

- developer.wordpress.org/news (Feb-Apr 2026)
- make.wordpress.org/core (WP 7.0 Interactivity API changes)
- kinsta.com/blog/wordpress-6-9
- wpthrill.com (REST API security)
- wp-rocket.me/blog (endpoint security)
- attowp.com (WP 7.0 guide)
- mehulgohil.com (Interactivity API 2026)
