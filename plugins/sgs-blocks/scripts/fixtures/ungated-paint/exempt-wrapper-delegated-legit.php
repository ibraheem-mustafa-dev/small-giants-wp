<?php
/**
 * FIXTURE — legit instance of the "wrapper-delegated" exemption: the paint
 * is handed to the shared `SGS_Container_Wrapper`, so no local attribute is
 * expected on this block's own selector. Expected: 0 CENSUSED findings.
 */
$css .= SGS_Container_Wrapper::render( $fx_sel, 'background:var(--fx-wrapper-owned, transparent)' );
