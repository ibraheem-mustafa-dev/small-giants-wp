<?php
/**
 * FIXTURE — trap for the "wrapper-delegated" exemption: the SAME
 * declaration shape, emitted by the block's own literal string concatenation
 * with NO reference to `SGS_Container_Wrapper` anywhere. Must NOT be
 * exempted. Expected: >=1 CENSUSED finding.
 */
$css .= $fx_sel . '{background:var(--fx-not-wrapper-owned, transparent);}';
