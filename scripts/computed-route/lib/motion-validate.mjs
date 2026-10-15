// The cloning writer's gate for an sgsMotion document (Spec 38A FR-38A-5, FR-38A-2; the M7 writer calls
// `validateMotionWrite` before it writes anything). It runs the shared schema validator (lib/motion-schema.mjs), then the
// custom-target rules, which mirror `Sgs_Motion_Custom_Target` in
// `plugins/sgs-blocks/includes/motion/class-sgs-motion-custom-target.php`:
//   - a `custom:<n>` target carries a review row { draftNode, reason }, both non-empty text;
//   - its selector is one selector that stays inside the block root: an allow-list of selector characters (fails closed),
//     no `< { } ; \ @ , /`, no leading html / body / :root, no leading + or ~ sibling combinator. A leading `>` is fine.
import { checkMotion } from './motion-schema.mjs';

export const SELECTOR_MAX_LENGTH = 200;
export const SELECTOR_ALLOWED = /^[A-Za-z0-9_\-.#:[\]="' >+~()*]+$/;
export const SELECTOR_DENIED = /[<{};\\@,/]/;

// The reason a selector is not scoped, or null when it is.
export function selectorProblem( selector ) {
	if ( typeof selector !== 'string' || selector.trim() === '' ) {
		return 'is empty';
	}
	const s = selector.trim();
	if ( s.length > SELECTOR_MAX_LENGTH ) {
		return `is longer than ${ SELECTOR_MAX_LENGTH } characters`;
	}
	if ( ! SELECTOR_ALLOWED.test( s ) || SELECTOR_DENIED.test( s ) ) {
		return 'holds a character a scoped selector cannot (only classes, ids, tags, attributes, pseudo-classes and combinators; no list, block, at-rule, comment, tag or backslash)';
	}
	if ( /^(?:html|body|:root)(?![A-Za-z0-9_-])/i.test( s ) ) {
		return 'starts at html, body or :root, so it is not inside the block root';
	}
	if ( /^[+~]/.test( s ) ) {
		return 'starts with a sibling combinator, so it reaches outside the block root';
	}
	return null;
}

function hasText( v ) {
	return typeof v === 'string' && v.trim() !== '';
}

// One line per custom-target problem across a document's elements.
export function customTargetErrors( doc ) {
	const errors = [];
	const elements = doc && typeof doc === 'object' && doc.elements && typeof doc.elements === 'object' ? doc.elements : {};
	for ( const [ target, element ] of Object.entries( elements ) ) {
		if ( ! target.startsWith( 'custom:' ) ) {
			continue;
		}
		const review = element && typeof element === 'object' ? element.review : null;
		if ( ! review || ! hasText( review.draftNode ) || ! hasText( review.reason ) ) {
			errors.push( `elements/${ target }: a custom target needs a review row with a non-empty draftNode and reason` );
		}
		const problem = selectorProblem( element && typeof element === 'object' ? element.selector : null );
		if ( problem ) {
			errors.push( `elements/${ target }/selector: ${ problem }` );
		}
	}
	return errors;
}

// The writer's verdict: { valid, errors, refusals }. `errors` holds schema errors then custom-target errors; nothing
// may be written unless `valid` is true.
export function validateMotionWrite( doc, schema ) {
	const result = schema ? checkMotion( doc, schema ) : checkMotion( doc );
	const custom = customTargetErrors( doc );
	return { valid: result.valid && custom.length === 0, errors: [ ...result.errors, ...custom ], refusals: result.refusals };
}

// Throws one Error listing every problem; returns the document when it is writable.
export function assertMotionWritable( doc, schema ) {
	const r = validateMotionWrite( doc, schema );
	if ( ! r.valid ) {
		throw new Error( `sgsMotion write refused:\n${ [ ...r.errors, ...r.refusals ].map( ( e ) => `  ${ e }` ).join( '\n' ) }` );
	}
	return doc;
}
