<?php
// The old style referenced `var(--wp--custom--shadow--medium)`, which no theme defines.
register_block_style( 'sgs/example', array( 'name' => 'elevated', 'inline_style' => '.is-style-elevated{box-shadow:var(--wp--preset--shadow--lifted)}' ) );
