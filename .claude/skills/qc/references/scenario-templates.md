# Scenario Templates — QC Pipeline

Reusable test scenario starters by target type. Used by Stage 2 (Scenario-Generate).

Each template is a starting point — adapt inputs and expected outputs to the specific target.

---

## Website Targets

### Template W1 — Golden Path: Homepage Loads
- **Input:** Navigate to the root URL
- **Expected output:** 200 HTTP status, page title matches brand, hero section visible, no console errors
- **Verify method:** Playwright screenshot at 375/768/1440 px + `browser_console_messages`
- **Category:** golden

### Template W2 — Edge Case: 404 Page
- **Input:** Navigate to `/this-page-does-not-exist-qc-test`
- **Expected output:** Custom 404 page shown, site navigation still functional, correct HTTP status 404
- **Verify method:** Playwright screenshot + HTTP status check
- **Category:** edge

### Template W3 — Edge Case: Mobile Nav
- **Input:** Resize to 375 px, attempt to open navigation
- **Expected output:** Hamburger menu opens, all nav items accessible, no overflow clipping
- **Verify method:** Playwright at 375 px, click hamburger, screenshot after open
- **Category:** edge

### Template W4 — Failure Mode: Contact Form Submission
- **Input:** Submit contact form with invalid email address
- **Expected output:** Inline validation error shown, form does not submit
- **Verify method:** Playwright — fill form, click submit, screenshot error state
- **Category:** failure

### Template W5 — Failure Mode: Slow Network
- **Input:** Throttle to 3G, load the homepage
- **Expected output:** Page loads within 10 seconds (reasonable on 3G), no broken layouts during load
- **Verify method:** Playwright network throttle + screenshot at DOMContentLoaded
- **Category:** failure

### Template W6 — Accessibility: Keyboard Navigation
- **Input:** Tab through the page from the top without using a mouse
- **Expected output:** Focus indicator visible on every interactive element, logical tab order, no keyboard traps
- **Verify method:** axe-core via `mcp__a11y__audit_webpage` + Playwright keyboard tab sequence
- **Category:** a11y

### Template W7 — Accessibility: Colour Contrast
- **Input:** Load the page
- **Expected output:** All text meets WCAG 2.2 AA contrast ratio (4.5:1 for normal text, 3:1 for large)
- **Verify method:** `mcp__a11y__audit_webpage` + axe contrast rule check
- **Category:** a11y

---

## Skill Targets

### Template S1 — Golden Path: Primary Use Case
- **Input:** Invoke skill with the canonical example from its `argument-hint`
- **Expected output:** Skill completes without error, output matches format described in `## Goal`
- **Verify method:** Capture stdout, compare against expected format
- **Category:** golden

### Template S2 — Edge Case: Empty Input
- **Input:** Invoke skill with an empty or minimal argument
- **Expected output:** Graceful error message or clarifying question — not a crash
- **Verify method:** Capture stdout and stderr, confirm no unhandled exception
- **Category:** edge

### Template S3 — Edge Case: Long Input
- **Input:** Invoke skill with an unusually long argument (>500 chars)
- **Expected output:** Skill either processes it or rejects it cleanly — no silent truncation
- **Verify method:** Capture stdout, confirm output references the full input or explains truncation
- **Category:** edge

### Template S4 — Failure Mode: Missing Dependency
- **Input:** Invoke skill when a declared dependency (tool, script, MCP) is unavailable
- **Expected output:** Clear error naming the missing dependency, not a generic crash
- **Verify method:** Disable the dependency, invoke skill, capture error output
- **Category:** failure

### Template S5 — Failure Mode: Incorrect Argument Type
- **Input:** Pass a URL to a skill that expects a file path, or vice versa
- **Expected output:** Skill validates input and reports the mismatch
- **Verify method:** Capture stdout, confirm error message is actionable
- **Category:** failure

---

## Feature Targets

### Template F1 — Golden Path: Primary Feature Flow
- **Input:** Invoke the feature's primary endpoint or function with valid data
- **Expected output:** Expected return value, expected side effects (DB writes, file creation, etc.)
- **Verify method:** Run existing test suite or invoke endpoint + check response + verify side effects
- **Category:** golden

### Template F2 — Edge Case: Boundary Values
- **Input:** Minimum valid value, maximum valid value for each input field
- **Expected output:** Feature handles both without error or unexpected behaviour
- **Verify method:** Run with min/max inputs, capture output, diff against expected
- **Category:** edge

### Template F3 — Edge Case: Concurrent or Repeated Invocation
- **Input:** Invoke the feature twice in quick succession with the same input (e.g. double-submit a form, call an endpoint twice with the same idempotency key)
- **Expected output:** Second invocation is handled gracefully — either the same result as the first (safe to run multiple times) or a clear rejection, with no duplicate side effects
- **Verify method:** Invoke twice, compare responses and check for duplicate DB rows / files
- **Category:** edge

### Template F4 — Failure Mode: Invalid Data
- **Input:** Null, empty string, or wrong type for each required field
- **Expected output:** Validation error returned, no data written, no crash
- **Verify method:** Capture error response, confirm DB unchanged
- **Category:** failure

### Template F5 — Accessibility: UI Entry Points
- **Input:** If the feature has a UI surface (form, modal, wizard step), run axe-core on it
- **Expected output:** Zero critical or serious accessibility violations; all form fields have labels; error messages are associated with their inputs via `aria-describedby`
- **Verify method:** `mcp__a11y__audit_webpage` on the feature's UI URL + Playwright keyboard navigation through the form
- **Category:** a11y

---

## Block Targets (Gutenberg)

### Template B1 — Golden Path: Block Renders in Editor
- **Input:** Insert block into a WordPress editor page
- **Expected output:** Block appears with correct default state, no block validation errors
- **Verify method:** Playwright screenshot of editor + check console for block validation errors
- **Category:** golden

### Template B2 — Golden Path: Block Renders on Frontend
- **Input:** Publish page with block, visit the frontend URL
- **Expected output:** Block renders correctly at 375/768/1440 px, matches design reference
- **Verify method:** Playwright screenshots at all 3 breakpoints
- **Category:** golden

### Template B3 — Edge Case: Empty Attributes
- **Input:** Insert block with all optional attributes empty
- **Expected output:** Block renders fallback state gracefully, no PHP warnings
- **Verify method:** Screenshot of frontend + check PHP error log
- **Category:** edge

### Template B4 — Failure Mode: Block with Corrupt Attributes
- **Input:** Manually set a required block attribute to an invalid value (wrong type, out-of-range number, or empty string where content is required)
- **Expected output:** Block renders a visible fallback or error state — no blank white space, no PHP fatal error, no block validation notice in the editor
- **Verify method:** Playwright screenshot of frontend + check PHP error log for warnings
- **Category:** failure

### Template B5 — Accessibility: Block Interactive Elements
- **Input:** Render block on frontend, run axe-core
- **Expected output:** Zero critical or serious accessibility violations
- **Verify method:** `mcp__a11y__audit_webpage` on the published page URL
- **Category:** a11y

---

## Pipeline Targets

### Template P1 — Golden Path: Full Run
- **Input:** Invoke pipeline with valid canonical input
- **Expected output:** Each stage artifact written, final artifact has `status: complete`
- **Verify method:** Check each stage-N-*.json exists and passes `validate-pipeline-artifact.py`
- **Category:** golden

### Template P3 — Edge Case: Missing Optional Input
- **Input:** Invoke pipeline with a valid target but omit all optional flags (no `--type`, no `--goal`, no `--skip-code-review`)
- **Expected output:** Pipeline applies correct defaults for each omitted flag — no crash, no silent wrong behaviour
- **Verify method:** Capture stage-0-detect.json and confirm `type` was auto-detected; confirm pipeline reaches Stage 6 without error
- **Category:** edge

### Template P4 — Failure Mode: Kill Gate Trigger
- **Input:** Craft input that will trigger a declared kill gate condition
- **Expected output:** Pipeline halts at the correct stage, writes HALT.json with reason
- **Verify method:** Confirm HALT.json exists with correct stage ID and kill gate message
- **Category:** failure

---

## Notes

- Scenario names should be unique within a QC run to avoid collisions in the evidence record.
- `verify_type: manual` is reserved for scenarios that require human judgement (e.g. "does this look professional?"). These are documented but not executed automatically.
- Accessibility scenarios (category: `a11y`) are mandatory for any target with a UI surface.
