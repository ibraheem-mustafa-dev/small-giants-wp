# Research Council — Toolkit Reference

Extracted from SKILL.md 2026-07-16 (detail lives here so the skill body stays short; it loads only when needed). This is the full detail for Stage 1 research mechanics and subagent tool rules. The SKILL body carries the summary; this file is loaded by the dispatched researchers.

## Source hierarchy — community-validated sources FIRST

1. **Reddit:** `python ~/.claude/hooks/search.py "site:reddit.com [topic]"` — real practitioners discussing the problem

   Reddit complaint patterns (use these exact templates):
   - `python ~/.claude/hooks/search.py "site:reddit.com [competitor] complaints OR frustrated OR disappointed"`
   - `python ~/.claude/hooks/search.py "site:reddit.com [topic] what are you using OR what do you recommend"`
   - `python ~/.claude/hooks/search.py "site:reddit.com [competitor] alternative OR switched from"`
   - `python ~/.claude/hooks/search.py "site:reddit.com [topic] failed OR shut down OR dead"`
2. **GitHub:** Use GitHub MCP — issues, discussions, code. A maintainer's comment is worth more than 10 blog posts
3. **Hacker News:** `python ~/.claude/hooks/search.py "site:news.ycombinator.com [topic]"` — the comments, not the article
4. **Personal blogs:** `python ~/.claude/hooks/search.py "[topic] blog 2026"` — practitioners writing about what they built
5. **YouTube:** Search for recent talks, use `python ~/.agents/skills/watch/scripts/watch.py` for key videos
6. **Discord/forum archives:** `python ~/.claude/hooks/search.py "[topic] discord" OR "[topic] forum"`
7. **THEN official docs:** Use the Context7 MCP (`resolve-library-id`, then `query-docs`) for current docs for current version, not stale training data

Community-validated sources are Tier 3 by the classification system, but they are searched FIRST because they surface what official docs don't cover yet. The tier classification is for weighting evidence, not for search order.

## Deep Dive tool table (Stage 1B)

| Tool | How to invoke | When to use |
|------|--------------|------------|
| Firecrawl | Invoke `/firecrawl-cli` skill via `Skill` tool, or use `python ~/.claude/hooks/search.py "query"` / `firecrawl scrape URL` in Bash | ALL external web research. Never WebSearch or WebFetch |
| Brave Search | `curl -s "https://api.search.brave.com/res/v1/web/search?q=QUERY&count=10" -H "Accept: application/json" -H "Accept-Encoding: gzip" -H "X-Subscription-Token: $BRAVE_API_KEY" 2>/dev/null \|\| true` via Bash | Independent index — different results from Firecrawl. $0.005/query, 1000 free/month |
| SerpAPI | `curl -s "https://serpapi.com/search.json?q=QUERY&api_key=$SERPAPI_KEY&num=10"` via Bash | Real Google search results — use when Firecrawl/Brave give weak results. 100/month free |
| Context7 | Context7 MCP (`resolve-library-id`, then `query-docs`) | Any topic involving a library, framework, or tool |
| GitHub MCP | MCP tools: `github:search_code`, `github:get_file_contents`, `github:list_commits` | Any topic involving a repository |
| YouTube research | `python ~/.agents/skills/watch/scripts/watch.py` via Bash with video URL | Expert videos on the research topic — richer than text sources. Search YouTube for "[topic] expert talk" or "[topic] deep dive". (Sanctioned video exception — Gemini backs video ingestion only because Claude cannot watch video.) |
| Playwright CLI | `npx playwright` via Bash | When research involves a live website — screenshot it |
| Tavily | Python: `from tavily import TavilyClient` (key in `C:/Users/Bean/.claude/secrets/api-keys.env`) | Fallback for quick factual lookups |
| Google Fact Check API | `curl` via Bash (see SKILL.md API Keys) | **MANDATORY** for every factual claim |

**MANDATORY TOOL CHECKPOINT — before submitting output:**
- Confirm you ran at least one Brave Search query independent of Firecrawl (command above, with your query)
- Record the Brave query and result count in your sources
- If you did NOT run Brave Search, run it now before submitting

## Mandatory research requirements (Stage 1B)

1. **Source quality tiers** — classify every source:
   - **Tier 1:** Official docs, peer-reviewed papers, primary sources
   - **Tier 2:** Reputable blogs, industry reports, conference talks
   - **Tier 3:** Community forums, Stack Overflow, Reddit
   - **Tier 4:** Unverified, single-source, anecdotal
2. **Citation format:** `[Source: Author/Org, "Title", URL, Date, Tier X]`
3. **Counter-research** — for every major claim, actively search for contradicting evidence. Required, not an afterthought.
4. **Complaint/criticism research** — search for negative reviews, complaints, and critiques of any tool or approach being recommended.
5. **Fact Check API verification** — every factual claim verified via Google Fact Check Tools API:
   ```bash
   source C:/Users/Bean/.claude/secrets/api-keys.env 2>/dev/null || source .env 2>/dev/null
   # Keys loaded from local env — never transmitted beyond API endpoint
   # Primary: GEMINI_API_KEY (Google Cloud key — not an LLM call) | Fallback: GOOGLE_API_KEY_MAIN | Last resort: GOOGLE_API_KEY_FREE
   curl -s "https://factchecktools.googleapis.com/v1alpha1/claims:search?query=CLAIM&key=$GEMINI_API_KEY"
   ```
6. **Cross-reference** claims across 3+ independent sources.
7. **Flag unverifiable claims** explicitly with confidence level (High/Medium/Low).

## Research failure modes (handle explicitly, don't silently fail)

| Situation | What to do |
|-----------|-----------|
| Can't find 20 sources | Acceptable if niche. Document why. Present what exists with honest confidence levels |
| Sources fundamentally contradict | Present both sides with evidence weight. Flag for Council Head |
| Topic too broad | Split into sub-questions, research each, present as connected findings |
| All sources are Tier 3-4 | Flag explicitly, lower confidence scores, recommend user verify independently |
| Fact Check API returns empty | Common — the API is sparse. Treat as "no fact-check data available" (not "claim is false"). Fall back to cross-referencing across 3+ independent sources. Note in output: "Fact Check API: no data. Verified via cross-reference." |

## Subagent tool rules

When dispatched as a subagent, follow these EXACT tool invocations:

- **Web search:** Bash `python ~/.claude/hooks/search.py "query"`. NEVER WebSearch or WebFetch — inferior results, no site: operators.
- **Brave Search:** Bash curl command from the tool table above.
- **Memory (local markdown, canonical):** Search prior findings via Bash `grep -ril "QUERY" "C:/Users/Bean/.claude/memory/research/"`. Store by writing the finding file to `C:/Users/Bean/.claude/memory/research/[YYYY-MM-DD]-[topic-slug].md` (see SKILL.md persistence step). This global memory folder is the only durable record.
- **Context7:** Context7 MCP (`resolve-library-id`, then `query-docs`).
- **GitHub:** MCP tools: `mcp__plugin_github_github__search_code`, `mcp__plugin_github_github__search_issues`.

If Bash is blocked, use WebSearch as a LAST RESORT only and note the degraded results in your output.
