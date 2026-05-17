import { useBlockProps } from '@wordpress/block-editor';

/**
 * Editor for sgs/header.
 * Scaffolded by spec-15-p5b.8 (role=text-content) -- needs human polish.
 */
export default function Edit({ attributes, setAttributes }) {
    const blockProps = useBlockProps({ className: 'sgs-header' });
    return (
        <div { ...blockProps }>
            {/* TODO(human): polish for role=text-content */}
            <span>{ attributes.text || 'sgs/header (scaffold)' }</span>
        </div>
    );
}
