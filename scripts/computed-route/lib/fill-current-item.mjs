// The current item of a repeated list (Spec 48 FR-48-81, T3): a draft marks the item whose route is current (a nav item with a
// colour and an underline) by a logic condition inside a loop body (`item.current` on an sc-if). No CSS pseudo-class names it, so
// the state reader never meets it. The fact record (lib/fact-record.mjs) holds the condition: an sc-if inside an sc-for whose
// answers across the loop are both true and false. The item is that sc-if's parent element; the copy where the condition holds is
// the copy that renders the sc-if's first child. The current look is the item's declared values in that copy against a copy where
// the condition is false, in lib/fill-state-read.mjs::readStates' shape with `states: ['current']`, so lib/fill-state.mjs::fillStates
// writes it into the setting that holds the `current` state (block_attributes.css_state). The child the condition reveals (the
// underline) is listed as a gap: no setting paints an indicator inside the item.

import { declaredValues } from '../../parity/lib/devtools.mjs';
import { renderedOf } from './fill-state-apply.mjs';
import { declaredDiff } from './fill-state-read.mjs';
import { templateKeyOf, parseTemplateKey } from './fact-key.mjs';

// The loop variable's property names a draft uses for "this item is the current route".
export const CURRENT_PATH = /(?:^|\.)(?:current|isCurrent|active|isActive|selected|isSelected)$/;

const splitKey = ( key ) => {
	const p = parseTemplateKey( key );
	return { component: p?.dc ?? null, n: p?.tpl ?? null };
};

const isBool = ( x, v ) => 'boolean' === x.t && v === x.v;
const hasBoth = ( holes ) => Object.values( holes || {} ).flatMap( ( byWidth ) => Object.values( byWidth || {} ) ).some( ( a ) => ( a?.v || [] ).some( ( x ) => isBool( x, true ) ) && ( a?.v || [] ).some( ( x ) => isBool( x, false ) ) );

// The current-item groups of a fact record: [{ ifKey, itemKey, markKey, component, itemN, markN, path }]. Only an sc-if inside
// an sc-for, whose single hole is a current-like path, answered both true and false across the loop, with an element child.
export function currentItemGroups( facts, rootComponent = null ) {
	const groups = [];
	const els = facts?.elements || {};
	for ( const [ key, e ] of Object.entries( els ) ) {
		const t = e.template;
		const hole = ( t?.holes || [] ).find( ( h ) => 'attr:value' === h.where && h.whole );
		if ( 'sc-if' !== t?.tag || ! hole || ! CURRENT_PATH.test( hole.path ) || ! t.membership?.scFor?.length || ! hasBoth( e.logic?.holes ) ) {
			continue;
		}
		const itemKey = t.realParent || t.parent;
		const markKey = Object.keys( els ).find( ( k ) => els[ k ].template.parent === key && 'sc-if' !== els[ k ].template.tag );
		const item = splitKey( itemKey );
		groups.push( { ifKey: key, itemKey, markKey: markKey || null, component: item.component, itemN: item.n, markN: markKey ? splitKey( markKey ).n : null, path: hole.path, rootComponent } );
	}
	return groups;
}

// The group a read job (a target with a `{ tpl: '<chain>/<n>#<copy>' }` finder) is the item of, or undefined.
export function groupOfJob( groups, job ) {
	return groups.find( ( g ) => g.itemKey === templateKeyOf( job?.finder?.tpl, g.rootComponent ) );
}

// The two selectors of a group: the copy where the condition holds and a copy where it does not.
export function currentSelectors( g ) {
	// The served draft names its root host `Root`; any other host keeps its component name.
	const host = g.component === g.rootComponent ? 'Root' : g.component;
	const base = `.sc-host[data-sc-name="${ host }"] [data-dc-tpl="${ g.itemN }"]`;
	return { current: `${ base }:has([data-dc-tpl="${ g.markN }"])`, other: `${ base }:not(:has([data-dc-tpl="${ g.markN }"]))` };
}

// Reads the current-item looks at the page's current width: { looks: { [jobId]: [look] }, gaps: [{ ids, reason }] }. groups:
// currentItemGroups(facts); jobs: lib/fill-read.mjs::jobsFor. The comparison copy is read here, so the look is the current copy
// against a non-current copy of the same item, never against a target that may itself be the current copy.
export async function readCurrentItems( { page, cdp, jobs, groups, resolveSrc } ) {
	const out = { looks: {}, gaps: [] };
	for ( const job of jobs ) {
		const g = groupOfJob( groups, job );
		if ( ! g ) {
			continue;
		}
		if ( ! g.markN ) {
			out.gaps.push( { ids: [ job.id ], reason: `current-item: the condition ${ g.path } reveals no element, so the current copy cannot be told apart` } );
			continue;
		}
		const sel = currentSelectors( g );
		const cur = await declaredValues( cdp, sel.current, resolveSrc, null ).catch( () => null );
		const oth = await declaredValues( cdp, sel.other, resolveSrc, null ).catch( () => null );
		if ( ! cur || ! oth ) {
			out.gaps.push( { ids: [ job.id ], reason: `current-item: the draft renders no ${ cur ? 'non-current' : 'current' } copy of the item at this width, so its current look is not read` } );
			continue;
		}
		const changed = declaredDiff( oth, cur );
		if ( Object.keys( changed ).length ) {
			const rendered = await page.evaluate( renderedOf, [ sel.current, resolveSrc, Object.keys( changed ) ] );
			( out.looks[ job.id ] ??= [] ).push( { states: [ 'current' ], family: 'logic', selector: `${ g.path } (sc-if ${ g.ifKey })`, tokens: [], declared: changed, rendered, read: 'entered', logic: { id: g.ifKey, ids: [ g.ifKey ], keys: { [ g.path ]: true } } } );
		}
		out.gaps.push( { ids: [ job.id ], reason: `current-indicator: the draft reveals an element inside the current item (${ g.markKey }, the underline); no setting of the item paints an indicator, so it is not written` } );
	}
	return out;
}
