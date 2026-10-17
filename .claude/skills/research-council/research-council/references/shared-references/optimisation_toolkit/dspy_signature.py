"""
dspy_signature — wraps any LLM prompt in a DSPy ChainOfThought signature and
optionally optimises it via MIPROv2 on a canary held-out set.

Public API:
    wrap(prompt: str) -> ChainOfThoughtAdapter
    optimise(prompt, holdout, runner, *, optimiser=None, gate=0.05) -> dict

Consumer hook: /skill-optimiser Stage 3.

DSPy is an optional dependency. If not installed:
    - wrap() returns a lightweight shim (ChainOfThoughtAdapter) that stores the prompt.
    - optimise() raises RuntimeError with install hint when optimiser=None.
    - When a custom optimiser callable is supplied, DSPy is never touched.
"""

from __future__ import annotations

from typing import Any, Callable, Sequence


# ---------------------------------------------------------------------------
# Adapter — wraps a prompt, exposes .signature and .run()
# ---------------------------------------------------------------------------

class ChainOfThoughtAdapter:
    """Thin wrapper around a DSPy ChainOfThought module (or a shim when DSPy is absent).

    Attributes:
        prompt (str): The original prompt string.
        signature (str): Alias for prompt — the instruction passed to the model.
    """

    def __init__(self, prompt: str, _dspy_module: Any = None) -> None:
        if not isinstance(prompt, str) or not prompt:
            raise ValueError("prompt must be a non-empty string")
        self.prompt: str = prompt
        self.signature: str = prompt
        self._dspy_module = _dspy_module  # real dspy.ChainOfThought, or None

    def run(self, input_value: Any) -> Any:
        """Invoke the underlying DSPy module with input_value.

        Raises:
            RuntimeError: if no DSPy module is configured (DSPy not installed or
                          no dspy.LM set on the calling thread).
        """
        if self._dspy_module is None:
            raise RuntimeError(
                "No DSPy module configured — install DSPy (`pip install dspy-ai`) "
                "and call dspy.configure(lm=...) before calling .run()."
            )
        return self._dspy_module(input=input_value)


# ---------------------------------------------------------------------------
# wrap()
# ---------------------------------------------------------------------------

def wrap(prompt: str) -> ChainOfThoughtAdapter:
    """Return a ChainOfThoughtAdapter wrapping *prompt*.

    If DSPy is installed, builds a real dspy.ChainOfThought signature using the
    prompt as the instruction field.  If DSPy is absent, returns a lightweight
    shim that stores the prompt without making any network calls.

    Args:
        prompt: The instruction text to wrap.

    Returns:
        ChainOfThoughtAdapter with .prompt / .signature set to *prompt*.
    """
    if not isinstance(prompt, str) or not prompt:
        raise ValueError("prompt must be a non-empty string")

    dspy_module = None
    try:
        import dspy  # noqa: F401  (lazy — never at module top level)

        # Build a minimal DSPy Signature and ChainOfThought wrapper.
        # We do NOT configure an LM here — the caller is responsible for that.
        class _PromptSignature(dspy.Signature):  # type: ignore[misc]
            """Dynamic signature for an arbitrary instruction."""
            instruction: str = dspy.InputField(desc="User instruction or prompt")
            answer: str = dspy.OutputField(desc="Model response")

        # Attach the prompt as a docstring-level instruction.
        _PromptSignature.__doc__ = prompt

        cot = dspy.ChainOfThought(_PromptSignature)
        dspy_module = cot

    except ImportError:
        pass  # DSPy not installed — shim path below is sufficient

    return ChainOfThoughtAdapter(prompt=prompt, _dspy_module=dspy_module)


# ---------------------------------------------------------------------------
# optimise()
# ---------------------------------------------------------------------------

def optimise(
    prompt: str,
    holdout: Sequence[Any],
    runner: Callable[[str, Any], float],
    *,
    optimiser: Callable[[str, Sequence[Any], Callable[[str, Any], float]], str] | None = None,
    gate: float = 0.05,
) -> dict:
    """Optimise *prompt* against *holdout* fixtures using MIPROv2 (or a custom optimiser).

    On first run, searches for a better instruction + demos on the holdout set.
    Returns the optimised prompt only when ``delta >= gate``; otherwise the
    original prompt is returned unchanged.

    Args:
        prompt:     The candidate instruction string to improve.
        holdout:    Sequence of fixtures to score against (same shape as
                    canary_split.score holdout).
        runner:     Callable ``(prompt: str, fixture: Any) -> float`` that
                    scores a given prompt on a single fixture.  Must return a
                    float in [0, 1].
        optimiser:  Optional callable ``(prompt, holdout, runner) -> str``
                    returning a candidate optimised prompt.  When None,
                    MIPROv2 is used (requires DSPy).
        gate:       Minimum delta required for the optimised prompt to be
                    accepted (default 0.05).

    Returns:
        dict with keys:
            prompt (str)          — accepted prompt (optimised or original)
            before_score (float)  — mean score of *prompt* on holdout
            after_score (float)   — mean score of candidate on holdout
            delta (float)         — after_score - before_score
            pass (bool)           — True iff delta >= gate

    Raises:
        ValueError:  empty holdout, or gate outside (0, 1).
        RuntimeError: optimiser is None and DSPy is not installed.
        TypeError:   runner is not callable or has wrong signature.
    """
    if not isinstance(prompt, str) or not prompt:
        raise ValueError("prompt must be a non-empty string")
    if not holdout:
        raise ValueError("holdout must not be empty")
    if not callable(runner):
        raise TypeError("runner must be callable")
    if not 0.0 < gate < 1.0:
        raise ValueError(f"gate must be in (0, 1), got {gate}")

    # Resolve the optimiser to use.
    if optimiser is None:
        optimiser = _miprov2_optimiser()  # raises RuntimeError if DSPy absent

    # Score the original prompt.
    before_score = _mean_score(runner, prompt, holdout)

    # Obtain candidate optimised prompt.
    candidate: str = optimiser(prompt, holdout, runner)

    # Score the candidate.
    after_score = _mean_score(runner, candidate, holdout)

    delta = after_score - before_score
    accepted = delta >= gate

    return {
        "prompt": candidate if accepted else prompt,
        "before_score": before_score,
        "after_score": after_score,
        "delta": delta,
        "pass": accepted,
    }


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _mean_score(
    runner: Callable[[str, Any], float],
    prompt: str,
    holdout: Sequence[Any],
) -> float:
    """Return the mean runner score for *prompt* across all holdout fixtures."""
    total = 0.0
    for fixture in holdout:
        value = runner(prompt, fixture)
        if not isinstance(value, (int, float)):
            raise TypeError(
                f"runner must return float in [0, 1]; "
                f"got {type(value).__name__} for fixture {fixture!r}"
            )
        total += float(value)
    return total / len(holdout)


def _miprov2_optimiser() -> Callable[[str, Sequence[Any], Callable[[str, Any], float]], str]:
    """Return a MIPROv2-backed optimiser callable.

    Raises:
        RuntimeError: if DSPy is not installed.
    """
    try:
        import dspy  # noqa: F401
        import dspy.teleprompt  # noqa: F401
    except ImportError as exc:
        raise RuntimeError(
            "DSPy is not installed — cannot use the default MIPROv2 optimiser. "
            "Install it with `pip install dspy-ai`, or supply a custom `optimiser=` "
            "callable to `optimise()`."
        ) from exc

    def _run(
        prompt: str,
        holdout: Sequence[Any],
        runner: Callable[[str, Any], float],
    ) -> str:
        """Run MIPROv2 to search for a better instruction.

        NOTE: This requires a configured dspy.LM on the calling thread.
        """
        import dspy
        import dspy.teleprompt

        class _Sig(dspy.Signature):
            instruction: str = dspy.InputField(desc="Instruction or prompt")
            answer: str = dspy.OutputField(desc="Model response")

        _Sig.__doc__ = prompt

        def _trainset():
            return [dspy.Example(instruction=str(f)).with_inputs("instruction") for f in holdout]

        def _metric(example, pred, _trace=None):
            return runner(pred.answer if hasattr(pred, "answer") else str(pred), example.instruction)

        teleprompter = dspy.teleprompt.MIPROv2(metric=_metric, auto="light")
        programme = dspy.ChainOfThought(_Sig)
        optimised = teleprompter.compile(programme, trainset=_trainset())

        # Extract the optimised instruction string.
        try:
            new_instruction = optimised.predict.signature.instructions
        except AttributeError:
            new_instruction = prompt  # graceful fallback

        return new_instruction if isinstance(new_instruction, str) else prompt

    return _run
