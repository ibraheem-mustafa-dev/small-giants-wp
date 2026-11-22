// A run of numbered steps (data/skeleton-decisions.json `rules.numberedSteps`) is one process-steps block: the parent whose
// shown block children are all steps, each step typing its own number (1, 2, 3 or 01, 02, 03) beside its words, the numbers
// counting up from 1 in order. The block draws each step's number, title and description, so the steps' elements are
// absorbed and Fill writes the draft's items into the block's steps (lib/fill-list-content.mjs).
//   - the steps: `minSteps` or more shown children, all of them the parent's block children, the parent holding no words;
//   - one step: no control (a link, button or click handler) and no picture anywhere in it, and no box of its own (a step
//     that paints a background, a shadow or a border all round is a card: the block's steps paint none); at most `maxTexts` pieces of
//     text in all (the number, the title, an optional description); exactly one piece of text is the typed number, and it is the
//     step's position;
//   - the number sits in a box of its own beside the words (a flex or grid item, a block): a number typed inline in the title's
//     own line (a section number in a heading) numbers a section of a document, which is no step;
//   - the title is the first piece of text that is not the number (at most `maxTitleWords` words), the description the next;
//     a step explains: it holds a description, or its title is a sentence of at least `minTitleWords` words (a number beside a
//     one- or two-word label, a contents list of numbered sections, is the list block's numbered marker).
// A number the draft never types (a list a counter numbers, a CSS marker) is the list block's own marker, and a run whose
// numbers are not 1..n (years, "Now") is a timeline: neither is claimed. The layout is the block's `list` layout when the steps
// sit one above the next and its `row` layout when they sit side by side; the title's level is the draft heading's (h2 to h6),
// the block's fallback level for any other tag.
// Pure: the inventory model and the rule in, the runs out.
const shown = ( e ) => Object.values( e.visible || {} ).some( Boolean );
const CONTROLS = new Set( [ 'a', 'button', 'input', 'select', 'textarea', 'label', 'form' ] );
const PICTURES = new Set( [ 'img', 'picture', 'video', 'canvas' ] );
const control = ( e ) => CONTROLS.has( e.tag ) || /sc-camel-on-click="\{\{/.test( e.snippet || '' );
const count = ( s ) => String( s ?? '' ).split( /\s+/ ).filter( ( w ) => /[\p{L}\p{N}]/u.test( w ) ).length;

// { Map( parent key -> { attributes, steps: [ { number, title, description, titleKey } ], reason } ) }.
export function numberedSteps( { m, rule, headingLevels = [] } ) {
	const runs = new Map();
	if ( ! rule?.block ) {
		return runs;
	}
	const numberOf = new RegExp( rule.numberPattern );
	const card = new RegExp( rule.cardPaint, 'i' );
	const paints = ( step ) => card.test( /^<[^>]*>/.exec( step.snippet || '' )?.[ 0 ] ?? '' );
	// Each piece of text of a step, in order: the step's own words first, then the leaves under it; null when the step holds a
	// control or a picture.
	const textsOf = ( step ) => {
		const out = [];
		const own = m.words( step );
		own && out.push( step );
		let clean = ! control( step );
		const walk = ( x ) => m.blockKids( x ).filter( shown ).forEach( ( k ) => {
			if ( control( k ) || PICTURES.has( k.tag ) ) {
				clean = false;
			}
			m.words( k ) && out.push( k );
			walk( k );
		} );
		walk( step );
		return clean ? out : null;
	};
	for ( const p of m.els ) {
		const steps = m.blockKids( p ).filter( shown );
		if ( steps.length < rule.minSteps || steps.length !== m.blockKids( p ).length || m.words( p ) || control( p ) || PICTURES.has( p.tag ) ) {
			continue;
		}
		const read = steps.map( ( step, i ) => {
			const texts = paints( step ) ? null : textsOf( step );
			if ( ! texts || texts.length < 2 || texts.length > rule.maxTexts ) {
				return null;
			}
			const mine = ( x ) => m.words( x ).trim();
			const nums = texts.filter( ( x ) => numberOf.test( mine( x ) ) );
			const at = nums.length ? nums.find( ( x ) => parseInt( mine( x ).replace( /\D/g, '' ), 10 ) === i + 1 ) : null;
			if ( 1 !== nums.length || ! at || 'inline' === at.display ) {
				return null;
			}
			const rest = texts.filter( ( x ) => x !== at );
			if ( ! rest.length || count( mine( rest[ 0 ] ) ) > rule.maxTitleWords || ( 1 === rest.length && count( mine( rest[ 0 ] ) ) < rule.minTitleWords ) ) {
				return null;
			}
			return { number: mine( at ), title: mine( rest[ 0 ] ), description: rest[ 1 ] ? mine( rest[ 1 ] ) : '', titleEl: rest[ 0 ] };
		} );
		if ( read.some( ( r ) => ! r ) ) {
			continue;
		}
		const tag = /^h([2-6])$/.exec( read[ 0 ].titleEl.tag );
		const level = tag && headingLevels.includes( `h${ tag[ 1 ] }` ) ? `h${ tag[ 1 ] }` : rule.fallbackLevel;
		const sameLevel = read.every( ( r ) => r.titleEl.tag === read[ 0 ].titleEl.tag );
		runs.set( p.key, {
			attributes: {
				[ rule.settings.steps ]: read.map( ( r ) => ( { [ rule.fields.number ]: r.number, [ rule.fields.title ]: r.title, ...( r.description ? { [ rule.fields.description ]: r.description } : {} ) } ) ),
				[ rule.settings.level ]: sameLevel ? level : rule.fallbackLevel,
				[ rule.layout.setting ]: m.stacked( steps ) ? rule.layout.stacked : rule.layout.side,
			},
			reason: `${ steps.length } steps, each typing its number beside its words, the numbers counting up from 1`,
		} );
	}
	return runs;
}
