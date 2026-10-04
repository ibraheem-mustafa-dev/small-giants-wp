<?php
$classes   = array( 'sgs-paint' );
$classes[] = 'sgs-paint--' . sanitize_key( $attributes['layoutMode'] ?? 'grid' );
$auto      = ! empty( $attributes['autoplay'] );
echo '<div class="' . esc_attr( implode( ' ', $classes ) ) . '" data-autoplay="' . ( $auto ? '1' : '0' ) . '" data-sgs-fx-trigger="' . esc_attr( $attributes['fxTrigger'] ?? '' ) . '">' . esc_html( $attributes['titleText'] ?? '' ) . '</div>';
