<?php
// Fixture: inlineSvg is an on/off switch; the markup it prints comes from a sanitised file, never from the attribute.
$inline = ! empty( $attributes['inlineSvg'] );
echo $inline ? '<span class="fixture__inline"></span>' : '<img class="fixture__img" alt="" />';
