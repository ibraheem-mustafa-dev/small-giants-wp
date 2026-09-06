<?php
// Fixture: a plain block with no SVG features at all — negative control.
$heading = isset( $attributes['heading'] ) ? (string) $attributes['heading'] : '';

printf( '<div>%s</div>', esc_html( $heading ) );
