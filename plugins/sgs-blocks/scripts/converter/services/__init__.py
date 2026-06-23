"""Resolver services — the small typed steps a resolver composes.

Service signatures are frozen in design §3.1. Each service wraps ``db_lookup`` for
NAME resolution only; the value-transfer logic is rebuilt fresh in the resolver and
validated draft-vs-clone (D-B), never copied from the frozen convert.py.

Populated in the slice build (Task 2): layer_detect, attr_resolve, tier_suffix,
value_serialise, token_snap, validate, gap_writer.
"""
