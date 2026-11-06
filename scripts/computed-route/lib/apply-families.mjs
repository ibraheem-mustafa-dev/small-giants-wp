// The applier's families, each { name, props, decide( ctx ) -> items }. An item is { status, prop, why } and, for status `op`,
// { writes, checks, record? }. Statuses: op, equal, no-setting, unpaired. The runner adds ledger and no-effect.
// decide's ctx: { target: { ref, tpl, via }, surface, block, saved (the block's attributes), draft and live ({ width: facts }),
// headers ({ width: the draft's sticky header height }), animate ({ width: the draft's Element.animate calls: { key, own, tpl,
// frames, options } }), records, recordsIndex (lib/apply-records.mjs), calFor( block ) (calibration, for lib/fill-prop.mjs), db, aux ({ tpl: { width: facts } } of the draft elements target.aux names), clientData }.
// An op with no checks is written and reported `unchecked`; the census re-run measures it.
import { clip } from './apply-family-clip.mjs';
import { pin } from './apply-family-pin.mjs';
import { motion } from './apply-family-motion.mjs';
import { form } from './apply-family-form.mjs';
import { state } from './apply-family-state.mjs';
import { tiles } from './apply-family-tiles.mjs';
import { statemotion } from './apply-family-statemotion.mjs';
import { width } from './apply-family-width.mjs';
import { chrome } from './apply-family-chrome.mjs';
import { link } from './apply-family-link.mjs';
import { drawer } from './apply-family-drawer.mjs';

export const FAMILIES = [ clip, pin, motion, state, statemotion, form, tiles, width, link, chrome, drawer ];

export const familyProps = ( families ) => [ ...new Set( families.flatMap( ( f ) => f.props ) ) ].sort();
