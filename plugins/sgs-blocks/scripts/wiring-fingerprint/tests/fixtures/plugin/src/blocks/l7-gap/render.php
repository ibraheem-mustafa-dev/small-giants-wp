<?php
$c = $attributes['textColour'] ?? '';
echo '<div class="sgs-l7" style="--sgs-l7-colour:' . esc_attr( $c ) . '"></div>';
