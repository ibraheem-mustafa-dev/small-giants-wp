#!/usr/bin/env python3
"""
Extract the Eye Care Birmingham draft's static product-catalogue data into a plain
JSON file, by PARSING the draft's own JS object/array literals (not hand-typing them).

Source of truth (read-only): the Claude Design draft
    sites/eye-care-ward-end/Ward End Eye Care - SGS Gap Handoff/Eye Care Birmingham.dc.html
which carries a <script data-dc-script> class body with static fields:
    IMG, COLS, PRODUCTS, STYLE_LIST, MATERIALS, FTYPES, HINGES, NOSES, BRANDS, SHAPES

Usage:
    python extract_data.py [path-to-draft.dc.html] [output-data.json]

Both arguments are optional; sensible repo-relative defaults are used when omitted so
this remains repeatable for a future client draft (pass its own path explicitly).
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

FIELDS = [
    "IMG",
    "COLS",
    "PRODUCTS",
    "STYLE_LIST",
    "MATERIALS",
    "FTYPES",
    "HINGES",
    "NOSES",
    "BRANDS",
    "SHAPES",
]


# ─────────────────────────── tiny JS-literal parser ───────────────────────────
# The draft's static fields are JS object/array literals: unquoted object keys,
# single-quoted strings, trailing commas, bare numbers/booleans/null. None of that
# is valid JSON, so we hand-roll a small recursive-descent parser rather than
# hand-typing the 16 products (or any other field) into JSON by eye.


class JSLiteralParser:
    def __init__(self, text: str):
        self.text = text
        self.i = 0
        self.n = len(text)

    def error(self, msg: str):
        snippet = self.text[max(0, self.i - 40) : self.i + 40]
        raise ValueError(f"{msg} at offset {self.i}: ...{snippet}...")

    def skip_ws(self):
        while self.i < self.n:
            c = self.text[self.i]
            if c in " \t\r\n":
                self.i += 1
            elif c == "/" and self.i + 1 < self.n and self.text[self.i + 1] == "/":
                # line comment
                while self.i < self.n and self.text[self.i] != "\n":
                    self.i += 1
            elif c == "/" and self.i + 1 < self.n and self.text[self.i + 1] == "*":
                end = self.text.find("*/", self.i + 2)
                self.i = end + 2 if end != -1 else self.n
            else:
                break

    def parse_value(self):
        self.skip_ws()
        if self.i >= self.n:
            self.error("unexpected end of input")
        c = self.text[self.i]
        if c == "{":
            return self.parse_object()
        if c == "[":
            return self.parse_array()
        if c in "'\"":
            return self.parse_string()
        if self.text.startswith("null", self.i):
            self.i += 4
            return None
        if self.text.startswith("true", self.i):
            self.i += 4
            return True
        if self.text.startswith("false", self.i):
            self.i += 5
            return False
        return self.parse_number()

    def parse_object(self):
        assert self.text[self.i] == "{"
        self.i += 1
        obj = {}
        self.skip_ws()
        if self.i < self.n and self.text[self.i] == "}":
            self.i += 1
            return obj
        while True:
            self.skip_ws()
            key = self.parse_key()
            self.skip_ws()
            if self.text[self.i] != ":":
                self.error("expected ':' after object key")
            self.i += 1
            value = self.parse_value()
            obj[key] = value
            self.skip_ws()
            if self.i >= self.n:
                self.error("unterminated object")
            if self.text[self.i] == ",":
                self.i += 1
                self.skip_ws()
                if self.text[self.i] == "}":
                    self.i += 1
                    break
                continue
            if self.text[self.i] == "}":
                self.i += 1
                break
            self.error("expected ',' or '}' in object")
        return obj

    def parse_key(self):
        self.skip_ws()
        c = self.text[self.i]
        if c in "'\"":
            return self.parse_string()
        # unquoted identifier key
        m = re.match(r"[A-Za-z_$][A-Za-z0-9_$]*", self.text[self.i :])
        if not m:
            self.error("expected object key")
        key = m.group(0)
        self.i += len(key)
        return key

    def parse_array(self):
        assert self.text[self.i] == "["
        self.i += 1
        arr = []
        self.skip_ws()
        if self.i < self.n and self.text[self.i] == "]":
            self.i += 1
            return arr
        while True:
            value = self.parse_value()
            arr.append(value)
            self.skip_ws()
            if self.i >= self.n:
                self.error("unterminated array")
            if self.text[self.i] == ",":
                self.i += 1
                self.skip_ws()
                if self.text[self.i] == "]":
                    self.i += 1
                    break
                continue
            if self.text[self.i] == "]":
                self.i += 1
                break
            self.error("expected ',' or ']' in array")
        return arr

    def parse_string(self):
        quote = self.text[self.i]
        assert quote in "'\""
        self.i += 1
        out = []
        while True:
            if self.i >= self.n:
                self.error("unterminated string")
            c = self.text[self.i]
            if c == "\\":
                nxt = self.text[self.i + 1]
                escapes = {
                    "n": "\n",
                    "t": "\t",
                    "r": "\r",
                    "'": "'",
                    '"': '"',
                    "\\": "\\",
                    "/": "/",
                    "b": "\b",
                    "f": "\f",
                }
                if nxt == "u":
                    code = self.text[self.i + 2 : self.i + 6]
                    out.append(chr(int(code, 16)))
                    self.i += 6
                elif nxt in escapes:
                    out.append(escapes[nxt])
                    self.i += 2
                else:
                    out.append(nxt)
                    self.i += 2
                continue
            if c == quote:
                self.i += 1
                break
            out.append(c)
            self.i += 1
        return "".join(out)

    def parse_number(self):
        m = re.match(r"-?\d+(\.\d+)?([eE][+-]?\d+)?", self.text[self.i :])
        if not m:
            self.error("expected a value (string/number/object/array/bool/null)")
        raw = m.group(0)
        self.i += len(raw)
        return float(raw) if ("." in raw or "e" in raw or "E" in raw) else int(raw)


def parse_js_literal(text: str):
    p = JSLiteralParser(text)
    value = p.parse_value()
    p.skip_ws()
    return value


def extract_balanced(source: str, start_of_value: int) -> str:
    """Given the index of the first '{' or '[' of a JS literal, return the
    substring up to and including its matching close, respecting quoted strings."""
    opener = source[start_of_value]
    closer = {"{": "}", "[": "]"}[opener]
    depth = 0
    i = start_of_value
    n = len(source)
    in_string = None
    while i < n:
        c = source[i]
        if in_string:
            if c == "\\":
                i += 2
                continue
            if c == in_string:
                in_string = None
            i += 1
            continue
        if c in "'\"":
            in_string = c
            i += 1
            continue
        if c == opener:
            depth += 1
        elif c == closer:
            depth -= 1
            if depth == 0:
                return source[start_of_value : i + 1]
        i += 1
    raise ValueError(f"unbalanced literal starting at {start_of_value}")


def extract_field(source: str, field: str):
    m = re.search(rf"static\s+{re.escape(field)}\s*=\s*", source)
    if not m:
        raise ValueError(f"field '{field}' not found in draft")
    start = m.end()
    # skip whitespace to the opening bracket
    j = start
    while source[j] in " \t\r\n":
        j += 1
    literal = extract_balanced(source, j)
    return parse_js_literal(literal)


def main():
    repo_root = Path(__file__).resolve().parents[3]
    default_draft = (
        repo_root
        / "sites"
        / "eye-care-ward-end"
        / "Ward End Eye Care - SGS Gap Handoff"
        / "Eye Care Birmingham.dc.html"
    )
    draft_path = Path(sys.argv[1]) if len(sys.argv) > 1 else default_draft
    out_path = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(__file__).resolve().parent / "data.json"

    source = draft_path.read_text(encoding="utf-8")

    data = {}
    for field in FIELDS:
        data[field] = extract_field(source, field)

    out_path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

    # ─── sanity counts, printed for the operator to eyeball ───
    print(f"Draft:  {draft_path}")
    print(f"Output: {out_path}")
    print()
    print(f"PRODUCTS   : {len(data['PRODUCTS'])} items (expect 16)")
    print(f"BRANDS     : {len(data['BRANDS'])} items")
    print(f"COLS       : {len(data['COLS'])} colours")
    print(f"STYLE_LIST : {len(data['STYLE_LIST'])} shapes")
    print(f"MATERIALS  : {len(data['MATERIALS'])} materials")
    print(f"FTYPES     : {len(data['FTYPES'])} frame types")
    print(f"HINGES     : {len(data['HINGES'])} hinge types")
    print(f"NOSES      : {len(data['NOSES'])} nose-pad types")
    print(f"SHAPES     : {len(data['SHAPES'])} shape-icon entries")
    print(f"IMG        : {len(data['IMG'])} image-slot entries")

    if len(data["PRODUCTS"]) != 16:
        print("\nWARNING: expected 16 PRODUCTS, got", len(data["PRODUCTS"]))
        sys.exit(1)

    # cross-check: every product's brand + colour codes + shape resolve against
    # the reference lists, so a silent typo in the draft doesn't ship unnoticed.
    brand_names = {b[0] for b in data["BRANDS"]}
    shape_names = set(data["STYLE_LIST"])
    colour_codes = set(data["COLS"].keys())
    problems = []
    for p in data["PRODUCTS"]:
        if p["brand"] not in brand_names:
            problems.append(f"product {p['id']} ({p['name']}): brand '{p['brand']}' not in BRANDS")
        if p["shape"] not in shape_names:
            problems.append(f"product {p['id']} ({p['name']}): shape '{p['shape']}' not in STYLE_LIST")
        for code in p.get("cols", []):
            if code not in colour_codes:
                problems.append(f"product {p['id']} ({p['name']}): colour code '{code}' not in COLS")
        if p["mat"] not in data["MATERIALS"]:
            problems.append(f"product {p['id']} ({p['name']}): material '{p['mat']}' not in MATERIALS")
        if p["ftype"] not in data["FTYPES"]:
            problems.append(f"product {p['id']} ({p['name']}): frame type '{p['ftype']}' not in FTYPES")
        if p["hinge"] not in data["HINGES"]:
            problems.append(f"product {p['id']} ({p['name']}): hinge '{p['hinge']}' not in HINGES")
        if p["nose"] not in data["NOSES"]:
            problems.append(f"product {p['id']} ({p['name']}): nose pad '{p['nose']}' not in NOSES")

    if problems:
        print("\nCROSS-CHECK PROBLEMS:")
        for pr in problems:
            print(" -", pr)
        sys.exit(1)

    print("\nAll cross-checks passed (brand/shape/colour/material/ftype/hinge/nose references all resolve).")


if __name__ == "__main__":
    main()
