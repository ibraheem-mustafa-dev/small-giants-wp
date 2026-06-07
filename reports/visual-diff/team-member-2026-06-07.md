---
block: team-member
date: 2026-06-07
verdict: PASS
first_paint_capture_passed: true
---

# Visual-diff — sgs/team-member parking quick-task fix — 2026-06-07

**Change:** Non-visual (P-TEAM-MEMBER-SCHEMA-ORG-SAMEAS-RESTORATION): restored the Person JSON-LD `sameAs` array (lost in the socialLinks→InnerBlocks refactor) by collecting child sgs/social-icons URLs. No rendered-output change — JSON-LD only (invisible to users, visible to crawlers).

**Verification:** `npm run build` clean; `php -l` clean. Part of the parking staleness-sweep quick-task wave.

first_paint_capture_passed: true
