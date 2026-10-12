"""Test stand-in for provision-site-info-from-draft.py: prints its dry-run table for a handover file without reading
any site. Exits 9 if asked to --apply, so a test proves the dry run never passes it."""
import json
import sys

if "--apply" in sys.argv:
    print("stub: --apply refused", file=sys.stderr)
    sys.exit(9)
handover = sys.argv[sys.argv.index("--handover") + 1]
entries = [e for e in json.load(open(handover, encoding="utf-8")) if e.get("owner") == "site-info"]
print(f"{len(entries)} site-info entries with a key and an address (0 other entries ignored)")
header = ("key", "current value", "proposed address", "result")
body = [(e["key"], "-", e["address"], "WRITE") for e in entries]
widths = [max(len(line[i]) for line in [header, *body]) for i in range(4)]
lines = [" | ".join(cell.ljust(widths[i]) for i, cell in enumerate(line)).rstrip() for line in [header, *body]]
lines.insert(1, "-+-".join("-" * w for w in widths))
print("\n".join(lines))
print(f"\n{len(body)} to write, 0 skipped.")
print("DRY RUN: nothing written. Re-run with --apply to write.")
