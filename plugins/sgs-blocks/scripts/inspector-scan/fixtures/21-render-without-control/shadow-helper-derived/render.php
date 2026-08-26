<?php
$shadow       = isset( $attributes['panelShadow'] ) ? $attributes['panelShadow'] : '';
$colour       = isset( $attributes['panelShadowColour'] ) ? $attributes['panelShadowColour'] : '';
$hover        = isset( $attributes['panelShadowHover'] ) ? $attributes['panelShadowHover'] : '';
$hover_colour = isset( $attributes['panelShadowColourHover'] ) ? $attributes['panelShadowColourHover'] : '';

printf(
	'<style>.fixture{box-shadow:%s %s}.fixture:hover{box-shadow:%s %s}</style>',
	esc_attr( $shadow ),
	esc_attr( $colour ),
	esc_attr( $hover ),
	esc_attr( $hover_colour )
);
