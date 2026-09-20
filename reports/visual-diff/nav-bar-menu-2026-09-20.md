# Editor verification — sgs/nav-bar-menu — 2026-09-20 (W2-b: create a menu panel inline)

verdict: PASS
editor_capture_passed: true
source_sha: 89fd0978b9440baa
commit_sha: 5993d3327 (feat(nav-bar-menu): create a new drawer post from the picker)

> `source_sha` is the `visual-report-sha.py` digest recipe (SHA-256 over
> `name\0bytes` for each file under `src/blocks/nav-bar-menu/`, sorted, first 16 hex)
> applied to the **committed** bytes of the 7 block files in 5993d3327 — the script
> itself reads the git INDEX and returns `no staged files for block 'nav-bar-menu'`
> here, because this feature had already landed before verification. Command:
> `git diff-tree --no-commit-id --name-only -r 5993d3327 -- plugins/sgs-blocks/src/blocks/nav-bar-menu/`
> piped through that digest.

This is an editor-only change (inspector components + hooks; no `render.php`,
`style.css`, `save.js` or `block.json` in the commit's block-side diff), so the
frontend markup is unchanged and no first-paint capture applies.

## Environment + method

| Item | Value |
|---|---|
| Site | `https://sandybrown-nightingale-600381.hostingersite.com` (sandybrown canary) |
| Deployed artefact | `wp-content/plugins/sgs-blocks/build/blocks/nav-bar-menu/index.js`, 262,766 bytes, server mtime `Sep 20 00:29`. `grep -c "Create a new menu panel"` → **2**; `grep -c "Add the menu panel"` → **0** |
| Post exercised | `sgs_header` **3648** "Mamas Munches Header" (the Active header), block `sgs/nav-bar-menu`, `drawerRef: 0` at open |
| Driver | Repo Playwright 1.58.2 driven directly from `plugins/sgs-blocks/node_modules` (the Playwright MCP browser profile was locked by a concurrent session), headless Chromium, 1600×1000, real `wp-login.php` session as `Claude` |
| REST verification | `wp/v2/sgs_drawer` with Basic auth (`WP_APP_PWD_SANDYBROWN`), cache-buster `cb=$(date +%s)` on every fetch |
| Server-side verification | `ssh -p 65002 u945238940@141.136.39.73`, `wp option get` / `wp post get` / `wp post list` under `domains/sandybrown-nightingale-600381.hostingersite.com/public_html` |

Five independent editor runs were executed, each from a fresh login and a fresh
unsaved copy of post 3648: **A** main flow, **B** double-click control, **C**
injected-403 failure control, **D** burger-opens-nothing warning path, **E**
empty-name default.

## Checks

| # | Check | Result | Measured evidence |
|---|---|---|---|
| 1 | 'Menu panel' section exists in the block Settings tab and holds the control | **PASS** | Inspector panel roster read from the DOM: `Menu, Burger Menu, Menu Button, Accessibility, Menu panel, Dropdown menus, Layout, Visibility conditions, Advanced`. `button:has-text("Create a new menu panel")` count = **1** |
| 2 | Clicking it reveals the inline name field with Create + Cancel | **PASS** | After click: label `Name the new menu panel` present (1), input visible, `Create` button count 1, `Cancel` button count 1, and the reveal button itself count **0** (replaced, not duplicated) |
| 2b | Field default is `New menu drawer` | **PASS (with nuance)** | The field's *value* is `""` and its **placeholder** is `New menu drawer` — the literal default is applied at submit time by `drawerTitleFrom()`. Measured end-to-end in **run E**: Create clicked with the field untouched produced a post actually titled **`New menu drawer`** (id 3707, status `publish`). So the effective default is the stated one; it just is not pre-filled text. Not a defect — a pre-filled value would have to be cleared before typing |
| 2c | Cancel returns to the collapsed state | **PASS** | After Cancel: name-field label count 0, reveal button back (count 1), no post created |
| a | Create saves a `sgs_drawer` post with that title, status `publish` | **PASS** | `GET /wp-json/wp/v2/sgs_drawer?search=W2-b%20inline%20drawer&status=any&context=edit` → exactly **1** match, `3700 publish '[QA] W2-b inline drawer runA'` |
| b | The new post's content holds real drawer blocks, not empty | **PASS** | `content.raw` (97 bytes): `<!-- wp:sgs/nav-drawer --> <!-- wp:sgs/nav-drawer-menu {"ref":0} /--> <!-- /wp:sgs/nav-drawer -->` — the blank starter, i.e. `sgs/nav-drawer` with an `sgs/nav-drawer-menu` child |
| c | The picker shows the new post as selected, **without a reload** | **PASS** | No `goto`/`reload` occurred between opening the editor and this read (`reloadsSinceEditorOpen: 0`). Picker `<select>`: `value: "3700"`, selected label `[QA] W2-b inline drawer runA`, `optionCount: 10` = 1 default + 8 pre-existing + 1 new. Screenshot `evidence-A3-created-runA.png` |
| d | `drawerRef` attribute equals the new post id | **PASS** | `wp.data.select('core/block-editor').getBlockAttributes(clientId).drawerRef` → **0 before**, **3700 after** |
| e | Success notice links to `post.php?post=<id>&action=edit` and that screen opens the seeded drawer | **PASS** | Notice `linkHref` = `post.php?post=3700&action=edit`. Opened in a second tab: `postType: sgs_drawer`, title `[QA] W2-b inline drawer runA`, block tree `sgs/nav-drawer` → `sgs/nav-drawer-menu`. Notice text measured verbatim: *"'[QA] W2-b inline drawer runA' was created and this burger now opens it. It is a separate item, so it does not appear in this editor — open it to add your links and content."* + button *"Edit this menu panel (opens a new tab)"*. Screenshot `evidence-A4-editscreen-runA.png` |
| f | Double-click Create creates exactly ONE post (negative-style control) | **PASS** | Run B: `dblclick({delay: 0})` on Create. POST requests to a `sgs_drawer` route observed: **1**. Success notices: 1. `drawerRef` → 3703. REST search for the run-B title returned exactly **one** post. The `isCreating` pending guard in `useCreateDrawer::createDrawer` plus the button's `disabled={isCreating}` held under a zero-delay double-click |
| g | Burger-opens-nothing warning points at 'Create a new menu panel'; no 'Add the menu panel' button | **PASS** | Run D. *Positive/negative pair*: with the site's Active panel resolving (`window.sgsBlocksData.activeDrawer = {id:3593, ref:'sgs-nav-drawer'}`), the sidebar shows **1 info notice, 0 warnings** and 'Menu panel' stays collapsed. Simulating a non-resolving Active panel **client-side only** (`window.sgsBlocksData.activeDrawer = null`, then re-select the block to re-mount the inspector — no site option touched) flips it to **1 warning**: *"Below the collapse size this menu becomes a burger button — but there is no menu panel for it to open, so tapping it will do nothing. Use “Create a new menu panel” in this block's Menu panel settings, or pick an existing one."* The 'Menu panel' section **auto-opened** (`aria-expanded` false → **true**) and the create button was visible. `button:has-text("Add the menu panel")` count **0**, and the string is absent from the whole sidebar's `innerText` in every run |
| h | A REST failure produces an honest error Notice, no silent success | **PASS** | Run C: Playwright route interception on `**/wp/v2/sgs_drawer**` returned `403 {"code":"rest_forbidden","message":"QA-injected 403: you are not allowed to create menu panels."}`. Result: **1 error notice** rendering the server's own message verbatim, **0 success notices**, `drawerRef` stayed **0**, and REST confirmed **no** post was created for that run's title |
| 3 | No JS console errors from the feature | **PASS** | Across all five runs the only recurring message is a pre-existing WP-core warning present before any interaction: *"global-styles-css-custom-properties-inline-css was added to the iframe incorrectly…"*. The sole `error` entry in the whole session is the **deliberately injected** 403 in run C (*"Failed to load resource: the server responded with a status of 403"*), which is the control working as designed. Zero page errors, zero React/uncaught errors |
| — | Secondary attestation of the seed helpers | **PASS** | `node plugins/sgs-blocks/scripts/tests/test-create-drawer-seed.mjs` → **30 passed, 0 failed**, including 5 named negative controls (unscoped page pattern rejected as a seed source; decorated look does not win over the blank starter; drifted picker query detected; empty seed not silently turned into markup; the error reporter never returns an empty string) |

## Cleanup

| Item | Baseline (before) | After cleanup | Result |
|---|---|---|---|
| Published `sgs_drawer` posts | 8 → `[3593, 3685, 3686, 3687, 3688, 3689, 3690, 3691]` | 8 → `[3593, 3685, 3686, 3687, 3688, 3689, 3690, 3691]` | **Restored** — identical set |
| QA posts created | — | 3700, 3703 (`[QA] W2-b inline drawer …`) and 3707 (`New menu drawer`, run E) | All three `DELETE`d via REST → each returned `status: trash`. `?search=W2-b inline drawer&status=publish` → **0**; no `New menu drawer` in the published list. `wp post list --post_status=trash` confirms 3700/3703/3707 sit in trash (alongside pre-existing 3576/3581/3582) |
| `sgs_active_drawer_cpt_id` | `3593` | `3593` | **Unchanged** (also `sgs_active_header_cpt_id` 3648 and `sgs_active_footer_cpt_id` 3649 unchanged) |
| Header post 3648 saved by this session? | `post_modified 2026-09-18 21:29:45` | `post_modified 2026-09-20 00:42:36` | **Changed — but not by this session; proven below** |

### The header's modified date moved — attribution

The date check as written does not hold, so it is reported rather than smoothed over.
The cause was proven before being claimed, not inferred:

1. **Content diff against the pre-session baseline revision.** `wp post get 3648 --field=post_content`
   vs revision **3659** (`2026-09-18 21:29:45`, the baseline state) differs by exactly **one**
   attribute on the root `sgs/site-header` block: `"shadowScrolled":"floating"` added. That is the
   *site-header shadow-once-scrolled* feature (commit `737d205ba`), not anything this test touches.
2. **My change is absent.** `grep -c drawerRef` on the current post content → **0**. Had this
   session saved, `"drawerRef":3700` (or 3703/3707) would be serialised on the `sgs/nav-bar-menu`
   block. It is not there, in any form.
3. **Timing.** Server clock at the check was `Sun Sep 20 00:42:59 UTC`; the new revision **3709** is
   stamped `00:42:36` — **23 seconds earlier**, by which point every browser this session launched
   was already closed. The same canary shows a concurrent session creating `[QA]` posts 3692–3704
   in those same minutes (3704 at `00:39:30`, 3701/3702 at `00:38`), and that session also held the
   Playwright MCP browser profile lock which forced this run onto the repo's own Playwright.
4. **In-editor state.** At the end of run A the editor reported `isDirty: true, isSaving: false,
   isAutosaving: false` — dirty and never saved, which is the intended end state. Save was never
   clicked in any of the five runs.

Conclusion: post 3648 was modified by a **concurrent session working on `sgs/site-header`**. This
session left it unsaved, and none of its edits reached the database.

## Notes for the record

- The old sibling block-insert affordance is gone at every level checked: absent from
  `src/` and from the deployed `build/` bundle (`grep -c "Add the menu panel"` → 0 in both),
  and absent from the rendered sidebar's `innerText` and button list in all five runs.
- Screenshots captured (session-local, in the run scratchpad, not persisted to the repo — same
  convention as `nav-bar-menu-2026-09-17.md`): `evidence-A1-panel-runA.png` (panel + control),
  `evidence-A2-field-runA.png` (inline name field), `evidence-A3-created-runA.png` (picker
  selected + success notice), `evidence-A4-editscreen-runA.png` (seeded drawer edit screen),
  `evidence-dblclick-runB.png`, `evidence-fail403-runC.png`, `evidence-D-warnpath2.png`.
  Machine-readable measurements alongside them as `evidence-*.json`.
