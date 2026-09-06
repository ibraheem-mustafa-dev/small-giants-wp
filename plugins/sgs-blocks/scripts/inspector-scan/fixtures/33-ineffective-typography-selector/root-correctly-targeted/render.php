<?php
/**
 * Fixture render.php — the declared typography class is emitted as a real
 * DOM class="..." attribute directly on the block's own root element (the
 * fixed cta-section/info-box/notice-banner shape). Case (d): fine.
 */

echo '<div class="sgs-root-correctly-targeted">' . esc_html( 'content' ) . '</div>';
