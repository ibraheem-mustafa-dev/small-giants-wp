<?php
// Fixture: check-shadow-sources.py --self-test (design H6, task lift-2).
// A shadow emitter whose file also calls sgs_shadow_hover_rules() — wired.
$css = sgs_shadow_hover_rules( $sel, $shape, $colour, $attributes, $name );
