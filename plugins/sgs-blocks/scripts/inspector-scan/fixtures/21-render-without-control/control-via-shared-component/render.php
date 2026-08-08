<?php
$size = isset( $attributes['titleFontSizeMobile'] ) ? $attributes['titleFontSizeMobile'] : '';
echo '<style>@media(max-width:767px){.fixture{font-size:' . esc_attr( $size ) . 'px;}}</style>';
