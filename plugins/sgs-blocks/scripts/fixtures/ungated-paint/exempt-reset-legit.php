<?php
/**
 * FIXTURE — legit instance of the "reset, no competing operator value"
 * exemption. `background` and `border` are two DIFFERENT property roots, so
 * neither one's reset value competes with the other in this statement.
 * Expected: 0 CENSUSED findings.
 */
$css .= $fx_sel . '{background:none;border:0;}';
