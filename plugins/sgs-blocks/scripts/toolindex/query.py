#!/usr/bin/env python3
"""
query.py — free-text search over the tool index built by build_index.py.

Purpose: let an agent that knows its INTENT ("check whether the CSS I emit
is actually correct on the live site") find the right script under
plugins/sgs-blocks/scripts/ without knowing its filename. Ranking is plain
TF-IDF cosine similarity between the query and each script's extracted
header-doc text (see build_index.py) — no external ML dependency, so this
runs anywhere Python 3 runs with no pip install.

A script with doc_text == "" (no extractable header comment) still appears
in index.json but can only be found by filename/path substring match, never
by intent — this is reported honestly by --coverage, not hidden.

Usage:
    python query.py "check whether the CSS I emit is actually correct on the live site"
    python query.py --top 10 "deploy to the canary"
    python query.py --coverage          # print index coverage stats only
    python query.py --path-substring roundtrip   # fallback filename search
"""

import argparse
import json
import math
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path

# Windows consoles default to cp1252, which cannot encode characters some
# docblocks use (arrows, em dashes outside the cp1252 set). Reconfigure
# stdout to UTF-8 with a safe fallback so a rich docblock never crashes the
# query tool mid-print — this hit real output during control-testing.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

TOKEN_RE = re.compile(r"[a-zA-Z][a-zA-Z']{1,}")

# A short stopword list — trimmed to words that carry no discriminating
# signal in this corpus (English function words + a few filler verbs that
# appear in nearly every docblock regardless of topic, e.g. "the", "this").
STOPWORDS = {
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "this", "that", "these", "those", "it", "its", "of", "to", "in", "on",
    "for", "and", "or", "but", "not", "no", "as", "at", "by", "with",
    "from", "into", "than", "then", "so", "if", "when", "where", "which",
    "who", "what", "how", "do", "does", "did", "done", "has", "have",
    "had", "will", "would", "can", "could", "should", "must", "may",
    "might", "each", "every", "any", "all", "both", "own", "same", "such",
    "only", "just", "also", "very", "more", "most", "some", "one", "two",
    "three", "i", "you", "we", "they", "he", "she", "them", "his", "her",
    "their", "our", "your", "my", "me", "us", "here", "there", "up",
    "out", "over", "under", "again", "once", "s", "t", "re", "ve", "ll",
    "d", "m",
}


SUFFIXES = ("ically", "ation", "ingly", "edly", "ings", "ness", "ment",
            "ing", "edy", "ed", "ly", "es", "s")


def stem(word: str) -> str:
    """A deliberately crude suffix-stripping stemmer — not Porter, just
    enough to fold "correct/correctly", "emit/emitted/emits",
    "check/checks/checking" onto one token so a query and a docblock using
    different inflections of the same word still match. Guards a minimum
    stem length of 4 so short real words (e.g. "css", "is") are untouched."""
    lower = word.lower()
    for suf in SUFFIXES:
        if lower.endswith(suf) and len(lower) - len(suf) >= 4:
            return lower[: -len(suf)]
    return lower


def tokenize(text: str):
    return [
        stem(w)
        for w in TOKEN_RE.findall(text)
        if w.lower() not in STOPWORDS and len(w) > 1
    ]


def load_index(index_path: Path) -> dict:
    return json.loads(index_path.read_text(encoding="utf-8"))


def build_tfidf(entries):
    """Returns (doc_vectors, idf) where doc_vectors[i] is a Counter of
    term -> tf-idf weight for entries[i]'s doc_text (+ filename tokens at a
    lower implicit weight via a single inclusion, not repeated)."""
    doc_tokens = []
    for e in entries:
        tokens = tokenize(e["doc_text"])
        doc_tokens.append(tokens)

    df = Counter()
    for tokens in doc_tokens:
        for term in set(tokens):
            df[term] += 1

    n_docs = len(entries)
    idf = {
        term: math.log((n_docs + 1) / (freq + 1)) + 1.0
        for term, freq in df.items()
    }

    doc_vectors = []
    for tokens in doc_tokens:
        tf = Counter(tokens)
        vec = {term: (count / max(len(tokens), 1)) * idf.get(term, 0.0)
               for term, count in tf.items()}
        doc_vectors.append(vec)

    return doc_vectors, idf


def cosine(vec_a: dict, vec_b: dict) -> float:
    if not vec_a or not vec_b:
        return 0.0
    common = set(vec_a) & set(vec_b)
    dot = sum(vec_a[t] * vec_b[t] for t in common)
    norm_a = math.sqrt(sum(v * v for v in vec_a.values()))
    norm_b = math.sqrt(sum(v * v for v in vec_b.values()))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def search(index: dict, query_text: str, top: int = 8):
    entries = index["entries"]
    doc_vectors, idf = build_tfidf(entries)

    q_tokens = tokenize(query_text)
    q_tf = Counter(q_tokens)
    q_vec = {
        term: (count / max(len(q_tokens), 1)) * idf.get(term, 0.0)
        for term, count in q_tf.items()
    }

    scored = []
    for entry, vec in zip(entries, doc_vectors):
        score = cosine(q_vec, vec)
        if score > 0:
            scored.append((score, entry))

    scored.sort(key=lambda pair: pair[0], reverse=True)
    return scored[:top], set(q_tokens)


def path_substring_search(index: dict, substring: str):
    substring = substring.lower()
    return [
        e for e in index["entries"]
        if substring in e["path"].lower()
    ]


def print_results(scored, query_tokens):
    if not scored:
        print("No matches.")
        return
    for score, entry in scored:
        doc_terms = set(tokenize(entry["doc_text"]))
        overlap = sorted(query_tokens & doc_terms)
        print(f"[{score:.3f}] {entry['path']}")
        if entry["summary"]:
            print(f"        {entry['summary']}")
        if overlap:
            print(f"        matched terms: {', '.join(overlap)}")
        print()


def print_coverage(index: dict):
    print(f"Total scripts indexed: {index['total_scripts']}")
    print(f"With extractable header doc: {index['documented_count']}")
    print(f"Without any extractable header doc: {index['undocumented_count']}")
    pct = 100.0 * index["documented_count"] / max(index["total_scripts"], 1)
    print(f"Coverage: {pct:.1f}%")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("query", nargs="?", help="free-text intent description")
    parser.add_argument("--top", type=int, default=8)
    parser.add_argument(
        "--index",
        type=Path,
        default=Path(__file__).resolve().parent / "index.json",
    )
    parser.add_argument("--coverage", action="store_true")
    parser.add_argument(
        "--path-substring",
        help="fallback: filename/path substring search, no ranking",
    )
    args = parser.parse_args()

    if not args.index.exists():
        # The index is a generated artefact (~1.5MB), rebuilt from the tree in
        # under two seconds, so it is not tracked in git. Build it on demand
        # rather than making a caller who just wants to find a tool run a
        # second command first — needing prior setup is the discoverability
        # failure this index exists to remove.
        builder = Path(__file__).resolve().parent / "build_index.py"
        if not builder.exists():
            print(f"Index not found at {args.index} and {builder} is missing.", file=sys.stderr)
            return 1
        print(f"Index not found - building it ({builder.name})...", file=sys.stderr)
        built = subprocess.run(
            [sys.executable, str(builder), "--out", str(args.index)],
            capture_output=True,
            text=True,
        )
        if built.returncode != 0 or not args.index.exists():
            print(
                f"Index build failed (exit {built.returncode}): {built.stderr.strip()}",
                file=sys.stderr,
            )
            return 1

    index = load_index(args.index)

    if args.coverage:
        print_coverage(index)
        return 0

    if args.path_substring:
        matches = path_substring_search(index, args.path_substring)
        for e in matches:
            print(e["path"])
        return 0

    if not args.query:
        parser.print_help()
        return 1

    scored, q_tokens = search(index, args.query, top=args.top)
    print_results(scored, q_tokens)
    return 0


if __name__ == "__main__":
    sys.exit(main())
