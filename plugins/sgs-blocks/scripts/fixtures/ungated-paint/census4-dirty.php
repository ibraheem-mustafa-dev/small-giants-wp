<?php
/**
 * FIXTURE — reproduces FR-41-15 census #4's defect signature: an
 * UNCONDITIONAL hover `background` SHORTHAND, emitted through a hover-guard
 * helper, ungated on any operator attribute. Synthetic selector — this
 * fixture is a generic instance of the shape, not a copy of any real block.
 */
$css  = '';
$css .= sgs_hover_guarded_rule( $uid_sel . ' .fx-item:hover', 'background:color-mix(in srgb, currentColor 12%, transparent)' );
