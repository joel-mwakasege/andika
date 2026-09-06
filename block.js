( function( wp ) {
    var registerBlockType = wp.blocks.registerBlockType;
    var el = wp.element.createElement;
    var useBlockProps = wp.blockEditor.useBlockProps;

    registerBlockType( 'script-writer/editor', {
        title: 'Andika',
        icon: 'editor-code',
        category: 'text',
        description: 'Distraction-free black background code editor block for writing. "Andika" means "write" in Swahili.',
        attributes: {
            content: {
                type: 'string',
                default: ''
            }
        },
        supports: {
            align: [ 'full', 'wide' ],
            html: false
        },
        edit: function( props ) {
            var blockProps = useBlockProps( {
                className: 'script-writer-block-editor-wrap'
            } );

            function handleKeyDown( e ) {
                if ( e.key === 'Tab' ) {
                    e.preventDefault();
                    var target = e.target;
                    var start = target.selectionStart;
                    var end = target.selectionEnd;
                    var val = target.value;
                    var indent = '    '; // 4 spaces
                    var newVal = val.substring( 0, start ) + indent + val.substring( end );
                    target.value = newVal;
                    target.selectionStart = target.selectionEnd = start + indent.length;
                    props.setAttributes( { content: newVal } );
                }
            }

            function handleChange( e ) {
                props.setAttributes( { content: e.target.value } );
            }

            return el(
                'div',
                blockProps,
                el( 'textarea', {
                    className: 'script-writer-editor-canvas',
                    value: props.attributes.content || '',
                    onChange: handleChange,
                    onKeyDown: handleKeyDown,
                    placeholder: '',
                    spellCheck: false,
                    autoCapitalize: 'off',
                    autoComplete: 'off',
                    autoCorrect: 'off',
                    'aria-label': 'Andika writing canvas'
                } )
            );
        },
        save: function( props ) {
            var blockProps = wp.blockEditor.useBlockProps.save( {
                className: 'script-writer-block-frontend-wrap'
            } );

            return el(
                'div',
                blockProps,
                el( 'pre', { className: 'script-writer-output' }, props.attributes.content || '' )
            );
        }
    } );
} )( window.wp );
