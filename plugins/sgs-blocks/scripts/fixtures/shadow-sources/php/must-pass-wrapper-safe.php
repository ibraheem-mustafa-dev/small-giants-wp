<?php
/**
 * Fixture: the safe wrapper sgs_shadow_box_decls() already appends the forced-colours
 * fallback internally. Must PASS: sink=wrapper-safe, forced_colours_reached=True.
 *
 * @package SGS\Blocks
 */

$fixture_decls = sgs_shadow_box_decls( $fixture_shape, $fixture_colour );
