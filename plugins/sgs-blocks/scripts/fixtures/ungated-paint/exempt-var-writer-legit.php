<?php
/**
 * FIXTURE — legit instance of the "attribute-driven var() with a verified,
 * empty-guarded writer" exemption. `--fx-legit-bg` is genuinely written,
 * conditionally, elsewhere in this same file. Expected: 0 CENSUSED findings.
 */
if ( '' !== $fx_bg_value ) {
	$css .= '--fx-legit-bg:' . $fx_bg_value . ';';
}
$css .= $fx_sel . '{background:var(--fx-legit-bg, transparent);}';
