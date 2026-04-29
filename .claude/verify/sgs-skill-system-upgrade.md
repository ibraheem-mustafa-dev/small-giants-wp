# Verification Criteria: SGS Skill System Upgrade

## Gate 1: Wiki Alive
| Criterion | Command | Expected | STATUS |
|---|---|---|---|
| 55+ block wiki pages exist | ls wiki/blocks/ \| wc -l | >= 55 | PENDING |
| wiki-sync runs clean | python sgs-db.py wiki-sync | Exit 0, no errors | PENDING |
| OC symlink resolves | ls -la A:/.openclaw/workspace/memory/sgs-wiki/ | Points to .agents/.../wiki/ | PENDING |
| blub.db has wiki entries | sqlite3 blub.db "SELECT count(*) FROM chunks WHERE source_type='memory' AND file_path LIKE '%sgs-wiki%'" | > 0 | PENDING |

## Gate 2: Extraction Ready
| Criterion | Command | Expected | STATUS |
|---|---|---|---|
| html-capture.js exists | ls .agents/skills/shared-references/html-capture.js | File exists | PENDING |
| html-capture produces HTML | node html-capture.js https://example.com | Valid HTML output | PENDING |
| Extraction skill passes skillscore | skillscore validate .agents/skills/web-extraction/SKILL.md --type skill | >= 90% | PENDING |
| animation-harvest dispatches to it | grep web-extraction animation-harvest/SKILL.md | Match found | PENDING |

## Gate 3: Opportunities Landed
| Criterion | Command | Expected | STATUS |
|---|---|---|---|
| animation_tokens table exists | python sgs-db.py tokens --type animation | Schema returned | PENDING |
| corrections table works | python sgs-db.py corrections list | Empty list or entries | PENDING |
| Mood board template renders | Open mood-board-template.html in browser | Renders with placeholder data | PENDING |
| Trend detection in sgs-discover | grep -c trend sgs-discover/SKILL.md | > 0 (already done) | DONE |

## Gate 4: Quality Baseline
| Criterion | Command | Expected | STATUS |
|---|---|---|---|
| 35 gap-analysis reports exist | ls ~/.claude/gap-analysis/reports/2026-04-*  \| wc -l | >= 35 | PENDING |
| system-level-findings.md exists | ls ~/.claude/gap-analysis/system-level-findings.md | File exists | PENDING |
| No D or F scores in WP skills | grep overall_score reports/2026-04-*wp* | All >= 2.5 | PENDING |

## Gate 5: System Operational
| Criterion | Command | Expected | STATUS |
|---|---|---|---|
| All skills C+ | Review evaluation-history.json | No scores < 2.5 | PENDING |
| System-level plan written | ls ~/.claude/gap-analysis/system-level-findings.md | Has prioritised roadmap | PENDING |
| sgs-wp-engine B+ or higher | Check evaluation-history.json | Score >= 3.5 | PENDING |
| wp-block-development B+ or higher | Check evaluation-history.json | Score >= 3.5 | PENDING |