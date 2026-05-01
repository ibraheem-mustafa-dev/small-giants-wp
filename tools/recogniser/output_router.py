"""Module 6 — Output Router.

Routes serialised block markup to the right destination:

  <header>  → theme/sgs-theme/parts/header-<slug>.html
  <footer>  → theme/sgs-theme/parts/footer-<slug>.html
  <main>    → wp post create --post_type=page --post_content=...

S-tier bonus: also register header/footer as patterns in
theme/sgs-theme/patterns/.

Implementation lives in the overnight build's Module 6 dispatch (Sonnet).

Spec: .claude/plans/recogniser-v1.md  Module 6.
"""

from __future__ import annotations

raise NotImplementedError(
    "output_router is a Module 6 scaffold. "
    "Dispatch to Sonnet per recogniser-v1.md spec."
)
