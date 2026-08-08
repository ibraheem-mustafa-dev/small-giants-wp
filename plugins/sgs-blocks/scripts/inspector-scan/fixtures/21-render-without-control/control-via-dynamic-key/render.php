<?php
$size = isset( $attributes['titleFontSizeTablet'] ) ? $attributes['titleFontSizeTablet'] : '';
echo '<style>@media(max-width:1023px){.fixture{font-size:' . esc_attr( $size ) . 'px;}}</style>';
