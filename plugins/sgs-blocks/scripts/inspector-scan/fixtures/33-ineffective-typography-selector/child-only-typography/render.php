<?php
/**
 * Fixture render.php — mirrors real sgs/hero: only ever uses the typography
 * class to build a scoped CSS SELECTOR string (never emits it as a literal
 * class="..." DOM attribute), which is exactly the shape that must still
 * flag as case (b) child-owned, not case (d) self-rendered.
 */

$root_sel = '.wp-block-sgs-child-only-typography';
// selectors.typography targets .sgs-child-only-typography__headline, which
// lives on the InnerBlocks child, not this element — scope the rule there.
$responsive_css = $root_sel . ' .sgs-child-only-typography__headline{text-align:left}';

echo '<div class="wp-block-sgs-child-only-typography">' . do_blocks( $content ) . '</div>';
