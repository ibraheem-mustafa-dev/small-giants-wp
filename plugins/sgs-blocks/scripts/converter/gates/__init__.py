"""Anti-cheat gates the scaffold ships (design §4.1).

Each gate is a runnable script with ``--report / --check / --update-baseline``
(matching the existing cheat-gate/ + ledger/ convention), wired into
the git pre-commit hook ``.githooks/pre-commit`` and collected by the prebuild pytest suite.
"""
