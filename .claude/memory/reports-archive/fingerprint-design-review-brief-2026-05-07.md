# Block Fingerprint Design Review Brief — 2026-05-07

You are reviewing a converged design for the SGS WordPress cloning skill's block fingerprint catalogue. The design lets a recogniser deterministically translate scraped HTML / Tailwind / Bootstrap / BEM / vanilla-CSS sites into matching SGS blocks, with leftovers routed to an intelligence layer.

Your job: stress-test the design. Find the gaps. Be specific.

---

## Context

**Project:** SGS (Small Giants Studio) WordPress framework — custom block plugin + theme. 64 SGS blocks today. Bean's cloning skill (`/sgs-clone`) takes HTML drafts of websites and converts them to live SGS WordPress sites with high fidelity.

**uimax** = the cross-platform translation database (Rosetta Stone). It already holds 11,964 rows across 36 tables: design tokens, palettes, typography, animations (63 rows), naming conventions (16 rows), component libraries (144 rows from Radix / USWDS / GCDS — currently zero SGS rows), stack-specific guidelines (16 stacks, 800+ rules).

**The Rosetta Stone passport principle:** every uimax row that describes a design artefact carries equivalent-name mappings across SGS blocks, vanilla HTML/CSS, BEM, Bootstrap, shadcn, Tailwind, React generic, and AI-builder outputs (Lovable / v0 / Bolt). A design expressed in any one platform should pass through to look + function identically on any other.

**Primary direction:** scrape inbound. HTML draft / Tailwind site → recogniser → SGS blocks with attribute values populated. Leftovers flagged for intelligence review.

**Secondary direction:** generate outbound. SGS block → expressed as Tailwind+React / Bootstrap / vanilla / etc. Less critical at MVP — comes online once the recogniser proves itself.

---

## The converged design

### Storage

- `sgs-db.blocks.fingerprint` — JSON column, source of truth, one row per block (64 rows)
- `uimax.component_libraries.equivalent_implementations` — JSON column, mirror, kept in sync by `/sgs-update`
- `uimax.recogniser_index` — derived reverse-index table, rebuilt at sync time, used by the recogniser at scrape time for fast O(1) class lookups

### Four-layer fingerprint structure

```json
{
  "block_slug": "sgs/hero",

  "envelope": {
    "tag": "section",
    "structural_signature": {
      "children_count_range": [1, 2],
      "child_shape": ["heading + paragraph + cta-link", "image (optional)"]
    },
    "wrapper_classes_per_convention": {
      "BEM":           [".hero", ".hero--split"],
      "SGS":           [".sgs-hero"],
      "Bootstrap":     [".jumbotron"],
      "Tailwind":      "min-h-screen flex items-center",
      "shadcn":        "<HeroSection />",
      "react-generic": "<Hero>",
      "ai-builder":    "Tailwind composition"
    },
    "signature_hash": "<sha256 of canonical structural signature>"
  },

  "attributes": [
    {
      "name": "headline",
      "type": "RichText",
      "role": "primary-text",
      "platform_equivalents": {
        "Tailwind": {
          "extract": {
            "selector": "h1",
            "pattern": "innerText",
            "value_transform": "trim"
          },
          "generate": "h1 with classes 'text-5xl font-bold'"
        },
        "BEM": {
          "extract": {
            "selector": ".hero__headline",
            "pattern": "innerText"
          },
          "generate": "<h1 class='hero__headline'>"
        }
      }
    }
  ],

  "internal_elements": [
    {
      "name": "cta-group",
      "selector": ".hero__cta-group",
      "tag": "div",
      "cardinality": "single",
      "classes_per_convention": { "...": "..." },
      "child_attributes": ["ctaPrimary", "ctaSecondary"],
      "controllable_properties": [
        {
          "name": "ctaGap",
          "css_property": "gap",
          "responsive": true,
          "platform_equivalents": {
            "Tailwind": {
              "extract": {
                "selector": ".hero__cta-group OR auto-detected button group",
                "pattern": "regex: \\bgap-(\\d+)\\b",
                "value_transform": "tailwind_spacing_to_px"
              },
              "generate": "gap-{n}"
            },
            "BEM": {
              "extract": {
                "selector": ".hero__cta-group",
                "pattern": "computed style 'gap'",
                "value_transform": "css_length_to_px"
              },
              "generate": "gap: var(--cta-gap)"
            }
          }
        }
      ]
    }
  ],

  "inner_blocks": {
    "supports_inner_blocks": true,
    "slots": [
      {
        "slot_name": "cta-zone",
        "allowed_block_types": ["sgs/multi-button"],
        "min_count": 0,
        "max_count": 1,
        "default_template": [
          ["sgs/multi-button", {}, [
            ["sgs/button", { "inheritStyle": "primary", "text": "Order Now" }],
            ["sgs/button", { "inheritStyle": "secondary", "text": "Learn More" }]
          ]]
        ],
        "slot_overrides": {
          "comment": "When sgs/button lives in this slot, default inheritStyle propagates from hero's primary preset binding"
        }
      }
    ]
  },

  "coverage_notes": {
    "incomplete_per_platform": {
      "shadcn":   ["sgsAnimation behaviours map to framer-motion variants, not shadcn primitives"],
      "Bootstrap": ["responsive variants like ctaGapMobile have no native equivalent — render via @media query CSS"]
    }
  }
}
```

### Layer mechanics summary

| Layer | What it stores | Recursive? |
|---|---|---|
| 1 — Envelope | Wrapper tag + classes per convention + structural signature + hash | No |
| 2 — Block attributes | Direct attribute values + role + bidirectional platform_equivalents (extract + generate) | No |
| 3 — Internal elements | Named DOM regions inside wrapper, each with own selector + classes + controllable properties | Optionally nests via child_elements |
| 4 — Inner blocks | Composition: which inner block slugs live in which slots + slot_overrides + default_template | YES — references each child by slug; child has own fingerprint |

### Eight attribute roles (auto-routing template system)

| Role | Cleanly translatable | Mixed coverage |
|---|---|---|
| `wrapper` | BEM, SGS, Bootstrap, vanilla-html | Tailwind (composition), shadcn (component) |
| `primary-text` | All conventions cover heading semantics | (none — universal) |
| `media-slot` | All cover img/video | shadcn AspectRatio, Next.js Image |
| `link-cta` | BEM, Bootstrap class systems | shadcn Button, vanilla a |
| `responsive-spacing` | Tailwind utility, CSS custom property | Bootstrap (per-breakpoint utilities), shadcn (sx prop) |
| `visual-token` (colour, radius, shadow) | CSS custom property, Tailwind theme token | Bootstrap (limited palette via .bg-* utilities), shadcn (variant prop) |
| `animation-behaviour` | CSS keyframe + class, Tailwind motion | Framer Motion variants, GSAP timeline, WAPI |
| `interactive-state` (form binding, slider state) | WP Interactivity API directives | React state hooks, controlled-component pattern |

Each role has ONE template that defines its extract + generate halves per platform. New attributes get tagged with a role; the template auto-fills their platform_equivalents.

### Recogniser flow at scrape time

1. `/uimax-classify-naming` → identify source convention
2. Walk DOM top-to-bottom, section by section
3. For each section, query reverse-indexed `recogniser_index` by `(convention, class_pattern)` → ranked candidate blocks with confidence
4. For top candidate, walk fingerprint layers, extract attribute values via each attribute's `platform_equivalents[convention].extract` rule
5. For internal elements (Layer 3), find matching DOM regions by selector, repeat extraction
6. For inner-block slots (Layer 4), recurse on child elements against `allowed_block_types`
7. Collect leftovers — anything unmatched
8. Return: `{ matched: [...], leftovers: [...], intelligence_required: [...] }`

### Four leftover buckets (route to intelligence)

| Type | Example | Routes to |
|---|---|---|
| Unrecognised class on matched wrapper | `.hero__bg-decoration` on hero, no internal element catalogued | "New internal element worth adding to Layer 3? Or one-off variant?" |
| Wholly unrecognised section | Section whose wrapper class doesn't match any fingerprint | "New pattern candidate? Run `/uimax-sgs-scrape-pattern`. Or known pattern under non-standard class name?" |
| Recognised attribute role, extraction failed | Looks like paddingTop slot but no class/style readable | "Best-guess from surrounding evidence (parent padding, section rhythm), or flag as 'manual review'" |
| Animation/interaction unclassified | Scroll effect using unknown class | "Known animation pattern under custom name? Run gap-candidate check against uimax animations table" |

Each leftover gets a `recognition_log` entry. After the scrape, operator reviews. Items confirmed as new patterns → add to library. One-offs → ignore. Genuine new SGS attribute proposals → parking entry.

---

## What I want from you

Stress-test this design. Be specific. Be honest.

### Mandatory questions

1. **Layer coverage gaps.** Does the 4-layer model handle every block-type shape (atomic single-element, atomic with internal parts, composite, repeating-parts, container-with-InnerBlocks)? Walk through a real edge case — a sgs/tabs block with 5 tabs each containing different inner blocks. Does the structure represent it without compromise?

2. **Bidirectional platform_equivalents — extraction first.** Does the `extract` half cover the realistic messiness of real-world scrape inputs? Examples to check:
   - Tailwind site where a `gap-{n}` class lives on a child div, not the conceptual cta-group
   - BEM site where a class has been minified or rewritten by a build step
   - Bootstrap site mixing utility classes with semantic component classes
   - Site where the wrapper class is dynamic / hash-suffixed (CSS modules, MUI hash JIT, SvelteKit hashed class names)
   - Inline `style="..."` overrides that conflict with class-based defaults

3. **Eight attribute roles — completeness.** Are eight roles enough? What attribute types fall outside these roles? Suggest any roles you'd add (e.g. `accessibility-attribute` for ARIA, `gesture-binding` for swipe / drag handlers, `data-binding` for dynamic content, `seo-attribute` for structured data)?

4. **Leftover bucket completeness.** Are four buckets exhaustive? What scrape outputs would land outside these buckets and silently get dropped?

5. **Reverse-index scaling.** When the catalogue grows from 64 blocks to 200+, will the in-memory or table-based reverse index hold up? Can the same class pattern legitimately match multiple blocks (e.g. `.btn` matches both sgs/button and sgs/multi-button) — how does the design disambiguate?

6. **Recursive Layer 4 risks.** sgs/hero references sgs/multi-button references sgs/button. What if the catalogue has a circular reference (block A's inner_blocks points to block B, and B's inner_blocks points to A)? Does the design have a guard? What about depth limits?

7. **Highest-risk failure mode.** If you had to predict the FIRST place this design will break in a real-world Mama's-style clone, where is it?

### Format

Return ~400-700 words structured as:

```
## <Your model name> — fingerprint design review

### Confirmed
- <bullet list of design choices that hold up under your scrutiny>

### Disputed
- <bullet list of design choices you think are wrong or incomplete; explain why; propose a fix>

### Net new findings
- <issues or considerations not in the brief that the design hasn't accounted for>

### Highest-risk failure mode
- <one paragraph: where will this break first?>

### Net verdict
- <ship-as-is / ship-with-fixes / hold-and-redesign — with one-sentence reasoning>
```

Be honest. Don't pad. The goal is finding what's broken, not validating what's working.
