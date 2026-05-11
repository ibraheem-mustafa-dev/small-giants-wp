"""
recursion-guard.py — depth + cycle protection for DOM-walking pipeline scripts.

Built per spec 14 P2 (2026-05-11). Imported by sgs-clone-orchestrator.py and any
recogniser script that walks a DOM tree. Default max_depth=12 catches runaway
recursion on malformed mockups; visited_nodes set catches cycle revisits.

Usage:
    from recursion_guard import RecursionGuard, RecursionGuardError

    guard = RecursionGuard(max_depth=12)
    def walk(node):
        with guard.enter(id(node)):
            for child in node.children:
                walk(child)

Raises:
    RecursionGuardError(depth=N, visited=set) — on depth overflow OR cycle.
"""

from __future__ import annotations
from contextlib import contextmanager
from typing import Iterator


DEFAULT_MAX_DEPTH = 12


class RecursionGuardError(Exception):
    """Raised when max_depth is exceeded OR a node is revisited (cycle)."""

    def __init__(self, message: str, depth: int, visited: set):
        super().__init__(message)
        self.depth = depth
        self.visited = visited


class RecursionGuard:
    """Context-manager guard for DOM walks. Tracks depth + visited node ids."""

    def __init__(self, max_depth: int = DEFAULT_MAX_DEPTH):
        if max_depth < 1:
            raise ValueError(f'max_depth must be >= 1; got {max_depth}')
        self.max_depth = max_depth
        self._depth = 0
        self._visited: set = set()

    @contextmanager
    def enter(self, node_id) -> Iterator[int]:
        """Enter a node. Raises on depth overflow or revisit. Yields current depth."""
        if node_id in self._visited:
            raise RecursionGuardError(
                f'Cycle detected: node {node_id!r} revisited at depth {self._depth}',
                depth=self._depth,
                visited=self._visited.copy(),
            )
        if self._depth + 1 > self.max_depth:
            raise RecursionGuardError(
                f'Max depth {self.max_depth} exceeded (would be {self._depth + 1})',
                depth=self._depth + 1,
                visited=self._visited.copy(),
            )
        self._depth += 1
        self._visited.add(node_id)
        try:
            yield self._depth
        finally:
            self._depth -= 1

    @property
    def current_depth(self) -> int:
        return self._depth

    @property
    def visited_count(self) -> int:
        return len(self._visited)

    def reset(self) -> None:
        """Reset state for a fresh walk."""
        self._depth = 0
        self._visited.clear()


# --------------------------- self-test ---------------------------

def _selftest() -> tuple[int, int]:
    """Run 3 cases; return (passed, total)."""
    passed = 0
    total = 3

    # Case 1: clean nested walk to depth 11 passes
    try:
        guard = RecursionGuard(max_depth=12)
        def walk(n: int) -> None:
            with guard.enter(f'node-{n}'):
                if n < 11:
                    walk(n + 1)
        guard.reset()
        walk(1)
        if guard.current_depth == 0 and guard.visited_count == 11:
            passed += 1
            print('Case 1 PASS: walk to depth 11 OK')
        else:
            print(f'Case 1 FAIL: depth={guard.current_depth}, visited={guard.visited_count}')
    except Exception as e:
        print(f'Case 1 FAIL: unexpected exception {e!r}')

    # Case 2: walk to depth 13 raises typed error
    try:
        guard = RecursionGuard(max_depth=12)
        def walk(n: int) -> None:
            with guard.enter(f'deep-{n}'):
                walk(n + 1)
        try:
            walk(1)
            print('Case 2 FAIL: expected RecursionGuardError, none raised')
        except RecursionGuardError as e:
            if e.depth == 13:
                passed += 1
                print(f'Case 2 PASS: raised on attempted depth 13 (visited={len(e.visited)})')
            else:
                print(f'Case 2 FAIL: depth={e.depth}, expected 13')
    except Exception as e:
        print(f'Case 2 FAIL: wrong exception type {type(e).__name__}: {e!r}')

    # Case 3: walking the same node twice raises typed error
    try:
        guard = RecursionGuard(max_depth=12)
        try:
            with guard.enter('shared-node'):
                with guard.enter('shared-node'):
                    pass
            print('Case 3 FAIL: expected RecursionGuardError on revisit, none raised')
        except RecursionGuardError as e:
            if 'Cycle detected' in str(e):
                passed += 1
                print(f'Case 3 PASS: cycle detected on revisit (depth={e.depth})')
            else:
                print(f'Case 3 FAIL: wrong error message: {e}')
    except Exception as e:
        print(f'Case 3 FAIL: wrong exception type {type(e).__name__}: {e!r}')

    return passed, total


if __name__ == '__main__':
    import sys
    p, t = _selftest()
    print(f'\nSelf-test: PASS {p}/{t}')
    sys.exit(0 if p == t else 1)
