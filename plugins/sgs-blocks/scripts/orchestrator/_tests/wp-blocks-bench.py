#!/usr/bin/env python3
"""Latency benchmark for wp-blocks.py Spec 22 FR-22-8 extensions.

Per FR-22-8: equivalent-block must be ≤2ms cache-warm, ≤20ms cold. Other
subcommands (called ad-hoc, not per-walker-emit) have no committed threshold,
but we benchmark `naming-convention` as a representative read-side ad-hoc query
for trend tracking.

Cold = first subprocess invocation (cold Python + cold SQLite page cache).
Warm = subsequent invocations (Python interpreter still cold per process,
but OS page cache + SQLite page cache typically warm by then).

This measures SUBPROCESS path. Per FR-22-8, walker-hot-path queries import the
library directly (~/Projects/small-giants-wp/plugins/sgs-blocks/scripts/
orchestrator/converter_v2/db_lookup.py) — that path is Task 2's responsibility
and not benchmarked here.

Run:
    python plugins/sgs-blocks/scripts/orchestrator/_tests/wp-blocks-bench.py
"""
from __future__ import annotations

import subprocess
import sys
import time
from pathlib import Path
from statistics import mean, median

sys.stdout.reconfigure(encoding='utf-8')

WP_BLOCKS = Path.home() / '.claude' / 'hooks' / 'wp-blocks.py'


def time_call(args, n_warm=10):
    """Returns (cold_ms, warm_mean_ms, warm_median_ms)."""
    # Cold
    t0 = time.perf_counter()
    subprocess.run(
        [sys.executable, str(WP_BLOCKS)] + args,
        capture_output=True, text=True, encoding='utf-8',
    )
    cold = (time.perf_counter() - t0) * 1000.0

    # Warm
    samples = []
    for _ in range(n_warm):
        t0 = time.perf_counter()
        subprocess.run(
            [sys.executable, str(WP_BLOCKS)] + args,
            capture_output=True, text=True, encoding='utf-8',
        )
        samples.append((time.perf_counter() - t0) * 1000.0)
    return cold, mean(samples), median(samples)


def main():
    print("wp-blocks.py latency benchmark (Spec 22 FR-22-8)")
    print("=" * 60)
    print()

    cases = [
        ("naming-convention 'SGS'", ['naming-convention', 'SGS']),
        ("animation 'sgs/hero'", ['animation', 'sgs/hero']),
        ("component-library-match 'Accordion'", ['component-library-match', 'Accordion']),
        ("gap-candidate 'color'", ['gap-candidate', 'color']),
    ]

    print(f"{'Subcommand':<45} {'Cold (ms)':>11} {'Warm mean':>11} {'Warm median':>13}")
    print("-" * 82)
    for label, args in cases:
        cold, warm_mean, warm_median = time_call(args, n_warm=8)
        print(f"{label:<45} {cold:>11.1f} {warm_mean:>11.1f} {warm_median:>13.1f}")

    print()
    print("Note: subprocess path adds Python interpreter startup (~50-150ms typically).")
    print("Per FR-22-8, walker hot-path queries import db_lookup.py directly to bypass")
    print("subprocess overhead. equivalent-block ≤2ms cache-warm / ≤20ms cold threshold")
    print("applies to the imported-library path (Task 2 territory), not this CLI.")


if __name__ == '__main__':
    main()
