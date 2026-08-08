<?php
// A real, non-empty render surface that never touches the declared attribute,
// so the rule cannot pass this fixture merely by finding no render files.
// (The attribute's NAME is deliberately not written in this comment — PHP
// comment stripping is not guaranteed here, and rule 18 shipped exactly this
// bug: its own negative-control fixture false-positived on a comment.)
echo '<div class="fixture">static markup only</div>';
