"""PHP lexing for the scanner: string and inline-HTML segments, a code mask, brace
frames and the loop or condition around a position. Input is comment-stripped PHP."""
from __future__ import annotations

import re


def php_segments(src: str):
    """Yield (start, end, kind, content) for each string literal and inline-HTML run.
    kind is "'", '"' or 'html'; a heredoc counts as '"'."""
    i, n = 0, len(src)
    in_php = src.lstrip().startswith('<?php') or '<?php' not in src
    if src.startswith('<?php'):
        i = 5
    while i < n:
        if not in_php:
            j = src.find('<?php', i)
            j2 = src.find('<?=', i)
            if j < 0 or (0 <= j2 < j):
                j = j2
            end = n if j < 0 else j
            yield (i, end, 'html', src[i:end])
            if j < 0:
                return
            i = j + (5 if src.startswith('<?php', j) else 3)
            in_php = True
            continue
        c = src[i]
        if c == '?' and src.startswith('?>', i):
            in_php = False
            i += 2
            continue
        if c in ("'", '"'):
            j = i + 1
            while j < n and src[j] != c:
                j += 2 if src[j] == '\\' else 1
            yield (i + 1, j, c, src[i + 1:j])
            i = j + 1
            continue
        if c == '<' and src.startswith('<<<', i):
            m = re.match(r"<<<\s*['\"]?(\w+)['\"]?\n", src[i:])
            if m:
                tag = m.group(1)
                endm = re.search(r'\n\s*' + tag + r'\b', src[i + m.end():])
                j = i + m.end() + (endm.start() if endm else 0)
                yield (i + m.end(), j, '"', src[i + m.end():j])
                i = j + (endm.end() - endm.start() if endm else 1)
                continue
        i += 1


def code_mask(src: str, segments) -> str:
    """The source with every string or HTML segment (and its quotes) blanked, newlines kept."""
    chars = list(src)
    for s, e, _k, _c in segments:
        for k in range(max(s - 1, 0), min(e + 1, len(chars))):
            if chars[k] != '\n':
                chars[k] = ' '
    return ''.join(chars)


def frames_of(mask: str, src: str):
    """Brace frames (start, end, header) plus PHP alternative-syntax frames (if: ... endif)."""
    frames, stack = [], []
    last_break = 0
    for i, ch in enumerate(mask):
        if ch == '{':
            stack.append((i, src[last_break:i].strip()[-240:]))
            last_break = i + 1
        elif ch == '}':
            if stack:
                s, h = stack.pop()
                frames.append((s, i, h))
            last_break = i + 1
        elif ch == ';':
            last_break = i + 1
    alt = []
    for m in re.finditer(r'\b(if|elseif|else|foreach|for|while)\b(\s*\((?:[^()]|\([^()]*\))*\))?\s*:(?!:)|\b(endif|endforeach|endfor|endwhile)\b', mask):
        if m.group(3):
            if alt:
                s, h = alt.pop()
                frames.append((s, m.start(), h))
        else:
            if m.group(1) in ('elseif', 'else') and alt:
                s, h = alt.pop()
                frames.append((s, m.start(), h))
            alt.append((m.end(), src[m.start():m.end()][:240]))
    return frames


LOOP_HDR = re.compile(r'\b(foreach|for|while)\s*\(|\.forEach\s*\(|\.map\s*\(|array_map\s*\(|array_walk\s*\(|\.reduce\s*\(|\bfor\s+await')
COND_HDR = re.compile(r'\b(if|elseif|else|switch|case)\b')


def context_at(pos: int, frames, mask: str, src: str):
    """(loops, conditions) around pos: enclosing loop and condition headers, early-return
    guards before it, and the ternary or short-circuit condition of its branch."""
    loops, conds = [], []
    for s, e, h in frames:
        if s < pos < e:
            if LOOP_HDR.search(h):
                loops.append(h[-120:])
            elif COND_HDR.search(h):
                conds.append(h[-160:])
        elif e < pos and COND_HDR.search(h) and re.search(r'\breturn\b', mask[s:e]) and len(mask[s:e].strip()) < 160:
            conds.append('guard: ' + h[-160:])
    c = ternary_condition(pos, mask, src)
    if c:
        conds.append(c)
    return loops, conds


def ternary_condition(pos: int, mask: str, src: str):
    """The condition of the ternary (or && / || short-circuit) whose branch holds pos, or None."""
    st = max(mask.rfind(';', 0, pos), mask.rfind('{', 0, pos), mask.rfind('}', 0, pos))
    seg = mask[st + 1:pos]
    depth = 0
    q = None
    for i in range(len(seg) - 1, -1, -1):
        ch = seg[i]
        if ch == ')':
            depth += 1
        elif ch == '(':
            if depth == 0:
                break
            depth -= 1
        elif depth == 0 and ch == '?' and seg[i + 1:i + 2] not in ('?', '>', ':') and seg[i - 1:i] != '?':
            q = i
            break
        elif depth == 0 and seg[i:i + 2] in ('&&', '||'):
            q = i
            break
    if q is None:
        return None
    depth = 0
    start = 0
    for i in range(q - 1, -1, -1):
        ch = seg[i]
        if ch == ')':
            depth += 1
        elif ch == '(':
            if depth == 0:
                start = i + 1
                break
            depth -= 1
        elif depth == 0 and (ch in ',=.' or seg[i:i + 4] == 'echo'):
            start = i + 1
            break
    txt = src[st + 1 + start:st + 1 + q].strip()
    return txt[-160:] if txt else None
