# Hero full-bleed pattern needs replacement

Current: `section.sgs-hero { margin: 0 -24px }` — fragile (depends on parent padding)
Proposed: `section.sgs-hero { width: 100vw; margin-left: calc(50% - 50vw); position: relative }`

Affects all SGS hero instances across all clients. Framework-level scope.

Visible symptom: 8-16px content-area shrinkage when wrapper padding != 24px.
The current pattern `margin: 0 -24px` works only if the parent has matching 24px positive padding.
On the Mama's Munches test page (post 29), the wrapper has 8px content-area padding from theme
defaults, so the math is off by 16px on each side — producing x=-8, w=1425 at 1440 viewport
(should be x=0, w=1440).

Captured 2026-05-05 from hero visible-differences audit (Delta 4).
Deferred from hero-fixes-2026-05-05 session: framework change, all client clones affected.
