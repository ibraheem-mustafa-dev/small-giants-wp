<?php
/**
 * FIXTURE — reproduces FR-41-15 census #8's defect signature: the same
 * unconditional hover `background` shorthand, but its `var()` fallback
 * reads a CUSTOM property (`--fx-featured-bg-hover`) that has NO writer
 * anywhere in this file. This is the worked counter-example the (d)
 * exemption table names: a var() with no writer is a hardcode wearing a
 * costume, and a syntax-only "it's a var(), exempt it" rule would clear
 * this wrongly. Must stay CENSUSED.
 */
$css  = '';
$css .= sgs_hover_guarded_rule( $uid_sel . ' .fx-featured:hover', 'background:var(--fx-featured-bg-hover, var(--wp--preset--color--primary-dark, transparent))' );
