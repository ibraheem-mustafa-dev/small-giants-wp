# Framework Header Stub Pattern Audit — 2026-05-20

**Scope:** P-S18-TRANSPARENT-PATTERN-IS-STUB (Branch J, Task J2)
**Auditor:** Subagent, cold start.
**Instruction:** Report only — do NOT delete stub files. Bean decides.

---

## Current content of each stub pattern

### `theme/sgs-theme/patterns/framework-header-transparent.php`

```php
// TODO(v1.1): variant-specific markup + transparent-over-hero behaviour.
<!-- wp:pattern {"slug":"sgs/framework-header-default"} /-->
```

Single delegation. No custom markup, no CSS classes, no wrapper. Renders byte-for-byte identical HTML to the default pattern.

---

### `theme/sgs-theme/patterns/framework-header-sticky.php`

```php
// TODO(v1.1): variant-specific markup + scroll-pin behaviour.
<!-- wp:pattern {"slug":"sgs/framework-header-default"} /-->
```

Single delegation. No custom markup, no CSS classes, no wrapper.

---

### `theme/sgs-theme/patterns/framework-header-shrink.php`

```php
// TODO(v1.1): variant-specific markup + shrink-on-scroll behaviour.
<!-- wp:pattern {"slug":"sgs/framework-header-default"} /-->
```

Single delegation. No custom markup, no CSS classes, no wrapper.

---

## Context: Branch I's expected behaviour layer

Branch I (file-disjoint from this branch) is building `Sgs_Header_Behaviours` — a PHP class that injects a body class (e.g. `sgs-header--sticky`) based on the active Customiser rule. Once Branch I ships, behaviours like sticky, shrink, and transparent will be triggered by a rule configuration, not by which pattern the operator inserted. The pattern and the behaviour will be independent concerns.

---

## Options

### Option A — Keep the stubs as "starter packs" in the pattern inserter

An operator opening the inserter sees three named choices: "Sticky", "Shrink", "Transparent". They pick one, it inserts the default markup, and the Customiser rule that fires the matching body class is pre-configured for them (if a rule-seeding mechanism is added later). The stub patterns become a discoverability shortcut: "here is the starting point for a sticky header."

**Trade-offs:**
- Adds friction later when Branch I ships: the pattern name implies the behaviour is self-contained, but it isn't — an operator who inserts "Sticky Header" still has to configure the rule engine separately. That mismatch will confuse operators.
- Maintains a catalogue entry that is currently functionally identical to the default, which the Customiser smoke test (P-S18) confirmed produces the same HTML. End-to-end acceptance criterion for the transparent variant ("transparent header renders on homepage when rule fires") remains untestable until either the stub gains its own markup or Branch I's body-class injection reaches the `<header>` element (currently blocked by P-PHASE-2A-WRAPPER-CLASS-NOT-INJECTED).
- Low deletion cost later: if the stubs get real markup they become genuinely useful; if not, deleting them is a one-line git rm.

### Option B — Delete the stubs; force rule configuration as the only path

The operator configures a conditional rule (conditions: `is_front_page`, action: `transparent`) in the header rules admin. No inserter shortcut. The rules engine fires the body class; CSS does the rest once Branch I's wrapper-class injection is unblocked.

**Trade-offs:**
- Cleaner architecture: behaviour is clearly separated from markup, matching the design intent of Spec 17. No phantom "Sticky Header" pattern that implies something the pattern alone can't deliver.
- Removes the UX discovery path: operators who want a sticky header must know to navigate to `SGS → Header Rules` rather than finding a named pattern in the inserter.
- Irreversible until a pattern is re-written with real markup: once deleted, operators lose the inserter shortcut permanently unless the patterns are recreated with distinct markup and CSS.

---

## Recommendation

**Option B — delete the stubs.**

The stubs are misleading as-is. They appear in the pattern inserter as distinct named variants but produce identical HTML. An operator who inserts "Transparent Header" expecting a transparent overlay gets the default header — no visible difference, no behaviour. This will generate support confusion.

The correct workflow post-Branch-I is: operator configures a rule with `behaviour: transparent` in `SGS → Header Rules`, and the behaviour layer does the work. If a future sprint delivers real variant markup with a distinguishing wrapper class and CSS (per the TODO in the parking entry), those patterns can be re-created then with substantive content. Until that sprint is scoped, the stubs are cargo.

One caveat: do not delete until Branch I's wrapper-class injection is unblocked (P-PHASE-2A-WRAPPER-CLASS-NOT-INJECTED). There is no point deleting a false shortcut before the real path (rule → body class → CSS) is verified live. Once Branch I is confirmed working on sandybrown, delete all three stubs in a single commit.

**Timing: delete after Branch I wrapper-class fix is verified, not before.**
