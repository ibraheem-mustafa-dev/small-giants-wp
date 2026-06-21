"""cheat-gate — F5 anti-cheat detection suite for the SGS cloning pipeline.

Spec ref: Spec 31 §7a — check-converter-cheats.py

This package is named 'cheat-gate' (with a hyphen) to match the spec.
Python cannot import a hyphenated package via 'import cheat-gate', so
run.py registers it under the alias 'cheat_gate' using importlib.
Tests import via the 'cheat_gate' alias created here.
"""
