<?php
/**
 * Paints contentWidth, so it is a live candidate that only dispatcher-table
 * resolution can clear. A resolver that stops at the façade's own export body
 * reports a false defect here.
 */

$width = isset( $attributes['contentWidth'] ) ? $attributes['contentWidth'] : '';

printf( '<div class="sgs-fixture" style="max-width:%s"></div>', esc_attr( $width ) );
