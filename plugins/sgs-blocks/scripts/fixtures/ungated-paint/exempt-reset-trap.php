<?php
/**
 * FIXTURE — trap for the "reset" exemption: `border:0` LOOKS like a bare
 * reset, but `border-left` in the SAME statement carries a real, non-reset
 * value — a competing operator-shaped value for the same property root.
 * The exemption must NOT fire here. Expected: >=1 CENSUSED finding.
 */
$css .= $fx_sel . '{border:0;border-left:2px solid red;}';
