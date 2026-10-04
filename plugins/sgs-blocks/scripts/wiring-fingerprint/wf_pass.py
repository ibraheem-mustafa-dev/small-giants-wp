"""The front-end pass: for every block, the PHP texts its render reaches, the
prefix-helper derivations, the B1 scope-hash result and each attribute's channel
(wf_frontend.FrontEnd.channel), plus, for a show/hide toggle, whether it fixes a
paint declaration itself (wf_channel.ChannelAnalyser.control_paint).

The pass is the gate's slowest step, so it runs in a pool of worker processes.
Blocks are dealt in sorted order into CHUNKS fixed chunks and every chunk starts
from a cleared parameter memo, so the result is the same whatever the worker
count or scheduling; a small tree (the test fixtures) runs the same chunks in
this process.
"""
from __future__ import annotations

import os
from concurrent.futures import Future, ProcessPoolExecutor
from dataclasses import dataclass, field
from pathlib import Path

from wf_bugs import scope_hash_bug
from wf_channel import ChannelAnalyser
from wf_frontend import FrontEnd, prefix_helpers
from wf_paths import Roots
from wf_php import PhpIndex

CHUNKS = 8
PARALLEL_MIN_BLOCKS = 32


@dataclass(frozen=True)
class BlockJob:
    block: str
    bdir: Path
    attrs: tuple[tuple[str, bool], ...]                         # (attribute, is a show/hide toggle)
    consumers: tuple[tuple[str, str, tuple[Path, ...]], ...] = ()  # (attribute, context key, consumer dirs)


@dataclass
class BlockResult:
    derived: dict
    scoped_ctx: list
    channels: dict = field(default_factory=dict)   # attribute -> (Channel, where, toggle paints)


class FrontPass:
    """One process's index and analysers over the plugin's PHP."""

    def __init__(self, roots: Roots) -> None:
        self.index = PhpIndex(sorted(roots.includes.glob("**/*.php")) + sorted(roots.blocks.glob("**/*.php")))
        self.slugs = {d.name for d in roots.blocks.iterdir() if (d / "block.json").exists()} if roots.blocks.exists() else set()
        self.analyser = ChannelAnalyser(self.index, self.slugs)
        self.fe = FrontEnd(self.index, self.analyser, prefix_helpers(self.index, roots.plugin / "scripts" / "check-dead-controls.js"),
                           roots.includes)

    def run(self, jobs: list[BlockJob]) -> dict[str, BlockResult]:
        self.analyser.reset_memo()
        out: dict[str, BlockResult] = {}
        for job in jobs:
            prefix = job.bdir.as_posix() + "/"
            texts, derived = self.fe.block_texts(job.bdir)
            res = BlockResult(derived=dict(derived),
                              scoped_ctx=scope_hash_bug([t for t in texts if t.path.startswith(prefix)], self.analyser))
            ctx = {a: (k, dirs) for a, k, dirs in job.consumers}
            for attr, switch in job.attrs:
                key, dirs = ctx.get(attr, ("", ()))
                consumers = [(self.fe.block_texts(d)[0], key) for d in dirs]
                ch, where = self.fe.channel(attr, texts, derived, consumers, job.block, prefix)
                toggle = switch and (bool(ch.gate_paint) or self.analyser.control_paint(ch.gate_sites))
                ch.gate_sites = set()   # texts stay in this process
                res.channels[attr] = (ch, where, toggle)
            out[job.block] = res
        return out


_WORKER: FrontPass | None = None


def _init(roots: Roots) -> None:
    global _WORKER
    _WORKER = FrontPass(roots)


def _run_chunk(jobs: list[BlockJob]) -> dict[str, BlockResult]:
    assert _WORKER is not None
    return _WORKER.run(jobs)


class PassRun:
    """Starts the pass at once (workers build their own index while the caller
    builds its own), and hands the merged result over on `result()`."""

    def __init__(self, roots: Roots, jobs: list[BlockJob]) -> None:
        jobs = sorted(jobs, key=lambda j: j.block)
        self.chunks = [c for c in (jobs[i::CHUNKS] for i in range(CHUNKS)) if c]
        workers = min(len(self.chunks), os.cpu_count() or 1)
        self._pool: ProcessPoolExecutor | None = None
        self._futures: list[Future] = []
        if len(jobs) >= PARALLEL_MIN_BLOCKS and workers > 1:
            self._pool = ProcessPoolExecutor(max_workers=workers, initializer=_init, initargs=(roots,))
            self._futures = [self._pool.submit(_run_chunk, c) for c in self.chunks]

    def result(self, local: FrontPass) -> dict[str, BlockResult]:
        out: dict[str, BlockResult] = {}
        if self._pool is None:
            for c in self.chunks:
                out.update(local.run(c))
            return out
        try:
            for f in self._futures:
                out.update(f.result())
        finally:
            self._pool.shutdown()
        return out
