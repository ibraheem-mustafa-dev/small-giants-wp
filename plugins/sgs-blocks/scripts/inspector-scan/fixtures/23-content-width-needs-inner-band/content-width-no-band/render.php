<?php
// Block-private composite: no wrapper call at all. Emits BOTH widths onto the
// same root selector — the exact shape D540 deleted from five blocks.
$uid  = 'sgs-' . wp_unique_id();
$css  = '.' . $uid . '{max-width:' . $attributes['maxWidth'] . '}';
$css .= '.' . $uid . '{width:' . $attributes['contentWidth'] . '}';
echo '<style>' . $css . '</style><div class="' . $uid . '">' . $content . '</div>';
