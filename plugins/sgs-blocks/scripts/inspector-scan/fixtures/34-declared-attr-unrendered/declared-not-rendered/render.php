<?php
// The declared attribute is genuinely dead: nothing here reads it, no shared wrapper
// is called, and there is no computed-key read to excuse it. This is the negative-
// control fixture proving the rule can genuinely flag something.
// (Deliberately NOT naming the attribute here — this rule matches literal names by
// word boundary against the WHOLE stripped file, comments included, so writing the
// attribute name in a comment would make it look "consumed" by accident.)
$unused = 1;
