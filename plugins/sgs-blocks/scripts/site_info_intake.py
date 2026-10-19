"""
site_info_intake.py: the confirmed Site Info proposal from intake as provision-site-info-from-draft.py entries.

Intake (scripts/computed-route/lib/intake-siteinfo.mjs) writes `siteInfo.rows[]` ({ rowId, key, value, normalised })
into intake.json, and Bean's review marks sit in `review[]` ({ rowId, rowType: 'site-info', mark }). A row reaches
the handover only through its mark:
  - `accept`          the row's value (the email's normalised form, as intake's handoverFor() does);
  - `edit:<value>`    the edited value replaces the row's;
  - `drop`            not applied;
  - missing or empty  refused: an unreviewed row is never written;
  - anything else     refused as an unknown mark.
Intake names hours `hours.<day>` (it renames sync-business-info.py's `opening_hours.<day>` on the way in); Site
Info stores them as `opening_hours.<mon..sun>` (Sgs_Site_Info::build_sanitisers), so the name is mapped back here.

Facts Bean gives outside the draft arrive as `--set key=value` entries (ref `--set`).
"""
from __future__ import annotations

import json
from pathlib import Path

SITE_INFO_DAYS = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")


def site_info_key(intake_key: str) -> str:
    """Intake's key as the Site Info key: `hours.monday` -> `opening_hours.mon`; every other key is unchanged."""
    if intake_key.startswith("hours."):
        day = intake_key.split(".", 1)[1].strip().lower()
        if len(day) >= 3 and day[:3] in SITE_INFO_DAYS:
            return f"opening_hours.{day[:3]}"
    return intake_key


def _value_for(row: dict, mark: str) -> tuple[str | None, str]:
    """The value a mark confirms, or None and the reason the row is not applied."""
    if mark == "drop":
        return None, "dropped in review"
    if mark.startswith("edit:"):
        edited = mark[len("edit:"):].strip()
        return (edited, "") if edited else (None, "edit mark holds no value")
    if mark != "accept":
        return None, f"unknown review mark {mark!r}"
    if row.get("valid") is False:
        return None, f"intake refused it: {row.get('reason') or 'failed shape validation'}"
    value = row.get("normalised") if row.get("key") == "email" else row.get("value")
    if not isinstance(value, str) or not value.strip():
        return None, "row holds no text value"
    return value, ""


def read_intake(path: Path) -> tuple[list[dict], list[dict]]:
    """(entries, refused): handover entries for the marked rows, and every row not applied with its reason."""
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    site_info = data.get("siteInfo") if isinstance(data, dict) else None
    if not isinstance(site_info, dict) or not isinstance(site_info.get("rows"), list):
        raise ValueError(f"{path} holds no siteInfo.rows list")
    marks = {
        r.get("rowId"): r.get("mark")
        for r in data.get("review", []) if isinstance(r, dict) and r.get("rowType") == "site-info"
    }
    entries: list[dict] = []
    refused: list[dict] = []
    for row in site_info["rows"]:
        if not isinstance(row, dict) or not isinstance(row.get("key"), str):
            continue
        row_id = str(row.get("rowId", ""))
        key = site_info_key(row["key"])
        if row_id not in marks:
            refused.append({"rowId": row_id, "key": key, "reason": "no review entry"})
            continue
        mark = marks[row_id]
        if not isinstance(mark, str) or not mark.strip():
            refused.append({"rowId": row_id, "key": key, "reason": "not marked in review"})
            continue
        value, reason = _value_for(row, mark.strip())
        if value is None:
            refused.append({"rowId": row_id, "key": key, "reason": reason})
            continue
        entries.append({"key": key, "address": value, "ref": row_id, "source": str(path)})
    return entries, refused


def parse_sets(items: list[str]) -> list[dict]:
    """`--set key=value` arguments as handover entries; a malformed item raises ValueError."""
    entries: list[dict] = []
    for item in items:
        key, sep, value = item.partition("=")
        if not sep or not key.strip() or not value.strip():
            raise ValueError(f"--set needs key=value, got {item!r}")
        entries.append({"key": key.strip(), "address": value.strip(), "ref": "--set", "source": "--set"})
    return entries


def format_refused(refused: list[dict]) -> str:
    """One line per intake row that is not applied."""
    return "\n".join(f"  {r['rowId']} ({r['key']}): {r['reason']}" for r in refused)
