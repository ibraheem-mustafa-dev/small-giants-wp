# AI + WordPress Community Research

**Date:** 2026-04-29
**Time-box:** 15 min
**Source agent:** background research dispatch during Phase 1c, Step 14a
**Stored to disk by:** parent session (sub-agent had no Write permission)

## Top 5 patterns / projects found

1. **WordPress/agent-skills** — official skills repo from the WordPress core team. Covers blocks, themes, plugins as portable Claude Code skills with verification steps and deterministic helper scripts. Progressive-disclosure pattern (short SKILL.md + deep-dive references for `block.json`, deprecations, REST controllers). Closest analogue to SGS's `sgs-wp-engine`. <https://github.com/WordPress/agent-skills>

2. **WordPress.com Claude Code plugin + Studio** — official WP.com plugin pairing Claude Code with the Studio local-dev tool. Sandboxes work in a preview environment before pushing live. "AI-built, human-reviewed" as the default loop. <https://developer.wordpress.com/wordpress-com-claude-code-plugin/> · <https://wordpress.com/blog/2026/02/12/build-wordpress-plugins-with-ai-claude-code/>

3. **10up/localwp-agent-tools** — Local (Flywheel) add-on providing an MCP server, skills, and project context to any MCP-aware AI client. Agency-grade, tool-agnostic — same skills + MCP architecture SGS uses. <https://github.com/10up/localwp-agent-tools>

4. **Automattic/claude-woocommerce-toolkit** — Automattic's official Claude Code skills/agents for building *and reviewing* WP/WooCommerce plugins. Notable because review is baked into the toolkit, not just authoring. <https://github.com/Automattic/claude-woocommerce-toolkit>

5. **Atomic Skills + Pass/Fail Criteria methodology (Ralphable)** — not WP-specific but the dominant framework being cited for hallucination reduction. Decompose work into indivisible units, each with 2–3 objective pass/fail conditions; iterate until pass before advancing. Reported ~60% reduction in silent logic errors. <https://ralphable.com/blog/claude-code-hallucination-problem-atomic-skills-reliable-output>

Honourable mentions: Elliott Richmond's guardrails post (<https://elliottrichmond.co.uk/building-a-claude-code-plugin-for-wordpress/>), Jonathan Bossenger's AI-built block theme walkthrough (<https://jonathanbossenger.com/2026/04/how-i-built-deployed-custom-wordpress-block-theme-claude-ai/>), Elementor **Angie** for screenshot-to-block (<https://elementor.com/products/angie-ai-for-wordpress/>), **Telex** for Playground-previewed AI block generation.

## Common pitfalls cited

- AI writes "functional code that isn't WordPress code" — bypasses `wp_enqueue_scripts`, raw SQL instead of `$wpdb->prepare()`, missing nonces/capability checks, no escaping (Richmond).
- AI fabricates endpoints, hook names, `block.json` attributes when not grounded against a real schema (multiple sources).
- Dumping all reference docs upfront blows context — progressive disclosure beats giant CLAUDE.md (WordPress agent-skills).
- No checkpoint loop = silent compounding errors; verification only at the end fails (Ralphable).
- Editing live before sandbox preview — why WP.com mandates Studio and Angie mandates a preview env.

## Applicable to SGS named skills

- **/verify-loop** — adopt the atomic-skills pass/fail criteria pattern: each step ships with 2–3 objective tests, loop only advances on green. **Already aligned with rubric criteria 3 + 5.**
- **/qc** — Automattic's WooCommerce-toolkit review agents are the closest comparator; worth lifting their rubric structure.
- **/visual-qa** — Angie's screenshot-to-implementation diff and WP.com Studio's preview-then-promote flow validate SGS's 8-layer pipeline direction; nothing community-side is more sophisticated.
- **/ui-ux-pro-max** — no direct community analogue found. SGS appears ahead here. (Bean's earlier question — "is the WP/PHP gap a high-impact opportunity?" — confirmed: yes, because there's no public alternative to lift from. Custom adaptation is the right path.)

## 2–3 ideas worth adopting

1. **Cross-check `block.json`/hook names against a verified schema before write.** SGS already has this via `wp-devdocs`/`wp-blockmarkup` MCPs and the 619-attribute SQLite DB. Make it *mandatory* in `/wp-block-development` and `/qc`, not optional.
2. **Pass/fail criteria attached to every plan step.** Extend `/strategic-plan` and `/phase-planner` to require 2–3 testable conditions per step; `/verify-loop` consumes them. Matches Ralphable's measured 60% error reduction.
3. **Studio-style sandbox-before-promote.** SGS currently deploys direct to palestine-lives.org. A WP Playground or Local-based preview gate before tar-deploy would match the WP.com pattern and catch OPcache/LiteSpeed gotchas earlier.

## Verdict

**Parallel, leaning ahead.** The community converged on the same three primitives SGS already runs: progressive-disclosure skills, MCP-grounded schemas to prevent hallucination, human-in-the-loop checkpoints. SGS's 55-block plugin + theme + 8-layer visual-QA pipeline + 619-attribute SQLite knowledge base is more mature than any single public repo found — `WordPress/agent-skills` and `10up/localwp-agent-tools` are the only comparable agency-grade efforts, and neither pairs skills with a built block library or a visual-QA pipeline. SGS lags on two specific patterns worth importing: the atomic pass/fail-criteria loop (Ralphable) and a sandbox-preview gate before live deploy (WP.com Studio / Angie). Everything else is at-or-ahead of community state-of-the-art as of April 2026.