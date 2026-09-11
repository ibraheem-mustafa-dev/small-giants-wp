<?php
/**
 * FIXTURE — trap for the "var() with a writer" exemption: `--fx-trap-bg` is
 * READ inside a var() call but has NO writer anywhere in this file — a
 * var() with no writer is a hardcode wearing a costume. Must NOT be
 * exempted. Expected: >=1 CENSUSED finding.
 */
$css .= $fx_sel . '{background:var(--fx-trap-bg, transparent);}';
