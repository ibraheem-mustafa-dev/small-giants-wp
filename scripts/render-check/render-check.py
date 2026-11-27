#!/usr/bin/env python3
"""Before-and-after render check: does a build or a step change what a site's pages render?

  python scripts/render-check/render-check.py --from local-mamas --before <checkout|site> --after <checkout|site>
      [--step CMD]... [--seed-step CMD]... [--target mamas-test] [--accepted FILE|none] [--only state,state]
      [--motion no-preference|reduce] [--jobs 6] [--keep] [--keep-shots] [--out DIR]
  python scripts/render-check/render-check.py --self-test [--main-build DIR] [--cards-build DIR]

Two scratch copies of the mirror are made (scripts/local-wp/scratch-mirror.sh): side a gets the before build, side b
the after build (a checkout with a built plugin, synced with its own scripts/local-wp/sync-build.sh; `site` keeps
the mirror's own build). Both are seeded alike (seed.php: a customer, a saved item, an order of fixed date; the
basket is filled per pass), seed steps run on both, steps run on side b, and each copy's database is snapshotted and
restored before every pass. Step placeholders: {site} {port} {url}.

Passes. Hash: every state (states.php, plus `states` in sites/<client>/render-check.json) once on each side; a state
whose responses all hash the same passes as identical bytes. DOM: each other state at 375, 768, 1440 and the first
width of every stylesheet band those miss, at rest and under forced hover and focus. A difference counts only when a
second DOM round, after another restore, shows it again. A counted difference fails unless an entry in
sites/<client>/render-accepted.<target>.json covers it ({"entries": [{"state", "commit", "pair", optional "width", "where",
"element", "note"}]}).

Exit 0: every state reached, no unaccepted difference. 1: an unaccepted difference. 2: a state not reached on either
side (a failed sign-in, an empty basket where a filled one was asked for). 3: the run could not be made. The copies are
dropped in every case unless --keep. Report: <out>/report.md, report.json, pairs/. The raw captures (dom-r1, dom-r2,
hash, hash-r2: 1.5 to 3 GB a whole-site run) are deleted once the report and its crop pairs are written, unless
--keep-shots.
"""
from __future__ import annotations

import argparse
import json
import secrets
import shutil
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import rc_compare as cmp  # noqa: E402
import rc_report  # noqa: E402
import rc_site as site  # noqa: E402

CORE_WIDTHS = (375, 768, 1440)
MIN_W, MAX_W = 320, 1920
SCRATCH = Path("E:/sgs-tmp/render-check")


def widths_for(points: list[int]) -> list[int]:
    """375, 768, 1440 plus the first width of each stylesheet band none of them falls in."""
    pts = sorted({p for p in points if MIN_W < p <= MAX_W})
    starts = [MIN_W] + pts
    out = set(CORE_WIDTHS)
    for i, s in enumerate(starts):
        end = starts[i + 1] - 1 if i + 1 < len(starts) else MAX_W
        if not any(s <= w <= end for w in CORE_WIDTHS):
            out.add(s)
    return sorted(out)


def capture(cfg: dict, out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    cfg = dict(cfg, out=str(out))
    path = out / "config.json"
    path.write_text(json.dumps(cfg), encoding="utf-8")
    r = subprocess.run(["node", str(HERE / "capture.mjs"), str(path)], cwd=HERE)
    if r.returncode != 0:
        raise site.SiteError(f"capture.mjs exited {r.returncode} in {out}")


def dom_diffs(round_dir: Path, key: str, response_diffs: list[str]) -> tuple[list[dict], dict, dict]:
    """Element differences of one state@width on both sides, plus a screenshot difference outside unchanged pictures."""
    o, nn = (json.loads((round_dir / s / f"{key}.json").read_text(encoding="utf-8")) for s in "ab")
    d = cmp.capture_diffs(o, nn)
    pngs = [round_dir / s / f"{key}.png" for s in "ab"]
    if all(p.exists() for p in pngs):
        stems = cmp.changed_picture_stems(response_diffs)
        px = cmp.pixel_diff(pngs[0], pngs[1], cmp.masks(o, stems) + cmp.masks(nn, stems))
        if px:
            d.append(px)
    return d, o, nn


def run_step(cmd: str, name: str, port: int) -> None:
    c = cmd.replace("{site}", name).replace("{port}", str(port)).replace("{url}", f"http://localhost:{port}")
    print(f"  step on {name}: {c}", flush=True)
    r = subprocess.run(c, shell=True)
    if r.returncode != 0:
        raise site.SiteError(f"step exited {r.returncode}: {c}")


def build_label(b: str) -> str:
    if b == "site":
        return "the mirror's own build"
    sha = subprocess.run(["git", "-C", b, "rev-parse", "--short", "HEAD"], capture_output=True, text=True).stdout.strip()
    dirty = subprocess.run(["git", "-C", b, "status", "--porcelain", "--untracked-files=no"], capture_output=True, text=True).stdout.strip()
    return f"{b} at {sha or '?'}" + (" with local changes" if dirty else "")


def run(a) -> int:
    target, client = site.target_for(a.source, a.target)
    accepted_file = None if a.accepted == "none" else Path(a.accepted) if a.accepted else site.REPO / "sites" / client / f"render-accepted.{target}.json"
    entries = []
    if accepted_file and accepted_file.exists():
        data = json.loads(accepted_file.read_text(encoding="utf-8"))
        errs = cmp.validate_accepted(data)
        if errs:
            print(f"render-check: {accepted_file}: " + "; ".join(errs), file=sys.stderr)
            return 3
        entries = data.get("entries", [])
    extra_file = site.REPO / "sites" / client / "render-check.json"
    extra = json.loads(extra_file.read_text(encoding="utf-8")) if extra_file.exists() else {}

    stamp = time.strftime("%m%d%H%M%S")
    run_dir = Path(a.out) if a.out else SCRATCH / "runs" / f"{time.strftime('%Y%m%d-%H%M%S')}-{a.source}"
    run_dir.mkdir(parents=True, exist_ok=True)
    names = {"a": f"local-mediatest-rc{stamp}a", "b": f"local-mediatest-rc{stamp}b"}
    meta = {"source": a.source, "target": target, "client": client, "before": build_label(a.before), "after": build_label(a.after),
            "copies": names, "steps": a.step, "seed_steps": a.seed_step, "accepted_file": str(accepted_file) if accepted_file and accepted_file.exists() else None,
            "dropped": False, "motion": a.motion}
    # Both names are cleaned up whatever happens: a create that dies part-way can leave a database, folder or Apache
    # site behind, and the finally block drops whichever of the two exists.
    created = list(names.values())
    try:
        # One after the other: each create edits Apache's ports.conf and sites, tests the config and reloads Apache,
        # and two at once can read each other's half-written config. Side b is copied from side a, not from the
        # mirror, so both hold the same snapshot even while another session writes to the mirror. Each copy's port is
        # chosen as its create starts, so a port taken by another run during side a's minutes is never reused.
        ports = {"a": site.create(a.source, names["a"])}
        ports["b"] = site.create(names["a"], names["b"])
        print(f"render-check: copies {names['a']} :{ports['a']} (before) and {names['b']} :{ports['b']} (after) in {run_dir}", flush=True)
        with ThreadPoolExecutor(2) as ex:
            jobs = [ex.submit(site.sync_build, Path(b), names[s]) for s, b in (("a", a.before), ("b", a.after)) if b != "site"]
            for f in jobs:
                f.result()
        pwd = secrets.token_urlsafe(14)
        args_file = run_dir / "seed-args.json"
        args_file.write_text(json.dumps({"password": pwd, "product": extra.get("product")}), encoding="utf-8")
        seeds = {s: site.seed(names[s], args_file) for s in "ab"}
        args_file.unlink()
        if seeds["a"] != seeds["b"]:
            raise site.SiteError(f"the two copies seeded differently: {seeds}")
        seed_file = run_dir / "seed.json"
        seed_file.write_text(json.dumps(seeds["a"]), encoding="utf-8")
        for cmd in a.seed_step:
            for s in "ab":
                run_step(cmd, names[s], ports[s])
        for cmd in a.step:
            run_step(cmd, names["b"], ports["b"])
        states = site.states(names["a"], seed_file) + extra.get("states", [])
        seen = [s["name"] for s in states]
        twice = sorted({n for n in seen if seen.count(n) > 1})
        if twice:
            raise site.SiteError(f"state names used twice (states.php and {extra_file.name} must not share a name): {', '.join(twice)}")
        if a.only:
            keep = {n.strip() for n in a.only.split(",") if n.strip()}
            unknown = sorted(keep - set(seen))
            if unknown:
                raise site.SiteError(f"--only names no such state on this site: {', '.join(unknown)} (states: {', '.join(seen)})")
            states = [s for s in states if s["name"] in keep]
        for s in "ab":
            site.snapshot(names[s])

        base = {"sides": {s: {"origin": f"http://localhost:{ports[s]}", "port": ports[s]} for s in "ab"},
                "customer": {"user": seeds["a"]["customer"]["login"], "pwd": pwd + ("-wrong" if a.break_sign_in else "")},
                "product": seeds["a"].get("product"), "states": states, "motion": a.motion, "jobs": a.jobs}

        def restore():
            with ThreadPoolExecutor(2) as ex:
                list(ex.map(site.restore, names.values()))

        restore()
        capture(dict(base, mode="hash"), run_dir / "hash")
        hashed = {s: json.loads((run_dir / "hash" / f"{s}.json").read_text(encoding="utf-8"))["states"] for s in "ab"}
        # A state whose bytes differ is loaded once more on both sides: bytes that match on either load pass, since
        # a build that changed them would change them on every load.
        again = [st for st in states if all(hashed[s][st["name"]]["reached"] for s in "ab") and cmp.hash_diff(hashed["a"][st["name"]], hashed["b"][st["name"]])]
        if again:
            restore()
            capture(dict(base, mode="hash", states=again), run_dir / "hash-r2")
            hashed2 = {s: json.loads((run_dir / "hash-r2" / f"{s}.json").read_text(encoding="utf-8"))["states"] for s in "ab"}
            for st in again:
                n = st["name"]
                if all(hashed2[s][n]["reached"] for s in "ab") and not cmp.hash_diff(hashed2["a"][n], hashed2["b"][n]):
                    hashed["a"][n], hashed["b"][n] = hashed2["a"][n], hashed2["b"][n]
        results, dom_jobs = {}, []
        for st in states:
            n = st["name"]
            ha, hb = hashed["a"][n], hashed["b"][n]
            r = {"auth": st.get("auth", "guest"), "basket": bool(st.get("basket")), "signedInView": bool(st.get("signedInView")),
                 "reached": {"a": ha["reached"], "b": hb["reached"]}, "fails": {"a": ha["fails"], "b": hb["fails"]},
                 "response_diffs": [], "widths": {}, "absent_widths": []}
            if ha.get("absent") and hb.get("absent"):
                r["verdict"] = "not on this page"
                r["fails"] = {"a": [ha["absent"]], "b": [hb["absent"]]}
            elif ha.get("absent") or hb.get("absent"):
                r["verdict"] = "unreached"
                r["reached"] = {"a": not ha.get("absent") and ha["reached"], "b": not hb.get("absent") and hb["reached"]}
                r["fails"] = {s: h["fails"] + ([h["absent"]] if h.get("absent") else []) for s, h in (("a", ha), ("b", hb))}
            elif not (ha["reached"] and hb["reached"]):
                r["verdict"] = "unreached"
            else:
                r["response_diffs"] = cmp.hash_diff(ha, hb)
                if not r["response_diffs"]:
                    r["verdict"] = "identical bytes"
                else:
                    r["verdict"] = "render identical"
                    for w in widths_for(ha.get("breakpoints", []) + hb.get("breakpoints", [])):
                        dom_jobs.append({"state": n, "width": w, "shots": True})
            results[n] = r

        if dom_jobs:
            restore()
            capture(dict(base, mode="dom", domJobs=dom_jobs), run_dir / "dom-r1")
            r1 = {}
            fails1 = json.loads((run_dir / "dom-r1" / "_fails.json").read_text(encoding="utf-8"))
            absent1 = json.loads((run_dir / "dom-r1" / "_absent.json").read_text(encoding="utf-8"))
            for j in dom_jobs:
                key = f"{j['state']}@{j['width']}"
                gone = [s for s in "ab" if f"{s}|{key}" in absent1]
                if len(gone) == 2:
                    results[j["state"]]["absent_widths"].append(j["width"])
                    continue
                if gone:
                    res = results[j["state"]]
                    res["verdict"] = "unreached"
                    res["fails"][gone[0]].append(f"at {j['width']}: {absent1[gone[0] + '|' + key]}")
                    continue
                if fails1.get("a|" + key) or fails1.get("b|" + key):
                    res = results[j["state"]]
                    res["verdict"] = "unreached"
                    for s in "ab":
                        res["fails"][s] += [f"at {j['width']}: {x}" for x in fails1.get(f"{s}|{key}", [])]
                    continue
                d, _, _ = dom_diffs(run_dir / "dom-r1", key, results[j["state"]]["response_diffs"])
                if d:
                    r1[key] = (j, d)
            if r1:
                restore()
                jobs2 = [dict(j, shots=True, probeShots=sorted({x["probe"] for x in d if "probe" in x})) for j, d in r1.values()]
                capture(dict(base, mode="dom", domJobs=jobs2), run_dir / "dom-r2")
                fails2 = json.loads((run_dir / "dom-r2" / "_fails.json").read_text(encoding="utf-8"))
                absent2 = json.loads((run_dir / "dom-r2" / "_absent.json").read_text(encoding="utf-8"))
                for key, (j, d1) in r1.items():
                    p2 = [run_dir / "dom-r2" / s / f"{key}.json" for s in "ab"]
                    why = {s: fails2.get(f"{s}|{key}", []) + ([absent2[f"{s}|{key}"]] if f"{s}|{key}" in absent2 else []) for s in "ab"}
                    if not all(p.exists() for p in p2) or why["a"] or why["b"]:
                        # Round one found a difference that round two could not look at: the state is unreached,
                        # never passed, since the difference may be real.
                        res = results[j["state"]]
                        res["verdict"] = "unreached"
                        for s, p in zip("ab", p2):
                            reasons = why[s] or ([] if p.exists() else ["no capture"])
                            res["fails"][s] += [f"at {j['width']}, round two: {x}" for x in reasons]
                        continue
                    d2, o, nn = dom_diffs(run_dir / "dom-r2", key, results[j["state"]]["response_diffs"])
                    conf, flap = cmp.confirmed(d1, d2)
                    res = results[j["state"]]
                    if not conf:
                        continue
                    for d in conf:
                        e = cmp.accepted_by(d, j["state"], j["width"], entries)
                        if e:
                            d["accepted_by"] = e
                    unaccepted = [d for d in conf if not d.get("accepted_by")]
                    probes = {s: {p["key"] + "|" + p["kind"]: p["i"] for p in x.get("probes", [])} for s, x in zip("ab", (o, nn))}
                    res["widths"][j["width"]] = {"confirmed": conf, "accepted": [d for d in conf if d.get("accepted_by")], "flapping": flap,
                                                 "pairs": rc_report.make_pairs(run_dir, j["state"], j["width"], unaccepted or conf, probes["a"], probes["b"])}
                    if res["verdict"] != "unreached":
                        res["verdict"] = "differs" if unaccepted or res["verdict"] == "differs" else "differs (accepted)"

        unreached = [n for n, r in results.items() if r["verdict"] == "unreached"]
        differs = [n for n, r in results.items() if r["verdict"] == "differs"]
        code = 2 if unreached else 1 if differs else 0
        meta["exit"] = code
        meta["verdict"] = (f"{len(unreached)} state(s) not reached: {', '.join(unreached)}" if unreached
                           else f"{len(differs)} state(s) differ: {', '.join(differs)}" if differs
                           else f"all {len(results)} states reached and render the same")
        meta["viewer_errors"] = sorted({f for r in results.values() for s in "ab" for f in r["fails"][s] if f.startswith(("sign-in failed", "basket not filled", "viewer "))})
        return code
    except (site.SiteError, OSError, ValueError) as e:
        # OSError and ValueError: a capture file missing or unreadable (json.JSONDecodeError is a ValueError).
        print(f"render-check: {e}", file=sys.stderr)
        meta["exit"], meta["verdict"] = 3, f"run could not be made: {str(e)[:300]}"
        return 3
    finally:
        if not a.keep:
            left = []
            for n in created:
                try:
                    if site.exists(n):
                        site.drop(n)
                    if site.exists(n):
                        left.append(n)
                except site.SiteError as e:
                    left.append(n)
                    print(f"render-check: could not drop {n}: {e}", file=sys.stderr)
            meta["dropped"] = not left
        rc_report.write(run_dir, meta, locals().get("results", {}))
        if not a.keep_shots:
            # The crop pairs are cut from dom-r2 by rc_report.write above, so the raw captures go only after it.
            for sub in ("dom-r1", "dom-r2", "hash", "hash-r2"):
                shutil.rmtree(run_dir / sub, ignore_errors=True)
        print(f"render-check: exit {meta.get('exit')}: {meta.get('verdict')}\n  report {run_dir / 'report.md'}", flush=True)


def main() -> int:
    sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--from", dest="source", help="the mirror the copies are made from (local-mamas, local-indus, ...)")
    ap.add_argument("--before", default="site", help="a checkout with a built plugin, or `site`")
    ap.add_argument("--after", default="site", help="a checkout with a built plugin, or `site`")
    ap.add_argument("--step", action="append", default=[], help="a command run against the after copy before capture")
    ap.add_argument("--seed-step", action="append", default=[], help="a command run against both copies after seeding")
    ap.add_argument("--target", help="deploy target whose accepted-differences file applies (default: the mirror's)")
    ap.add_argument("--accepted", help="accepted-differences file, or `none`")
    ap.add_argument("--only", help="comma-separated state names")
    ap.add_argument("--motion", default="no-preference", choices=("no-preference", "reduce"))
    ap.add_argument("--jobs", type=int, default=6)
    ap.add_argument("--keep", action="store_true", help="leave the copies for inspection (drop them with scratch-mirror.sh)")
    ap.add_argument("--keep-shots", action="store_true", help="keep the raw captures (dom-r1, dom-r2, hash, hash-r2) after the report")
    ap.add_argument("--out")
    ap.add_argument("--break-sign-in", action="store_true", help=argparse.SUPPRESS)
    ap.add_argument("--self-test", action="store_true")
    ap.add_argument("--main-build", default=str(Path("E:/sgs-tmp/rc-build-main")))
    ap.add_argument("--cards-build", default=str(Path("E:/sgs-tmp/rc-build-cards")))
    a = ap.parse_args()
    if a.self_test:
        from rc_selftest import self_test

        return self_test(a)
    if not a.source:
        ap.error("--from is required")
    try:
        return run(a)
    except Exception as e:  # noqa: BLE001 - exit 1 means "a difference", so anything unexpected must exit 3
        print(f"render-check: run could not be made: {type(e).__name__}: {e}", file=sys.stderr)
        return 3


if __name__ == "__main__":
    sys.exit(main())
