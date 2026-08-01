# palestine-lives production deploy â€” BLOCKED by oldshape-audit

**Date:** 2026-08-01 Â· **Captured because:** the handoff QC gate correctly flagged that the
"29 NEW HIGH findings" figure existed only in prose, behind a hard production blocker, with no
committed artefact. A number nobody can re-check is not evidence. This is the real output.

```
[oldshape-audit] fetching stored post_content from target (read-only)
[oldshape-audit] scanning 28 post(s) against local block.json schemas
[audit-post-content] 189 finding(s) (29 NEW HIGH, 155 baselined) across 28 post(s):
  [HIGH] post palestine-lives/283 line 1 — sgs/hero
      undeclared-attr: "ctaPrimaryText" not declared in block.json — WP discards it; the next editor save DELETES it from post_content
  [HIGH] post palestine-lives/283 line 1 — sgs/hero
      undeclared-attr: "ctaPrimaryUrl" not declared in block.json — WP discards it; the next editor save DELETES it from post_content
  [HIGH] post palestine-lives/283 line 1 — sgs/hero
      undeclared-attr: "ctaSecondaryText" not declared in block.json — WP discards it; the next editor save DELETES it from post_content
  [HIGH] post palestine-lives/283 line 1 — sgs/hero
      undeclared-attr: "ctaSecondaryUrl" not declared in block.json — WP discards it; the next editor save DELETES it from post_content
  [HIGH] post palestine-lives/283 line 1 — sgs/hero
      stranded-content: old-shape (self-closing, no children) but render is InnerBlocks-driven — stranded: headline, subHeadline
  [INFO] post palestine-lives/360 line 10 — sgs/site-header-row
      empty-innerblocks: self-closing InnerBlocks block — renders an empty shell
  [INFO] post palestine-lives/360 line 12 — sgs/site-header-row
      empty-innerblocks: self-closing InnerBlocks block — renders an empty shell
  [INFO] post palestine-lives/52 line 332 — sgs/accordion-item
      empty-innerblocks: self-closing InnerBlocks block — renders an empty shell
  [INFO] post palestine-lives/52 line 334 — sgs/accordion-item
      empty-innerblocks: self-closing InnerBlocks block — renders an empty shell
  [INFO] post palestine-lives/52 line 336 — sgs/accordion-item
      empty-innerblocks: self-closing InnerBlocks block — renders an empty shell
  [HIGH] post palestine-lives/53 line 1 — sgs/hero
      undeclared-attr: "ctaPrimaryText" not declared in block.json — WP discards it; the next editor save DELETES it from post_content
  [HIGH] post palestine-lives/53 line 1 — sgs/hero
      undeclared-attr: "ctaPrimaryUrl" not declared in block.json — WP discards it; the next editor save DELETES it from post_content
  [HIGH] post palestine-lives/53 line 1 — sgs/hero
      undeclared-attr: "ctaSecondaryText" not declared in block.json — WP discards it; the next editor save DELETES it from post_content
  [HIGH] post palestine-lives/53 line 1 — sgs/hero
      undeclared-attr: "ctaSecondaryUrl" not declared in block.json — WP discards it; the next editor save DELETES it from post_content
  [HIGH] post palestine-lives/53 line 1 — sgs/hero
      stranded-content: old-shape (self-closing, no children) but render is InnerBlocks-driven — stranded: headline, subHeadline
  [HIGH] post palestine-lives/53 line 3 — sgs/hero
      undeclared-attr: "ctaPrimaryText" not declared in block.json — WP discards it; the next editor save DELETES it from post_content
  [HIGH] post palestine-lives/53 line 3 — sgs/hero
      undeclared-attr: "ctaPrimaryUrl" not declared in block.json — WP discards it; the next editor save DELETES it from post_content
  [HIGH] post palestine-lives/53 line 3 — sgs/hero
      stranded-content: old-shape (self-closing, no children) but render is InnerBlocks-driven — stranded: headline, subHeadline
  [HIGH] post palestine-lives/65 line 1 — sgs/hero
      undeclared-attr: "ctaPrimaryText" not declared in block.json — WP discards it; the next editor save DELETES it from post_content
  [HIGH] post palestine-lives/65 line 1 — sgs/hero
      undeclared-attr: "ctaPrimaryUrl" not declared in block.json — WP discards it; the next editor save DELETES it from post_content
  [HIGH] post palestine-lives/65 line 1 — sgs/hero
      undeclared-attr: "ctaSecondaryText" not declared in block.json — WP discards it; the next editor save DELETES it from post_content
  [HIGH] post palestine-lives/65 line 1 — sgs/hero
      undeclared-attr: "ctaSecondaryUrl" not declared in block.json — WP discards it; the next editor save DELETES it from post_content
  [HIGH] post palestine-lives/65 line 1 — sgs/hero
      stranded-content: old-shape (self-closing, no children) but render is InnerBlocks-driven — stranded: headline, subHeadline
  [HIGH] post palestine-lives/65 line 371 — sgs/cta-section
      undeclared-attr: "headlineColour" not declared in block.json — WP discards it; the next editor save DELETES it from post_content
  [HIGH] post palestine-lives/65 line 371 — sgs/cta-section
      undeclared-attr: "bodyColour" not declared in block.json — WP discards it; the next editor save DELETES it from post_content
  [HIGH] post palestine-lives/66 line 1 — sgs/hero
      undeclared-attr: "ctaPrimaryText" not declared in block.json — WP discards it; the next editor save DELETES it from post_content
  [HIGH] post palestine-lives/66 line 1 — sgs/hero
      undeclared-attr: "ctaPrimaryUrl" not declared in block.json — WP discards it; the next editor save DELETES it from post_content
  [HIGH] post palestine-lives/66 line 1 — sgs/hero
      undeclared-attr: "ctaPrimaryStyle" not declared in block.json — WP discards it; the next editor save DELETES it from post_content
  [HIGH] post palestine-lives/66 line 1 — sgs/hero
```
