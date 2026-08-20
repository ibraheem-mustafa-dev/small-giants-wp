<?php
// The declared attribute never appears literally anywhere in this corpus. The shared
// wrapper it calls contains a computed-key read, so the rule must NOT silently treat
// it as consumed (false green) or as dead (false positive) — it must emit the
// distinct, honestly-labelled "cannot be statically resolved" finding.
// (Deliberately NOT naming the attribute here — see declared-not-rendered/render.php
// for why a literal mention in a comment would defeat this fixture's purpose.)
echo SGS_Container_Wrapper::render( $attributes, $block, $content, 'section', array() );
