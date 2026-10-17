"""
certainty_calc.py — Agreement-weighted certainty scoring for batches of model responses.

Given a list of model responses, computes how much they agree with each other.
Used by /qc Stage 3 evidence pass and /gap-analysis Lens 3 (robustness).

Algorithm:
  - Pairwise similarity via difflib.SequenceMatcher.ratio() (normalised edit distance proxy)
  - Dominant answer = response with highest summed similarity to all others
  - Certainty = mean pairwise similarity × 100, rounded to 1 d.p.
  - Dissenting = responses whose max similarity to any other is below 0.7
  - Verdict: OK (≥70), REVIEW (50–69), HOLD (<50)
"""

from __future__ import annotations

import difflib
import statistics


def _pairwise_similarities(responses: list[str]) -> list[tuple[int, int, float]]:
    """Return (i, j, similarity) for every unique pair in the response list."""
    pairs: list[tuple[int, int, float]] = []
    n = len(responses)
    for i in range(n):
        for j in range(i + 1, n):
            sim = difflib.SequenceMatcher(None, responses[i], responses[j]).ratio()
            pairs.append((i, j, sim))
    return pairs


def score(responses: list[str]) -> dict:
    """Compute agreement-weighted certainty for a batch of model responses.

    Args:
        responses: A list of model response strings. Typically 5 items.

    Returns:
        {
            "certainty": float,        # 0.0–100.0 — mean pairwise agreement
            "dominant_answer": str,    # the most-agreed-with response
            "dissenting_count": int,   # responses with no strong agreement partner
            "verdict": str,            # "OK" (≥70), "REVIEW" (50–69), "HOLD" (<50)
        }

    Raises:
        ValueError: if responses is empty or has fewer than 2 items.
    """
    if not responses:
        raise ValueError("responses is empty")
    if len(responses) < 2:
        raise ValueError("need at least 2 responses to score agreement")

    pairs = _pairwise_similarities(responses)
    n = len(responses)

    # Summed similarity per response (used to find dominant answer)
    summed: list[float] = [0.0] * n
    # Max similarity each response has with any single other response
    max_sim: list[float] = [0.0] * n

    for i, j, sim in pairs:
        summed[i] += sim
        summed[j] += sim
        if sim > max_sim[i]:
            max_sim[i] = sim
        if sim > max_sim[j]:
            max_sim[j] = sim

    dominant_idx = summed.index(max(summed))
    dominant_answer = responses[dominant_idx]

    # Certainty = mean of all pairwise similarities × 100
    all_sims = [sim for _, _, sim in pairs]
    mean_sim = statistics.mean(all_sims)
    certainty = round(mean_sim * 100, 1)

    # Dissenting = those with no strong agreement partner (max_sim < 0.7)
    dissenting_count = sum(1 for ms in max_sim if ms < 0.7)

    if certainty >= 70:
        verdict = "OK"
    elif certainty >= 50:
        verdict = "REVIEW"
    else:
        verdict = "HOLD"

    return {
        "certainty": certainty,
        "dominant_answer": dominant_answer,
        "dissenting_count": dissenting_count,
        "verdict": verdict,
    }
