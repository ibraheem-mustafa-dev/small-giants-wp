// Bug-hunter run 5, lib/references.mjs::referenceOf: a null reference value is no reference.
import test from 'node:test';
import assert from 'node:assert/strict';
import { referenceOf } from '../lib/references.mjs';

const refs = { 'sgs/modal': { kind: 'frame', key: 'contentRef' } };

test( 'MUST FAIL (null ref): a null contentRef is no reference', () => {
	assert.equal( referenceOf( { name: 'sgs/modal', attributes: { contentRef: null } }, refs ), null );
} );

test( 'a set contentRef is still a reference', () => {
	assert.equal( referenceOf( { name: 'sgs/modal', attributes: { contentRef: 12 } }, refs ).value, 12 );
} );
