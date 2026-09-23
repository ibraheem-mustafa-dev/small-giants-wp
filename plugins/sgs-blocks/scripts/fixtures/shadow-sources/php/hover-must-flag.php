<?php
// Fixture: check-shadow-sources.py --self-test (design H6, task lift-2).
// A shadow emitter with NO hover marker anywhere in the file — the real gap the hover
// coverage census exists to catch.
$css = '.item{box-shadow:' . sgs_shadow_box_decls( $shape, $colour )[0] . '}';
