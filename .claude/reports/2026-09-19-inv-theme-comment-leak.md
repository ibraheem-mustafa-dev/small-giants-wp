# Investigation: page.html "WIDTH MODEL" comment appearing as visible text

Date: 2026-09-19. Read-only investigation. No repo file edited except this report; scratch files are in `pipeline-state/_inv-theme-comment-leak/`.

## Plain-English summary

**Problem.** The long developer note at the top of `theme/sgs-theme/templates/page.html` was reported as showing to visitors as text, starting just after the word `<main>`.

**Effect.** If it were real, every visitor would see internal notes ("Bean-ruled", "D725") on every page that uses the template.

**Finding.** It is NOT reproducible on either live site. WordPress serves the note as a proper HTML comment, byte-identical to the file, and a real browser treats it as a comment (a hidden DOM comment node, not text). The exact symptom you described (text starting `` ` is STRUCTURE, not content ... ``) is reproduced precisely by a naive "strip tags with a regex" step (`<[^>]+>`) applied to the served HTML. That regex ends the comment at the first `>` it meets, which is the `>` of the `<main>` written inside the comment. So the leak is in whatever tool extracted the text, not in WordPress or the browser.

**Solution (smallest correct fix).** Remove the literal `<` and `>` characters from the two comments in `page.html` (say "the main element" instead of `` `<main>` ``). That makes the comment safe for any naive extractor and changes no block markup. Exact diff in section 5. 18 other comments in 11 other theme files carry the same pattern (section 4).

## 1. What actually happens (root cause)

| Claim | Status | Evidence |
|---|---|---|
| The served HTML contains the note as ONE intact comment, byte-identical to the repo file | PROVEN | Regex `<!-- WIDTH MODEL.*?-->` on the served page = 1348 chars; repo file's same comment = 1348 chars; `==` is True for both the cached and a cache-busted origin response. No `--` and no nested `<!--` inside it. |
| A real browser does not show it as text | PROVEN | Playwright on the live page: tree walker over TEXT and COMMENT nodes finds `WIDTH MODEL` only as nodeType 8 (comment), length 1341, parent DIV. `document.body.innerText.indexOf('STRUCTURE') === -1`. No text node contains `contentWidth`, `D725`, `Bean-ruled`, `edge-to-edge`, `LOOSE content` or `bare paragraphs`. |
| WordPress does not mangle it | PROVEN (by output) | The comment sits between the header and `<main>` in the served HTML exactly as in the file. It is not a block (no `wp:` prefix), so the parser makes it a freeform chunk (`blockName` null) that `render_block` outputs verbatim. The `render_block` filters in sgs-blocks key on block names. |
| The exact reported symptom is what `re.sub(r'<[^>]+>','',html)` produces | PROVEN | Applied to the served body: output begins `'\n\n\n` is STRUCTURE, not content, so it says contentWidth:"full" and passes width\n     through ...'`. That is the reported text, including the leading backtick that follows `<main>`. Control: `html.parser` text extraction and a comment-aware regex do NOT contain `STRUCTURE`. |
| Which tool the reporter used was such a naive stripper | ASSUMED | Not identified. `pipeline-state/_inv-non-bem/live.html` (another investigator's fetch) contains the raw comment, but its `live.txt` extract does not leak. No script in the repo that I grepped strips tags with `<[^>]+>` over whole live pages (the hits: `golden_expectations.py`, `js_content_resolver.py`, `image_pairing.py`, editor JS for headings/captions, none applicable). The extractor is probably an ad-hoc script or a fetch-and-summarise tool. |
| Site Editor / template-editor canvas does not leak it | NOT CHECKED | Needs a logged-in editor session; I did not log in. Freeform text between blocks in a template is shown as a Classic/HTML block there, so this is the one remaining place a human could actually see it. |

Mechanism, in one line: the comment body contains `` `<main>` ``; a comment ends at `-->`, but a regex tag-stripper ends a "tag" at the first `>`, so everything before `<main>`'s `>` is deleted and everything after it (the rest of the comment) is kept as "text".

## 2. Canary

PROVEN the same, and equally harmless. `https://sandybrown-nightingale-600381.hostingersite.com/` (front page, uses `front-page.html`, which carries an identical 1348-char "WIDTH MODEL" comment): served as a comment; Playwright finds `STRUCTURE`, `WIDTH MODEL` and `contentWidth` only in one nodeType-8 node (length 1341); `innerText` has no `STRUCTURE`. Naive regex strip of the served canary page also reproduces `is STRUCTURE` (True). `/blog/` (`home.html`) serves no such comment. So the canary is exactly as (un)affected as the Eye Care page.

## 3. Secondary finding (real, provable): the notes ship to every visitor

Because HTML comments in a block template are freeform HTML, WordPress emits them in every response: 1348 bytes on each page using `page.html` or `front-page.html`, plus the other templates below. This is not a visible-text bug but it does expose internal notes ("Bean-ruled") in page source. Removing this is a design call (section 5, option B).

## 4. Other templates with the same pattern (git-tracked `theme/sgs-theme` html/php, 73 files scanned)

39 non-block comments scanned; 19 contain a literal `>` and/or a tag-like `<name`. None contains `--`, none is unbalanced (`<!--` count equals `-->` count in every file), none nests a `<!-- wp:` delimiter. So none is a parse defect; all are only vulnerable to a naive tag-stripper.

- `parts/sgs-checkout-content.html` (tag-like)
- `parts/sgs-pdp-content.html` (`>` only)
- `templates/404.html` (3 comments; two tag-like)
- `templates/archive-product.html` (2, tag-like)
- `templates/cart.html`, `templates/checkout.html`, `templates/front-page.html`, `templates/single-product.html` (tag-like)
- `templates/home.html` (`>` only)
- `templates/page.html` (2, tag-like)
- `templates/product-search-results.html`, `templates/taxonomy-product_attribute.html` (tag-like)
- `templates/single.html` (3; two tag-like)

Comprehensive-fix note: to close the whole pattern, apply the same rewording (no `<`/`>` inside prose comments) to these 11 files. Only `page.html` is in scope for the reported problem, and it is the one whose diff I give below; the others are mechanical.

## 5. Smallest correct fix (NOT applied)

Option A (recommended, cause-agnostic, keeps all the rationale in-file): reword the two comments in `theme/sgs-theme/templates/page.html` so they contain no angle brackets. Only prose changes; no block delimiter is touched.

```diff
--- a/theme/sgs-theme/templates/page.html
+++ b/theme/sgs-theme/templates/page.html
@@ WIDTH MODEL comment @@
-     `<main>` is STRUCTURE, not content, so it says contentWidth:"full" and passes width
+     The main element is STRUCTURE, not content, so it says contentWidth:"full" and passes width
@@ title comment @@
-<!-- The title is LOOSE content, so it needs a container of its own once <main> stops
+<!-- The title is LOOSE content, so it needs a container of its own once main stops
```

Simulated on the file text (positive + negative control): before the change a naive strip leaks `STRUCTURE` (True); after it, 0 angle characters remain inside non-block comments, naive strip leaks nothing (False), and the 8 block delimiters are identical. This does not overlap any existing mitigation.

Option B (needs Bean's call, bigger): stop shipping the essay to visitors. Template HTML has no non-emitting comment syntax, so the rationale would move to `.claude/decisions.md` D725 (which already quotes it) and each template would keep a one-line pointer. Removes the 1348 bytes per page and the "Bean-ruled" exposure, but loses the in-file "do NOT re-add ..." guard that people deliberately put there.

Caveat: Option A fixes the comment's exposure to naive extractors; it does not fix a broken extractor. If the extractor is a repo script or pipeline stage, it should also skip comments before stripping tags (for example `re.sub(r'<!--.*?-->','',html,flags=re.S)` first, or use a real HTML parser). I could not identify which tool it was.

## 6. Commands run (all read-only)

- `curl -s -o page.html https://darkcyan-grouse-898606.hostingersite.com/eye-care-birmingham/` -> 200, 68581 bytes (HCDN HIT, Age 465). Second fetch with a Chrome UA and `--compressed` -> 200, comment identical. Third fetch, cache-busted `?bust=<random>` -> 200, 105628 bytes, comment identical. `grep -c STRUCTURE` = 1 line in each.
- `sed -n 165,200p page.html | cat -A` -> the comment is served between `</header>` and `<main class="sgs-container ... wp-block-sgs-container" id="main">`, complete from `<!-- WIDTH MODEL` to `-->`.
- Python: served comment vs `theme/sgs-theme/templates/page.html` comment, both 1348 chars, `==` True; interior `--` count 0; interior `<!--` count 0.
- Playwright `browser_navigate` + `browser_evaluate` (TreeWalker SHOW_TEXT|SHOW_COMMENT) on the Eye Care page and on the canary front page (results in section 1 and 2). Chrome 152 user agent.
- Python `re.sub(r'<[^>]+>','',body)` on the served body -> reproduces the leak text; `html.parser` and comment-aware regex -> no leak.
- `git grep -E "(re\.sub|\.replace)\(.{0,4}<\[\^>\]" -- '*.py' '*.js' '*.mjs'` -> 6 hits, none applicable.
- Python scan of all git-tracked `theme/sgs-theme/**/*.html|php` (73 files) for non-block comments containing `>`, `<`, `--`, tag-like text, unbalanced delimiters, nested delimiters -> section 4 (`pipeline-state/_inv-theme-comment-leak/scan.out`).
- `git diff --stat -- theme/sgs-theme/templates/page.html` and `git status` for it -> clean (the file is unmodified; last commit `7502676a7`).

## 7. Open threads

1. Identify the extractor that produced the leaked text (ASSUMED naive regex; not proven). One question to the reporter answers it: what did you use to read the page text?
2. Site Editor canvas: not checked (needs login).
3. Decision for Bean: Option A only, A across all 11 files, or B.
