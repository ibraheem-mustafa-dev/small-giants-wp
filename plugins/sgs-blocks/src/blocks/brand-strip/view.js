/**
 * SGS Brand Strip: frontend runtime.
 *
 * The marquee is not run here: the block's marquee motion effect loads the shared runtime
 * (`src/shared/effects/fx-marquee.js`), which clones the `[data-sgs-marquee-set]` this block prints.
 * This module only draws the separator lines on a static strip.
 *
 * Loaded as a viewScriptModule (ES module, frontend only).
 */

import { initSeparators } from '../../shared/separators';

// Lines between brands on a static strip, in a browser without CSS gap decorations.
initSeparators();
