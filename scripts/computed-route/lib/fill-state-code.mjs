// The code read of a state look (Spec 48 FR-48-81, R-47-4): a state the browser cannot be put into for a test (:visited,
// which scripts and DevTools never see, a state on a descendant inside :has(), a sibling host) is still declared in the
// draft's stylesheet. lib/fill-state-read.mjs::stateCombos hands over, for such a combination, the declarations of every
// stylesheet rule that produced its selector part; this reads the look from them. The render cannot confirm it, so the
// look carries `read: 'code'`.

// A selector's specificity as [ids, classes + attributes + pseudo-classes, types + pseudo-elements]. A functional
// pseudo-class (:is, :not, :has) counts its argument (stateCombos already splits :is() lists into one part per
// alternative), :where() counts nothing, any other pseudo-class counts as one class.
export function specificity( selector ) {
	let s = String( selector ).replace( /"[^"]*"|'[^']*'/g, '""' );
	s = s.replace( /:where\((?:[^()]|\([^()]*\))*\)/g, '' );
	for ( let k = 0; k < 4; k++ ) {
		s = s.replace( /:(?:is|not|has)\(((?:[^()]|\([^()]*\))*)\)/g, ' $1 ' );
	}
	const count = ( re ) => ( s.match( re ) || [] ).length;
	const ids = count( /#[\w-]+/g );
	const attrs = count( /\[[^\]]*\]/g );
	s = s.replace( /\[[^\]]*\]/g, '' );
	const elements = count( /::[\w-]+/g );
	s = s.replace( /::[\w-]+/g, '' );
	const pseudos = count( /:[\w-]+(?:\((?:[^()]|\([^()]*\))*\))?/g );
	s = s.replace( /:[\w-]+(?:\((?:[^()]|\([^()]*\))*\))?/g, '' );
	const classes = count( /\.[\w-]+/g );
	s = s.replace( /\.[\w-]+|#[\w-]+/g, '' );
	const types = count( /(?:^|[\s>+~,])[a-z][\w-]*/gi );
	return [ ids, classes + attrs + pseudos, types + elements ];
}

const compareSpec = ( a, b ) => a[ 0 ] - b[ 0 ] || a[ 1 ] - b[ 1 ] || a[ 2 ] - b[ 2 ];

const beats = ( a, b ) => ( a.important !== b.important ? a.important : ( compareSpec( a.spec, b.spec ) || a.order - b.order ) > 0 );

// The cascade among the rules of one state: { prop: value } where an !important declaration beats a plain one, then
// the higher specificity, then the later rule. items: [{ selector, rules: [{ order, d: [[prop, value, priority]] }] }].
// Returns null when no rule declares anything.
export function cascadeCode( items ) {
	const best = new Map();
	let any = false;
	for ( const item of items ) {
		const spec = specificity( item.selector );
		for ( const rule of item.rules || [] ) {
			for ( const [ prop, value, priority ] of rule.d ) {
				any = true;
				const cand = { value, important: 'important' === priority, spec, order: rule.order };
				const cur = best.get( prop );
				if ( ! cur || beats( cand, cur ) ) {
					best.set( prop, cand );
				}
			}
		}
	}
	return any ? Object.fromEntries( [ ...best ].map( ( [ p, c ] ) => [ p, c.value ] ) ) : null;
}

// The code looks of one target: blocked is [{ combo: { selector, code }, tokens }] for the combinations the page cannot
// enter. Combinations naming the same states are one cascade (`a:visited` and `.nav a:visited` compete for the same
// element). Returns { looks, unreached }: a look is { states, family, selector (the most specific rule's), tokens,
// declared (what differs from rest), rendered: null, read: 'code' }; a group whose rules declare nothing is unreached
// with the reason the page cannot enter it, a group that declares only what rest declares is no look.
export function codeLooks( { id, blocked, rest, reasonOf } ) {
	const groups = new Map();
	for ( const b of blocked ) {
		const key = [ ...new Set( b.tokens.map( ( t ) => t.row.state ) ) ].sort().join( '+' );
		groups.set( key, [ ...( groups.get( key ) || [] ), b ] );
	}
	const out = { looks: [], unreached: [] };
	for ( const group of groups.values() ) {
		const declaredAll = cascadeCode( group.map( ( b ) => ( { selector: b.combo.selector, rules: b.combo.code } ) ) );
		if ( ! declaredAll ) {
			out.unreached.push( { id, selector: group[ 0 ].combo.selector, why: `${ reasonOf( group[ 0 ].tokens ) }, and no stylesheet rule declares anything for it to read` } );
			continue;
		}
		const declared = Object.fromEntries( Object.entries( declaredAll ).filter( ( [ p, v ] ) => ( rest || {} )[ p ] !== v ) );
		if ( ! Object.keys( declared ).length ) {
			continue;
		}
		const top = [ ...group ].sort( ( a, b ) => compareSpec( specificity( a.combo.selector ), specificity( b.combo.selector ) ) ).pop();
		out.looks.push( {
			states: [ ...new Set( group.flatMap( ( b ) => b.tokens.map( ( t ) => t.row.state ) ) ) ],
			family: top.tokens[ 0 ].row.family,
			selector: top.combo.selector,
			tokens: [ ...new Set( group.flatMap( ( b ) => b.tokens.map( ( t ) => t.text ) ) ) ],
			declared,
			rendered: null,
			read: 'code',
		} );
	}
	return out;
}
