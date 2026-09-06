<?php
/**
 * Fixture render.php — this file calls sgs_media_element_style() (the ONE
 * shared render-side emitter), so condition 2's per-file exemption must
 * silence it even though the literal string "object-fit:" also appears
 * below inside a comment.
 */

defined( 'ABSPATH' ) || exit;

// A stray mention of object-fit: cover in a comment must not itself trip
// this rule — it is the sgs_media_element_style() call below that matters.

$css = sgs_media_element_style( $attributes, '', 'sgs/render-calls-shared-helper-silent', $scope_class, array( 'object-fit' ) );

echo '<style>' . $css . '</style>';
