/**
 * SGS Trust Badges: frontend runtime.
 *
 * The marquee is not run here: the block's marquee motion effect loads the shared runtime
 * (`src/shared/effects/fx-marquee.js`), which clones the `[data-sgs-marquee-set]` track this block prints.
 * This module only loads the "drop" overflow mode (overflow-drop.js), which runs itself on import.
 *
 * Loaded as a viewScriptModule (ES module, frontend only, never in the editor).
 */

import './overflow-drop.js';
