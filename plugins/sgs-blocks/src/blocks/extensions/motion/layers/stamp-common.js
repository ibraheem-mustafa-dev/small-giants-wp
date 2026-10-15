/**
 * What the stamping modules share (Spec 38A §5): the schema evaluator over the motion `$defs`, the close-value path
 * (a preset never stamps a trigger's close values, §5.2) and two value helpers.
 *
 * @package
 */

import { createEvaluator } from '../../../../components/motion/field-types/schema-eval';
import { DEFS } from './layer-lists';

export const evaluate = createEvaluator( DEFS );
// The trigger's own values: close values at Desktop and per tier. A preset never stamps them.
export const CLOSE_PATH = /^(?:close\.|devices\.(?:tablet|mobile)\.close\.)/;

export const isObject = ( value ) =>
	Boolean( value ) && typeof value === 'object' && ! Array.isArray( value );

export const copy = ( value ) =>
	value === undefined ? undefined : JSON.parse( JSON.stringify( value ) );
