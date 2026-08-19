<?php
/**
 * Fixture render.php — the declared typography class (.sgs-nowhere-selector__stale)
 * is never referenced at all, not even in a CSS-selector-building string.
 * Genuinely dead, not just specificity-losing.
 */

echo '<div class="wp-block-sgs-nowhere-selector sgs-nowhere-selector__root">' . esc_html( 'content' ) . '</div>';
