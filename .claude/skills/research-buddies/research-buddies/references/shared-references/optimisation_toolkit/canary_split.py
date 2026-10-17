"""
canary_split — held-out validation for skill optimisations.

Public API:
    split(fixtures, holdout=0.2, seed=42) -> (train, holdout)
    score(skill_run_fn, holdout, before, after) -> dict

Gate: pass=True iff delta >= 0.05.
"""

from __future__ import annotations

import inspect
import random
from typing import Any, Callable, Sequence


GATE_DELTA = 0.05
MIN_FIXTURES = 6


def split(
    fixtures: Sequence[Any],
    holdout: float = 0.2,
    seed: int = 42,
) -> tuple[list[Any], list[Any]]:
    """Deterministically partition fixtures into (train, holdout) lists.

    Raises:
        ValueError: empty list, holdout out of (0, 1), or fewer than 6 fixtures.
    """
    if not isinstance(fixtures, (list, tuple)):
        raise TypeError(f"fixtures must be list or tuple, got {type(fixtures).__name__}")
    if len(fixtures) == 0:
        raise ValueError("fixtures is empty; need at least 6 to split")
    if len(fixtures) < MIN_FIXTURES:
        raise ValueError(
            f"insufficient sample: got {len(fixtures)} fixtures, need at least {MIN_FIXTURES}"
        )
    if not 0.0 < holdout < 1.0:
        raise ValueError(f"holdout must be in (0, 1), got {holdout}")

    n = len(fixtures)
    holdout_n = max(1, round(n * holdout))
    if holdout_n >= n:
        holdout_n = n - 1

    rng = random.Random(seed)
    indices = list(range(n))
    rng.shuffle(indices)
    holdout_idx = set(indices[:holdout_n])

    train_list = [fixtures[i] for i in range(n) if i not in holdout_idx]
    holdout_list = [fixtures[i] for i in range(n) if i in holdout_idx]
    return train_list, holdout_list


def _validate_runner(skill_run_fn: Callable[..., float]) -> None:
    if not callable(skill_run_fn):
        raise TypeError("skill_run_fn must be callable")
    try:
        sig = inspect.signature(skill_run_fn)
    except (TypeError, ValueError) as exc:
        raise TypeError(f"skill_run_fn signature unreadable: {exc}") from exc
    params = [
        p for p in sig.parameters.values()
        if p.kind in (p.POSITIONAL_ONLY, p.POSITIONAL_OR_KEYWORD)
    ]
    if len(params) < 2:
        raise TypeError(
            "skill_run_fn must accept (version, fixture); "
            f"got {len(params)} positional parameter(s): "
            f"{[p.name for p in params]}"
        )


def score(
    skill_run_fn: Callable[[Any, Any], float],
    holdout: Sequence[Any],
    before: Any,
    after: Any,
) -> dict:
    """Score `before` and `after` skill versions against holdout fixtures.

    `skill_run_fn(version, fixture)` must return a float score in [0, 1].

    Returns:
        {before_score, after_score, delta, pass}
    """
    _validate_runner(skill_run_fn)
    if not holdout:
        raise ValueError("holdout is empty; nothing to score")

    def _mean(version: Any) -> float:
        scores = []
        for fixture in holdout:
            value = skill_run_fn(version, fixture)
            if not isinstance(value, (int, float)):
                raise TypeError(
                    f"skill_run_fn must return float in [0, 1]; "
                    f"got {type(value).__name__} for fixture {fixture!r}"
                )
            scores.append(float(value))
        return sum(scores) / len(scores)

    before_score = _mean(before)
    after_score = _mean(after)
    delta = after_score - before_score
    return {
        "before_score": before_score,
        "after_score": after_score,
        "delta": delta,
        "pass": delta >= GATE_DELTA,
    }
