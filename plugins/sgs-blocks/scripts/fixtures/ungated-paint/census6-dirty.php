<?php
/**
 * FIXTURE — reproduces FR-41-15 census #6's defect signature: the same
 * unconditional hover `background` shorthand as census #4, but with a
 * `var(--wp--preset--*, …)` fallback rather than a literal colour. The WP
 * preset token has no local writer by construction (it is a global
 * theme.json value), so it must NOT be treated as an attribute-driven
 * exemption — this fixture proves the detector still censuses it.
 */
$css  = '';
$css .= sgs_hover_guarded_rule( $uid_sel . ' .fx-sublink:hover', 'background:var(--wp--preset--color--surface, rgba(0,0,0,.04))' );
