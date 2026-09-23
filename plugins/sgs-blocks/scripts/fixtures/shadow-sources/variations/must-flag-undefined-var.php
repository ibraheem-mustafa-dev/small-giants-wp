<?php
/**
 * Fixture: mirrors the real is-style-elevated variations that reference a
 * `--wp--custom--shadow--*` variable no theme.json or snapshot declares.
 * Must be flagged undefined-variable (against the fixture's `defined_vars` set, which
 * deliberately does not include this slug).
 *
 * @package SGS\Blocks
 */

$fixture_css = 'box-shadow: var( --wp--custom--shadow--medium );';
