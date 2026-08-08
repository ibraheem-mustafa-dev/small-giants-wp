<?php
/**
 * Calls the shared include's helper, which is what admits that include into
 * this block's render corpus.
 */

echo '<style>' . sgs_fixture_typography_css( $attributes, 'title' ) . '</style>';
echo '<h2>' . esc_html( $attributes['titleText'] ) . '</h2>';
