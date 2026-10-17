# Design Mode: Worked Example

## Setup
Bean says: `/brainstorming design client site health report`. He wants a short weekly summary of how his SGS client sites are doing, emailed to him.

## Stage 0: Context check
> *(Silently reads the cloudflare-toolkit site inventory, the uptime check config and the wp-wpcli-and-ops notes. Finds: Cloudflare analytics reachable via cloudflare-toolkit, uptime checks already running, WP-CLI can list pending core, plugin and theme updates per site. No existing weekly report.)*

## Stage 2: Clarifying question

> "Before we design the format, who is the report for? Is it just you reading it on Monday morning, or might some of it end up in front of clients too?"

Bean: "Just me. I want to know which sites need attention, not a pile of numbers."

> "Got it. So the priority is a short list of what needs action, not a full analytics dump. One more: should it cover the last seven days, or everything since the last report?"

Bean: "Last seven days, Monday to Sunday."

## Stage 3: Approaches

**Option A: Structured digest (recommended)** A fixed-section email: sites with problems first, then pending updates, then traffic changes. One line per site. Sent Monday at 07:00. Predictable format means Bean's brain knows where to look. Con: may feel formulaic in a quiet week.

**Option B: Narrative summary** A short paragraph per site in plain English. Easier to read at first glance. Con: inconsistent length, harder to scan for failures, no structured data to compare week on week.

**Option C: Alert-only** An email only when something is wrong. Least noise. Con: silence is ambiguous (healthy, or the check broke?), and traffic trends never surface.

Recommendation: **Option A**. Scannable, consistent, and a quiet week still confirms the checks ran. Option C hides failures of the report itself, which is the worst failure for an ADHD brain that relies on the signal.

Bean: "Option A. But keep it short, no walls of text."

## Stage 4: Design (abbreviated)

**Sections of the report:**

1. **Needs attention:** any site that had downtime, a failed uptime check or a traffic drop over 30 percent week on week, max 3 items
2. **Updates pending:** per site, count of core, plugin and theme updates waiting (from WP-CLI)
3. **Traffic:** requests and unique visitors per site against the previous week (from Cloudflare analytics)

**Delivery:** one plain-text email to Bean, triggered by a scheduled headless run on Monday at 07:00. If more than 8 sites are listed, group healthy sites into a single line.

**Format:**
```
Subject: Client sites, week of 28 Sep

Needs attention:
- [site]: [issue]

Updates pending:
- [site]: 1 core, 3 plugins

Traffic (vs last week):
- [site]: 1,240 visitors (+6%)
```

> "Does that structure look right? I want to confirm before writing the spec."

Bean: "Yes. And no charts, plain text only."

> *(Revises: removes the sparkline idea, keeps one line per site.)*

## Stage 5: Spec written

Saved to: `./specs/2026-10-03-client-site-health-report-design.md` Committed to git.

## Stage 6: Spec review loop

> *(Dispatches spec-document-reviewer subagent with: the spec file content, the design constraints, and the question "Does this spec give an implementer everything they need without over-specifying?" Returns: one issue, the delivery section does not say what happens if a Cloudflare API call fails. Fixed: the site is listed under Needs attention as "analytics unavailable" and the rest of the report still sends.)*

Second pass: approved.

## Stage 7: User Review Gate

> "Spec written and committed to `./specs/2026-10-03-client-site-health-report-design.md`. Please review it and let me know if you want to make any changes before we start writing out the implementation plan."

Bean: "Looks good. Let's go."

## Stage 8: Transition to implementation

> *(Invokes strategic-plan skill with the spec as input. Does NOT invoke frontend-design, mcp-builder, or any other skill.)*
