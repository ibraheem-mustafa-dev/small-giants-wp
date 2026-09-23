<?php
/**
 * Fixture: mirrors the real card-grid/post-grid/team-member pattern — a composed shadow
 * value written into a custom property, not directly into box-shadow. Must be traced,
 * not itself judged: sink=custom-property, sink_detail=--sgs-fixture-shadow,
 * forced_colours_reached=None (judged where the consuming CSS rule reads it).
 *
 * @package SGS\Blocks
 */

$fixture_card_shadow = sgs_shadow_value_composed( $fixture_shape, $fixture_colour );
$card_state_vars[]    = '--sgs-fixture-shadow:' . $fixture_card_shadow . ';';
