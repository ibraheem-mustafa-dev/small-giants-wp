<?php
// Trap A from rule 21: the attribute key is assembled from a variable prefix + a
// literal PascalCase suffix, never written out verbatim.
$v = sgs_typography_attr( $prefix, 'LineHeightTablet' );
