# Checking an investigation findings file

Time matters here: do not spend time that can be avoided, and the earlier a correct result is obtained, the better. Make any reversible call yourself and list the calls you made in your report.

You check one findings file written by an investigation helper (the brief it followed: `E:\sgs-tmp\template-rework\investigation\BRIEF.md`). Read only: never write to a site, never edit a repository file; write only your verdict file `E:\sgs-tmp\template-rework\investigation\verify-<page>.md`. Open every cited file, run read-only commands yourself; never take the finding's word for a fact. The route and plugin code to check against is today's `main` in `E:\sgs-tmp\wt-tr-push` (detached at origin/main; `git -C E:/sgs-tmp/wt-tr-push fetch -q && git -C E:/sgs-tmp/wt-tr-push log -1` to see where it is) and the lab `E:\sgs-tmp\wt-tr-lab`. The framework database: `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "<query>"` (read-only).

## The mistakes these reports have made before; check every finding for each

1. **"Missing setting / missing part / no mode / needs a new block" that already exists.** Run all four checks before accepting such a claim: (a) `block_attributes` (and `block_elements`, roles) in the framework database, by property and part, not only by name; (b) the motion system (a part's look in a state lives in the block's `sgsMotion` attribute, `motion_targets`, `motion_fields`); (c) the theme's Customizer settings (`theme/sgs-theme/inc/*-settings.php`, theme mods: the shop's toolbar and filter looks live there); (d) the hand-built site for that client uses it already (eye-care-test: setting NAMES only, never values, never its About or Contact pages; Mama's mirror `local-mamas` may be read fully). Also check enum values of general settings (e.g. `linkSource`, `sgsBlockLinkSource`, format tokens such as `.sgs-basket-count`). A claim survives only if all four come up empty.
2. **A cause stated as proved that is a guess.** "Proved" needs the artefact that shows it (a log line, a computed style, the code path with file::symbol). Re-derive it. A hypothesis dressed as proof is WRONG.
3. **Stale build judged as current.** Several rebuilds were refused tonight, so some pages still show older builds. Check the page's build date (the saved template's modified time, the rebuild log's `exit=`) and say whether the finding holds on today's code, or only on the old build (then: does today's route still produce it?).
4. **Already fixed on main.** Commits landed all evening (`git -C E:/sgs-tmp/wt-tr-push log --since="2026-11-21 12:00" --oneline`). A finding fixed by one of them is WRONG or "already fixed (hash)".
5. **Wrong owner or layer.** Check the file the fix touches against the ownership in BRIEF.md ("Known already"). A route-rule problem is the general session's; a piece, part-look, catalogue or filter-rail problem is this stream's; a missing block setting is a plugin round item.
6. **A draft defect blamed on the route, or the reverse.** Check the draft itself (`sites/<client>/handoff/`): does the draft really draw what the finding says, at that width and state?
7. **Counts and lists truncated or relabelled.** Re-count any number the finding gives (settings, rules, elements, rows). A list cut with `head`/`tail` and reasoned from is a fault.
8. **One cause counted as several findings, or several causes merged into one.** Say which findings share a cause and which merge hides two.
9. **A fix that would change another client's site.** Bean's rule: a change that extends a feature for one client never alters another site unless it opts in (a new option value or an off-by-default setting); a fix of something broken applies everywhere and its pages are listed. Flag any proposed fix that changes an existing default or option's rendering without saying so.
10. **Wrong file, symbol or hash.** Every `file::symbol` and commit hash cited must exist (`git cat-file -t <hash>`, grep the symbol).
11. **eye-care-test values used.** Any finding whose target value comes from eye-care-test (not the draft) breaks Bean's held-out rule: WRONG.
12. **A size or dependency that does not hold** (an "S" that touches a shared default with render-scope needed, a missing dependency on another finding).

## Verdict file

For each finding id: **confirmed**, **corrected** (with the correct fact and its evidence), **wrong** (with the evidence), or **unverifiable** (and why), plus which checks above you ran on it. Then: findings that share a cause (merge suggestions), any problem the file missed that you saw while checking (marked "new, unchecked"), and the calls you made. Your final reply: counts of each verdict, every wrong or corrected finding in one line each, and the merges.
