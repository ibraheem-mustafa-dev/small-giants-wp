# SearXNG Engines — Live Inventory, Targeting, Expansion

SearXNG aggregates search results from many upstream engines. This reference explains how to **list** what's active, **target** specific engines or categories from queries, and **expand** the engine list.

## Installation location

| Aspect | Path |
|---|---|
| Host | WSL2 Ubuntu on Bean's PC |
| HTTP endpoint | `http://localhost:8888` (forwarded from WSL) |
| Source + default config | `/usr/local/searxng/searxng-src/searx/settings.yml` (in WSL) |
| User overrides | `/etc/searxng/settings.yml` (in WSL) |
| uWSGI config | `/etc/uwsgi/apps-available/searxng.ini` (in WSL) |
| Service control | `sudo systemctl restart uwsgi` (in WSL, NOPASSWD for `blub` user) |
| Wired into | `$SEARXNG_URL` in `C:/Users/Bean/.claude/secrets/api-keys.env` → `search.py` engine chain |

Fallback: if local SearXNG is down, `search.py` chains to Brave → Firecrawl → SerpAPI → Tavily automatically.

## List engines (always live — do not inline cached lists)

```bash
python ~/.claude/hooks/search.py engines             # human-readable, grouped by category
python ~/.claude/hooks/search.py engines --json      # machine-readable
```

Reads both the source defaults + user overrides and merges them. Do NOT hardcode engine lists in prompts — call the CLI so the list stays accurate across updates.

### Current snapshot (2026-04-17)

- **114 engines enabled** across 16 categories
- **167 more available** but disabled by default

Key categories (what's in each):
- `general` (75): Google, Bing, DuckDuckGo, Wikipedia, Wikidata, Brave, Startpage, Qwant, Yahoo, Mojeek, arXiv, bing news, bing videos, artic, astrophysics data system, many niche wikis
- `images` (9): Google Images, Bing Images, Flickr, DuckDuckGo Images, Openverse, Brave Images, Qwant Images, Startpage Images
- `it` (9): StackOverflow, AskUbuntu, MDN, Docker Hub, Hoogle, MankierPages, Gentoo, Azure docs
- `news` (6): Brave News, DuckDuckGo News, Qwant News, Startpage News, WikiNews, Karmasearch News
- `videos` (5): Brave Videos, DuckDuckGo Videos, Qwant Videos, Piped (YouTube frontend), Wikicommons Videos
- `science` (2): OpenAIRE datasets + publications
- `packages` (2): Docker Hub, Hoogle
- `q&a` (3): StackOverflow, AskUbuntu, SuperUser
- `music` (3): Bandcamp, Piped Music, Wikicommons Audio
- `dictionaries` (2): Etymonline, Wiktionary
- `files` / `onions` / `cloud` / `software wikis` / `wikimedia` / `web`: smaller specialist sets

**For the live list, ALWAYS run the CLI.** This doc refreshes manually; the CLI reads live config.

## Target a specific engine or category in a query

SearXNG supports `!bangs` (engine shortcuts) inside the query itself. These work through `search.py` since the query passes through verbatim:

```bash
# Target ONE engine
python ~/.claude/hooks/search.py "!google anthropic claude api"
python ~/.claude/hooks/search.py "!ddg privacy search"
python ~/.claude/hooks/search.py "!wikipedia BCP 47"

# Target a CATEGORY (queries only engines in that category)
python ~/.claude/hooks/search.py "!images sunrise gradient"
python ~/.claude/hooks/search.py "!news food wholesale UK 2026"
python ~/.claude/hooks/search.py "!it uwsgi socket vs http"
python ~/.claude/hooks/search.py "!science LLM multi-agent failure"

# Combine: multiple engines in one query
python ~/.claude/hooks/search.py "!google !ddg claude prompt caching"
```

The `!bang` must appear at the start of the query. Full bang list: `python ~/.claude/hooks/search.py engines`.

Alternatively, force search.py to ignore SearXNG routing and go directly to Brave / Firecrawl / SerpAPI / Tavily:

```bash
python ~/.claude/hooks/search.py "query" --engine brave
python ~/.claude/hooks/search.py "query" --engine firecrawl
```

Use `--engine brave` when you need Brave's independent index specifically. Use category bangs above when you want SearXNG's aggregation but narrower.

## Enable a currently-disabled engine

1. SSH into WSL: `wsl -d Ubuntu`
2. Edit `/etc/searxng/settings.yml` (note this is the override file — DON'T edit the source settings.yml under `/usr/local/searxng/searxng-src/searx/`):

   ```yaml
   engines:
     - name: <engine-name>        # exact name from `search.py engines` --json
       disabled: false
   ```

3. Restart uWSGI: `sudo systemctl restart uwsgi` (no password needed — NOPASSWD configured)
4. Verify: `python ~/.claude/hooks/search.py engines | grep <engine>` should now show it in its category group.

Disable the reverse way: `disabled: true` override.

## Add a completely new engine (not bundled)

SearXNG supports custom engines via Python modules. Rarely needed — the 281 bundled cover most cases. If needed:
1. Drop a `.py` engine file under `/usr/local/searxng/searxng-src/searx/engines/` (follow existing pattern in that dir)
2. Add an override entry in `/etc/searxng/settings.yml` referencing `engine: <your_module>`
3. Restart uWSGI and verify via the CLI

Full dev guide: `https://docs.searxng.org/dev/engines/engine_overview.html`

## When to use SearXNG vs dedicated engines

| Scenario | Use |
|---|---|
| General web research | SearXNG (auto — it's first in the chain) |
| Independent cross-check (validate one engine's claim) | `search.py "Q" --engine brave` — routes through Brave's index specifically |
| Page scraping / JS rendering / specific URL reading | `search.py scrape "https://url"` (firecrawl under the hood) |
| Shopping / Google vertical data | `search.py "Q" --engine serpapi` (structured SERP access) |
| AI-synthesised answer with citations | `search.py "Q" --engine tavily` |
| Category-scoped (only images / only news / only science) | `!images`, `!news`, `!science` bangs in the query |
| Targeted single engine (e.g. just DuckDuckGo) | `!ddg`, `!google`, `!bing` bangs in the query |

## Health check

```bash
python ~/.claude/hooks/search.py health
```

Shows `[+] searxng: ok` when the local instance is reachable, `[X] searxng: down` when it isn't. If down:
1. Is WSL2 running? `wsl -l -v` from Windows.
2. Is uWSGI running? `wsl -d Ubuntu -- systemctl is-active uwsgi`
3. Is port 8888 bound? `wsl -d Ubuntu -- ss -tln | grep 8888`
4. Restart: `wsl -d Ubuntu -- sudo systemctl restart uwsgi`

## Known constraints

- Local-only by design. `http-socket = 0.0.0.0:8888` binds inside WSL's private bridge; not exposed to LAN.
- Limiter disabled in `/etc/searxng/settings.yml` — fine for local dev. **Do NOT** enable the limiter unless putting this behind a public-facing reverse proxy.
- JSON format is enabled under `search.formats`. HTML also enabled for browser access at `http://localhost:8888`.
