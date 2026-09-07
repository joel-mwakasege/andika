( function() {
    'use strict';

    if ( typeof window.Andika === 'undefined' ) {
        return;
    }

    // =========================================================================
    // 1. SCREENPLAY PARSER & PRODUCTION DATA ENGINE
    // =========================================================================
    var ScreenplayEngine = {
        transitions: [
            'CUT TO:', 'FADE IN:', 'FADE OUT:', 'FADE TO BLACK:', 'DISSOLVE TO:',
            'SMASH CUT:', 'MATCH CUT:', 'BACK TO:', 'INTERCUT WITH:'
        ],

        elementKeywords: {
            Vehicles: [
                'sedan', 'car', 'truck', 'patrol car', 'cruiser', 'forklift', 'van', 'motorcycle',
                'boat', 'ship', 'steamboat', 'airplane', 'helicopter', 'freighter', 'wagon',
                'carriage', 'buggy', 'cart', 'horse', 'horses', 'train', 'locomotive', 'skiff', 'stagecoach'
            ],
            Props: [
                'revolver', 'pistol', 'rifle', 'shotgun', 'gun', 'briefcase', 'flash drive',
                'pocket watch', 'watch', 'flash grenade', 'knife', 'badge', 'handcuffs',
                'chains', 'shackles', 'whip', 'violin', 'strings', 'fiddle', 'ledger',
                'key', 'keys', 'phone', 'laptop', 'laser sight', 'coins', 'coin', 'money',
                'torch', 'lantern', 'bottle', 'glass', 'glassware', 'bag', 'sack', 'pole',
                'letter', 'envelope', 'axe', 'shovel', 'bell', 'rope', 'box', 'crate', 'package',
                'cigar', 'pipe', 'matches', 'quill', 'ink', 'candle'
            ],
            AudioFX: [
                'siren', 'sirens', 'wail', 'wailing', 'click', 'splash', 'gunfire', 'gunshot',
                'screech', 'concussion', 'thunder', 'explosion', 'alarm', 'patters', 'applause',
                'cheering', 'reel', 'singing', 'shriek', 'knock', 'knocking', 'rattle', 'whistle',
                'footsteps', 'barks', 'echo', 'thud', 'hum'
            ],
            Wardrobe: [
                'cravat', 'trench coat', 'coat', 'jacket', 'hat', 'bonnet', 'dress', 'gown',
                'boots', 'shoes', 'suit', 'gloves', 'uniform', 'tunic', 'mask', 'vest', 'shawl',
                'shawls', 'cloak', 'apron', 'slippers'
            ]
        },

        // Industry standard slugline regex: matches both clean spec format (INT. STUDY - DAY)
        // and Hollywood shooting script format with margin numbers (5 INT. STORE - LATER 5)
        slugRegex: /^\s*(?:(\d+[A-Z]?)\s+)?(INT\.\/EXT\.|EXT\.\/INT\.|INT\.|EXT\.|I\/E\.|EST\.)\s*(.+?)(?:\s*-\s*(DAY|NIGHT|DAWN|DUSK|MORNING|EVENING|AFTERNOON|CONTINUOUS|LATER|MOMENTS LATER|SAME TIME))?(?:\s+(\d+[A-Z]?))?\s*$/i,
        charRegex: /^\s*([A-Z0-9\s\.\'\-]{2,35})(?:\s*\((?:V\.O\.|O\.S\.|CONT\'D|O\.C\.)\))?\s*$/,
        parenRegex: /^\s*\([^\)]*\)?\s*$/,

        // Hollywood 1/8th of a page metric: ~54 lines per page = ~6.75 lines per eighth
        formatEighths: function( lineCount ) {
            var lines = Math.max( 1, lineCount || 1 );
            var eighths = Math.max( 1, Math.round( lines / 6.75 ) );
            if ( eighths < 8 ) {
                return eighths + '/8 pgs';
            }
            var whole = Math.floor( eighths / 8 );
            var rem = eighths % 8;
            if ( rem === 0 ) {
                return whole === 1 ? '1 pg' : whole + ' pgs';
            }
            return whole + ' ' + rem + '/8 pgs';
        },

        // Estimated Screen Runtime: standard industry rule 1 page approx 54 lines = approx 1 minute
        calculateRunTime: function( lineCount ) {
            var lines = Math.max( 1, lineCount || 1 );
            var pages = Math.max( 1, Math.round( ( lines / 54 ) * 10 ) / 10 );
            var minutes = Math.round( pages );
            var timeStr = '';
            if ( minutes < 60 ) {
                timeStr = '~' + minutes + 'm';
            } else {
                var hrs = Math.floor( minutes / 60 );
                var mins = minutes % 60;
                timeStr = '~' + hrs + 'h ' + ( mins > 0 ? mins + 'm' : '' );
            }
            return {
                pages: pages,
                timeStr: timeStr
            };
        },

        parse: function( text ) {
            var lines = ( text || '' ).split( '\n' );
            var scenes = [];
            var characters = {};
            var elements = { Vehicles: {}, Props: {}, AudioFX: {}, Wardrobe: {} };
            var locationMap = {};
            var subLocationMap = {};
            var currentScene = null;
            var currentSceneLines = 0;
            var nonBlankLines = 0;
            var self = this;
            var lastSpeakingCharacter = '';

            for ( var i = 0; i < lines.length; i++ ) {
                var line = lines[ i ];
                var trimmed = line.trim();
                if ( trimmed.length > 0 ) {
                    nonBlankLines++;
                }

                var slugMatch = trimmed.match( this.slugRegex );
                if ( slugMatch ) {
                    if ( currentScene ) {
                        currentScene.endLine = i - 1;
                        currentScene.lineCount = currentSceneLines;
                        currentScene.eighths = self.formatEighths( currentSceneLines );
                        scenes.push( currentScene );
                    }

                    var rawSetting = ( slugMatch[ 2 ] || 'INT.' ).toUpperCase();
                    var rawLocation = ( slugMatch[ 3 ] || 'LOCATION' ).trim().toUpperCase();
                    var timeOfDay = ( slugMatch[ 4 ] || 'DAY' ).trim().toUpperCase();
                    var sceneNum = slugMatch[ 1 ] || slugMatch[ 5 ] || ( scenes.length + 1 );

                    var settingType = 'INT';
                    if ( rawSetting.indexOf( 'EXT' ) !== -1 && rawSetting.indexOf( 'INT' ) !== -1 ) {
                        settingType = 'INT/EXT';
                    } else if ( rawSetting.indexOf( 'EXT' ) !== -1 ) {
                        settingType = 'EXT';
                    }

                    var slashIdx = rawLocation.indexOf( '/' );
                    var primaryLoc = slashIdx !== -1 ? rawLocation.substring( 0, slashIdx ).trim() : rawLocation;
                    var subLoc = slashIdx !== -1 ? rawLocation.substring( slashIdx + 1 ).trim() : '';

                    if ( primaryLoc ) {
                        locationMap[ primaryLoc ] = true;
                        if ( subLoc ) {
                            if ( ! subLocationMap[ primaryLoc ] ) {
                                subLocationMap[ primaryLoc ] = [];
                            }
                            if ( subLocationMap[ primaryLoc ].indexOf( subLoc ) === -1 ) {
                                subLocationMap[ primaryLoc ].push( subLoc );
                            }
                        }
                    }

                    currentSceneLines = 1;
                    currentScene = {
                        number: sceneNum,
                        slugline: trimmed,
                        setting: settingType,
                        location: rawLocation,
                        primaryLocation: primaryLoc,
                        subLocation: subLoc,
                        time: timeOfDay,
                        startLine: i,
                        endLine: i,
                        lineCount: 1,
                        eighths: '1/8 pgs',
                        characters: [],
                        elements: [],
                        elementsByCategory: { Props: [], AudioFX: [], Vehicles: [], Wardrobe: [] }
                    };
                    continue;
                }

                if ( currentScene ) {
                    currentSceneLines++;

                    // Check Character Cue
                    var charMatch = trimmed.match( this.charRegex );
                    if ( charMatch && ! slugMatch && this.isValidCharacterName( charMatch[ 1 ].trim() ) ) {
                        var charName = charMatch[ 1 ].trim();
                        var cleanChar = charName.replace( /\s*\([^\)]*\)/g, '' ).trim();

                        if ( currentScene.characters.indexOf( cleanChar ) === -1 ) {
                            currentScene.characters.push( cleanChar );
                        }
                        if ( ! characters[ cleanChar ] ) {
                            characters[ cleanChar ] = { name: cleanChar, sceneCount: 0, scenes: [], dialogueCount: 0 };
                        }
                        characters[ cleanChar ].dialogueCount++;
                        lastSpeakingCharacter = cleanChar;
                    }

                    // Check Props / Vehicles / Sounds from dictionary
                    var lower = trimmed.toLowerCase();
                    Object.keys( this.elementKeywords ).forEach( function( cat ) {
                        self.elementKeywords[ cat ].forEach( function( kw ) {
                            if ( lower.indexOf( kw ) !== -1 ) {
                                var elemName = kw.toUpperCase();
                                if ( currentScene.elements.indexOf( elemName ) === -1 ) {
                                    currentScene.elements.push( elemName );
                                }
                                if ( currentScene.elementsByCategory[ cat ] && currentScene.elementsByCategory[ cat ].indexOf( elemName ) === -1 ) {
                                    currentScene.elementsByCategory[ cat ].push( elemName );
                                }
                                if ( ! elements[ cat ][ elemName ] ) {
                                    elements[ cat ][ elemName ] = { name: elemName, scenes: [] };
                                }
                                if ( elements[ cat ][ elemName ].scenes.indexOf( currentScene.number ) === -1 ) {
                                    elements[ cat ][ elemName ].scenes.push( currentScene.number );
                                }
                            }
                        } );
                    } );

                    // Dynamic Uppercase Production Element Extraction in Action Blocks
                    // In Hollywood scripts, production elements, props, and sounds are highlighted in ALL CAPS
                    if ( ! charMatch && trimmed.length > 0 && trimmed !== trimmed.toUpperCase() ) {
                        var capPhrases = trimmed.match( /\b[A-Z]{2,}(?:\s+[A-Z]{2,}){0,2}\b/g );
                        if ( capPhrases ) {
                            capPhrases.forEach( function( cap ) {
                                var upper = cap.trim();
                                if ( upper.length < 3 || upper.length > 28 ) return;
                                if ( /^(THE|A|AN|AND|OR|IN|ON|AT|TO|FOR|WITH|FROM|BY|AS|WE|HE|SHE|IT|THEY|HIS|HER|BUT|NOT|ALL|NO|SO|IF|OUT|UP|DOWN|OFF|OVER|BACK|INTO|INT|EXT|DAY|NIGHT|LATER|MORNING|EVENING|FADE|CUT|SCENE|BEAT|MORE|POV|CAMERA|WIDE|CLOSE|MR|MRS|DR|MS|CONTINUED)$/.test( upper ) ) {
                                    return;
                                }
                                if ( characters[ upper ] || ( self.isValidCharacterName( upper ) && self.transitions.indexOf( upper ) !== -1 ) ) {
                                    return;
                                }

                                var targetCat = 'Props';
                                var low = upper.toLowerCase();
                                if ( self.elementKeywords.AudioFX.some( function( k ) { return low.indexOf( k ) !== -1; } ) ) {
                                    targetCat = 'AudioFX';
                                } else if ( self.elementKeywords.Vehicles.some( function( k ) { return low.indexOf( k ) !== -1; } ) ) {
                                    targetCat = 'Vehicles';
                                } else if ( self.elementKeywords.Wardrobe.some( function( k ) { return low.indexOf( k ) !== -1; } ) ) {
                                    targetCat = 'Wardrobe';
                                }

                                if ( currentScene.elements.indexOf( upper ) === -1 ) {
                                    currentScene.elements.push( upper );
                                }
                                if ( currentScene.elementsByCategory[ targetCat ] && currentScene.elementsByCategory[ targetCat ].indexOf( upper ) === -1 ) {
                                    currentScene.elementsByCategory[ targetCat ].push( upper );
                                }
                                if ( ! elements[ targetCat ][ upper ] ) {
                                    elements[ targetCat ][ upper ] = { name: upper, scenes: [] };
                                }
                                if ( elements[ targetCat ][ upper ].scenes.indexOf( currentScene.number ) === -1 ) {
                                    elements[ targetCat ][ upper ].scenes.push( currentScene.number );
                                }
                            } );
                        }
                    }
                }
            }

            if ( currentScene ) {
                currentScene.endLine = lines.length - 1;
                currentScene.lineCount = currentSceneLines;
                currentScene.eighths = self.formatEighths( currentSceneLines );
                scenes.push( currentScene );
            }

            scenes.forEach( function( sc ) {
                sc.characters.forEach( function( ch ) {
                    if ( characters[ ch ] && characters[ ch ].scenes.indexOf( sc.number ) === -1 ) {
                        characters[ ch ].scenes.push( sc.number );
                        characters[ ch ].sceneCount = characters[ ch ].scenes.length;
                    }
                } );
            } );

            var runtimeInfo = self.calculateRunTime( nonBlankLines );

            return {
                scenes: scenes,
                characters: characters,
                elements: elements,
                locations: Object.keys( locationMap ),
                subLocations: subLocationMap,
                totalScenes: scenes.length,
                characterList: Object.keys( characters ),
                lastSpeakingCharacter: lastSpeakingCharacter,
                runtime: runtimeInfo
            };
        },

        isValidCharacterName: function( name ) {
            if ( ! name || name.length < 2 || name.length > 35 ) return false;
            if ( this.transitions.indexOf( name ) !== -1 ) return false;
            if ( /^(INT|EXT|SCENE|BEAT|NOTE|THE END)/i.test( name ) ) return false;
            if ( /^\d+$/.test( name ) ) return false;
            return true;
        },

        isMovieScript: function( text, caretPos ) {
            if ( ! text || typeof text !== 'string' ) {
                return false;
            }

            var trimmedText = text.trim();
            if ( trimmedText.length === 0 ) {
                return false;
            }

            // 1. Check for standard Scene Heading (Slugline) anywhere in document
            // Supports both spec format (EXT. ALLEY - NIGHT) and shooting script format (5 INT. STORE - LATER 5)
            if ( /(?:^|\n)\s*(?:\d+[A-Z]?\s+)?(?:INT\.\/EXT\.|EXT\.\/INT\.|INT\.|EXT\.|I\/E\.)\s+[A-Z0-9\s\.\'\-\/]+/i.test( text ) ) {
                return true;
            }

            // 2. Check for standard Screenplay Transitions
            // e.g. FADE IN:, CUT TO:, FADE TO BLACK:
            if ( /(?:^|\n)\s*(?:FADE IN:|FADE OUT:|CUT TO:|DISSOLVE TO:|SMASH CUT:|FADE TO BLACK:)/i.test( text ) ) {
                return true;
            }

            // 3. Check for Character Cue + Dialogue pattern (Character name line followed by speech)
            var lines = text.split( '\n' );
            var self = this;
            for ( var i = 0; i < lines.length - 1; i++ ) {
                var l = lines[ i ].trim();
                if ( l.length >= 2 && l.length <= 35 && l === l.toUpperCase() && self.isValidCharacterName( l ) ) {
                    var nextL = lines[ i + 1 ].trim();
                    if ( nextL.length > 0 && ( nextL.indexOf( '(' ) === 0 || nextL !== nextL.toUpperCase() ) ) {
                        return true;
                    }
                }
            }

            // 4. Check if current line being actively typed is an explicit screenplay starter
            if ( typeof caretPos === 'number' ) {
                var textBefore = text.substring( 0, caretPos );
                var currentLine = textBefore.substring( textBefore.lastIndexOf( '\n' ) + 1 ).trim();
                if ( /^(INT|EXT|I\/E)(\.|\/|\s|$)/i.test( currentLine ) || /^(FADE IN|FADE OUT|CUT TO)/i.test( currentLine ) ) {
                    return true;
                }
            }

            return false;
        },

        classifyLine: function( text, caretPos ) {
            var fullText = text || '';
            var textBeforeCaret = fullText.substring( 0, caretPos );
            var linesBefore = textBeforeCaret.split( '\n' );
            var currentLineIdx = linesBefore.length - 1;
            var allLines = fullText.split( '\n' );
            var currentLine = allLines[ currentLineIdx ] || '';
            var trimmed = currentLine.trim();

            // 1. Find active scene info up to currentLineIdx
            var sceneCount = 0;
            var activeScene = null;
            for ( var i = 0; i <= currentLineIdx; i++ ) {
                var l = allLines[ i ].trim();
                var sMatch = l.match( this.slugRegex );
                if ( sMatch ) {
                    sceneCount++;
                    var rawSet = ( sMatch[ 2 ] || 'INT.' ).toUpperCase();
                    var isExt = rawSet.indexOf( 'EXT' ) !== -1;
                    var time = ( sMatch[ 4 ] || 'DAY' ).toUpperCase();
                    var sceneNum = sMatch[ 1 ] || sMatch[ 5 ] || sceneCount;
                    activeScene = {
                        number: sceneNum,
                        slugline: l,
                        setting: isExt ? 'EXT' : 'INT',
                        time: time,
                        isNight: ( time.indexOf( 'NIGHT' ) !== -1 || time.indexOf( 'DUSK' ) !== -1 || time.indexOf( 'EVENING' ) !== -1 ),
                        startLine: i,
                        elements: ( this.scriptData && this.scriptData.scenes && this.scriptData.scenes[ sceneCount - 1 ] )
                            ? this.scriptData.scenes[ sceneCount - 1 ].elements
                            : []
                    };
                }
            }

            // Hollywood scene length in 1/8ths of a page and total script estimated runtime
            var sceneLineCount = ( activeScene && typeof activeScene.startLine === 'number' )
                ? Math.max( 1, currentLineIdx - activeScene.startLine + 1 )
                : 1;
            var sceneEighths = this.formatEighths( sceneLineCount );
            var totalNonEmpty = allLines.filter( function( l ) { return l.trim().length > 0; } ).length;
            var runtime = this.calculateRunTime( totalNonEmpty );

            // 2. Look backwards to trace context
            var prevNonEmptyLine = '';
            var prevNonEmptyIdx = -1;
            for ( var p = currentLineIdx - 1; p >= 0; p-- ) {
                if ( allLines[ p ].trim().length > 0 ) {
                    prevNonEmptyLine = allLines[ p ].trim();
                    prevNonEmptyIdx = p;
                    break;
                }
            }

            // Check if current line is inside a dialogue speech block
            var isInsideDialogueBlock = false;
            var activeSpeaker = '';
            var hasBlankLineBeforeCurrent = ( prevNonEmptyIdx !== currentLineIdx - 1 );

            for ( var b = currentLineIdx - 1; b >= 0; b-- ) {
                var bTrim = allLines[ b ].trim();
                if ( bTrim.length === 0 ) {
                    break;
                }
                var cMatch = bTrim.match( this.charRegex );
                if ( cMatch && bTrim === bTrim.toUpperCase() && ! bTrim.match( this.slugRegex ) && this.isValidCharacterName( cMatch[ 1 ].trim() ) ) {
                    isInsideDialogueBlock = true;
                    activeSpeaker = cMatch[ 1 ].trim().replace( /\s*\([^\)]*\)/g, '' );
                    break;
                }
                if ( bTrim.match( this.slugRegex ) || this.transitions.indexOf( bTrim ) !== -1 ) {
                    break;
                }
            }

            if ( ! activeSpeaker && prevNonEmptyLine ) {
                var prevCharMatch = prevNonEmptyLine.match( this.charRegex );
                if ( prevCharMatch && ! prevNonEmptyLine.match( this.slugRegex ) && this.isValidCharacterName( prevCharMatch[ 1 ].trim() ) ) {
                    activeSpeaker = prevCharMatch[ 1 ].trim().replace( /\s*\([^\)]*\)/g, '' );
                }
            }

            // Detect any production elements in current action line
            var lineElements = [];
            if ( activeScene && activeScene.elements ) {
                var lowCurrent = currentLine.toLowerCase();
                activeScene.elements.forEach( function( el ) {
                    if ( currentLine.indexOf( el ) !== -1 || lowCurrent.indexOf( el.toLowerCase() ) !== -1 ) {
                        if ( lineElements.indexOf( el ) === -1 ) {
                            lineElements.push( el );
                        }
                    }
                } );
            }
            var elementSnippet = lineElements.length > 0 ? ' · ' + lineElements.slice( 0, 2 ).join( ', ' ) : '';

            // 3. Element Classifications
            // A. SCENE HEADING
            var slugMatch = trimmed.match( this.slugRegex );
            if ( slugMatch ) {
                var isExt = ( slugMatch[ 2 ] || 'INT.' ).toUpperCase().indexOf( 'EXT' ) !== -1;
                var time = ( slugMatch[ 4 ] || 'DAY' ).toUpperCase();
                var isNight = ( time.indexOf( 'NIGHT' ) !== -1 || time.indexOf( 'DUSK' ) !== -1 || time.indexOf( 'EVENING' ) !== -1 );

                var dot = 'amp-dot-scene-int-day';
                if ( isExt && isNight ) dot = 'amp-dot-scene-ext-night';
                else if ( isExt && ! isNight ) dot = 'amp-dot-scene-ext-day';
                else if ( ! isExt && isNight ) dot = 'amp-dot-scene-int-night';

                return {
                    type: 'SCENE_HEADING',
                    dotClass: dot,
                    typeLabel: 'SCENE HEADING',
                    detail: 'Scene ' + ( activeScene ? activeScene.number : sceneCount ) + ' (' + ( isExt ? 'EXT' : 'INT' ) + ' ' + ( isNight ? 'NIGHT' : 'DAY' ) + ' · ' + sceneEighths + ')',
                    hint: 'Press <kbd>Enter</kbd> for Action · Total: ' + runtime.pages + ' pgs (' + runtime.timeStr + ')',
                    sceneNumber: sceneCount,
                    lineIndex: currentLineIdx,
                    lineText: currentLine,
                    trimmed: trimmed
                };
            }

            // B. TRANSITIONS
            if ( this.transitions.indexOf( trimmed ) !== -1 || /^(FADE (IN|OUT|TO BLACK):?|CUT TO:|SMASH CUT:|DISSOLVE TO:)$/i.test( trimmed ) ) {
                return {
                    type: 'TRANSITION',
                    dotClass: 'amp-dot-transition',
                    typeLabel: 'TRANSITION',
                    detail: trimmed + ' · ' + runtime.timeStr + ' total',
                    hint: 'Press <kbd>Enter</kbd> for next Scene Heading',
                    sceneNumber: sceneCount,
                    lineIndex: currentLineIdx,
                    lineText: currentLine,
                    trimmed: trimmed
                };
            }

            // C. PARENTHETICAL
            if ( trimmed.match( this.parenRegex ) || ( trimmed.indexOf( '(' ) === 0 && ( trimmed.indexOf( ')' ) === -1 || trimmed.indexOf( ')' ) === trimmed.length - 1 ) ) ) {
                return {
                    type: 'PARENTHETICAL',
                    dotClass: 'amp-dot-parenthetical',
                    typeLabel: 'DIRECTION',
                    detail: activeSpeaker ? 'Direction for ' + activeSpeaker : 'Actor Delivery Direction',
                    hint: 'Press <kbd>Enter</kbd> for Dialogue speech',
                    sceneNumber: sceneCount,
                    lineIndex: currentLineIdx,
                    lineText: currentLine,
                    trimmed: trimmed
                };
            }

            // D. CHARACTER CUE
            var charMatch = trimmed.match( this.charRegex );
            if ( charMatch && trimmed === trimmed.toUpperCase() && this.isValidCharacterName( charMatch[ 1 ].trim() ) ) {
                var rawName = charMatch[ 1 ].trim();
                var name = rawName.replace( /\s*\([^\)]*\)/g, '' ).trim();
                var isCont = ( activeSpeaker && activeSpeaker === name );
                return {
                    type: 'CHARACTER_CUE',
                    dotClass: 'amp-dot-character',
                    typeLabel: 'CHARACTER NAME',
                    detail: name + ( isCont ? ' (CONT\'D)' : '' ) + ' · Scene ' + ( activeScene ? activeScene.number : sceneCount ),
                    hint: 'Press <kbd>Enter</kbd> for Dialogue · <kbd>Tab</kbd> for (direction/extension)',
                    characterName: name,
                    sceneNumber: sceneCount,
                    lineIndex: currentLineIdx,
                    lineText: currentLine,
                    trimmed: trimmed
                };
            }

            // E. EMPTY LINE
            if ( trimmed.length === 0 ) {
                if ( prevNonEmptyLine && prevNonEmptyLine.match( this.charRegex ) && ! prevNonEmptyLine.match( this.slugRegex ) && ! hasBlankLineBeforeCurrent ) {
                    var spk = prevNonEmptyLine.match( this.charRegex )[ 1 ].trim().replace( /\s*\([^\)]*\)/g, '' );
                    return {
                        type: 'DIALOGUE',
                        dotClass: 'amp-dot-dialogue',
                        typeLabel: 'DIALOGUE',
                        detail: 'Ready for ' + spk + "'s speech · " + sceneEighths,
                        hint: 'Type dialogue speech · or type <kbd>(</kbd> for direction',
                        sceneNumber: sceneCount,
                        lineIndex: currentLineIdx,
                        lineText: currentLine,
                        trimmed: trimmed
                    };
                }

                if ( prevNonEmptyLine && prevNonEmptyLine.match( this.parenRegex ) && ! hasBlankLineBeforeCurrent ) {
                    return {
                        type: 'DIALOGUE',
                        dotClass: 'amp-dot-dialogue',
                        typeLabel: 'DIALOGUE',
                        detail: ( activeSpeaker ? 'Speech for ' + activeSpeaker : 'Ready for speech' ) + ' · ' + sceneEighths,
                        hint: 'Type dialogue speech',
                        sceneNumber: sceneCount,
                        lineIndex: currentLineIdx,
                        lineText: currentLine,
                        trimmed: trimmed
                    };
                }

                return {
                    type: 'ACTION',
                    dotClass: 'amp-dot-action',
                    typeLabel: 'SCENE DESCRIPTION',
                    detail: ( activeScene ? 'Scene ' + activeScene.number + ' Action' : 'Action / Narrative' ) + ' · ' + sceneEighths + elementSnippet,
                    hint: 'Type scene description · or press <kbd>Tab</kbd> for Character name',
                    sceneNumber: sceneCount,
                    lineIndex: currentLineIdx,
                    lineText: currentLine,
                    trimmed: trimmed
                };
            }

            // F. DIALOGUE (Non-empty line within dialogue block)
            if ( isInsideDialogueBlock && trimmed.length > 0 ) {
                return {
                    type: 'DIALOGUE',
                    dotClass: 'amp-dot-dialogue',
                    typeLabel: 'DIALOGUE',
                    detail: 'Speaking: ' + ( activeSpeaker || 'Character' ) + ' · ' + sceneEighths,
                    hint: 'Press <kbd>Enter</kbd> to start Scene Description (Action)',
                    sceneNumber: sceneCount,
                    lineIndex: currentLineIdx,
                    lineText: currentLine,
                    trimmed: trimmed
                };
            }

            // G. SCENE DESCRIPTION (ACTION) - Default narrative text
            return {
                type: 'ACTION',
                dotClass: 'amp-dot-action',
                typeLabel: 'SCENE DESCRIPTION',
                detail: ( activeScene ? 'Scene ' + activeScene.number + ' Action' : 'Scene Description' ) + ' · ' + sceneEighths + elementSnippet,
                hint: 'Type scene description · or press <kbd>Tab</kbd> for Character name',
                sceneNumber: sceneCount,
                lineIndex: currentLineIdx,
                lineText: currentLine,
                trimmed: trimmed
            };
        }
    };

    // =========================================================================
    // 2. CARET POSITION HELPER (Mirror Div Method for Pixel Accuracy)
    // =========================================================================
    function getCaretCoordinates( textarea, position ) {
        var mirror = document.getElementById( 'andika-caret-mirror' );
        if ( ! mirror ) {
            mirror = document.createElement( 'div' );
            mirror.id = 'andika-caret-mirror';
            document.body.appendChild( mirror );
        }

        var style = window.getComputedStyle( textarea );
        mirror.style.position = 'absolute';
        mirror.style.top = '-9999px';
        mirror.style.left = '-9999px';
        mirror.style.visibility = 'hidden';
        mirror.style.whiteSpace = 'pre-wrap';
        mirror.style.wordWrap = 'break-word';
        mirror.style.width = textarea.clientWidth + 'px';
        mirror.style.fontFamily = style.fontFamily;
        mirror.style.fontSize = style.fontSize;
        mirror.style.fontWeight = style.fontWeight;
        mirror.style.lineHeight = style.lineHeight;
        mirror.style.padding = style.padding;
        mirror.style.border = style.border;
        mirror.style.boxSizing = style.boxSizing;

        var textBefore = textarea.value.substring( 0, position );
        mirror.textContent = textBefore;

        var marker = document.createElement( 'span' );
        marker.textContent = textarea.value.substring( position, position + 1 ) || '.';
        mirror.appendChild( marker );

        var rect = textarea.getBoundingClientRect();
        var lineHeight = parseInt( style.lineHeight, 10 ) || 24;

        var top = rect.top + ( marker.offsetTop - textarea.scrollTop );
        var left = rect.left + ( marker.offsetLeft - textarea.scrollLeft );

        return {
            top: top,
            left: left,
            lineHeight: lineHeight
        };
    }

    // =========================================================================
    // 3. INTUITIVE SCREENPLAY EXTENSION ENGINE
    // =========================================================================
    window.Andika.registerExtension( 'movie-production', {
        id: 'movie-production',
        name: 'Movie Production & Script Breakdown',
        version: '1.0.0',

        init: function( api ) {
            var self = this;
            this.api = api;
            this.textarea = document.getElementById( 'script-writer-textarea' );
            this.canvasWrap = document.getElementById( 'script-writer-canvas-wrap' );
            this.editorView = document.getElementById( 'script-writer-editor-view' );
            this.activeSuggestions = [];
            this.selectedSuggestIdx = 0;
            this.isSuggestOpen = false;

            if ( ! this.textarea ) {
                return;
            }

            // Create Subtle Floating Screenplay Status Pill (Bottom-Right)
            this.createStatusPill();

            // Create Caret Contextual Autocomplete Tooltip
            this.createCaretTooltip();

            // Parse initial script
            this.scriptData = ScreenplayEngine.parse( this.textarea.value );

            // Bind Event Listeners on Textarea
            this.bindEvents();

            // Initial classification update
            this.updateDetection();

            // Initialize Screenplay & Sides Export Provider
            this.initScreenplayExport( api );
        },

        createStatusPill: function() {
            var self = this;
            var existing = document.getElementById( 'andika-screenplay-pill' );
            if ( existing ) existing.remove();

            var pill = document.createElement( 'div' );
            pill.id = 'andika-screenplay-pill';
            pill.className = 'sw-hidden';
            pill.setAttribute( 'role', 'status' );
            pill.setAttribute( 'aria-live', 'polite' );
            pill.setAttribute( 'title', 'Screenplay Element Detector · Click or Ctrl+/ for Playbook & Script Vitals' );
            pill.innerHTML = [
                '<span class="amp-pill-dot amp-dot-scene-ext-night"></span>',
                '<span class="amp-pill-type">SCENE HEADING</span>',
                '<span class="amp-pill-detail">Scene 1 (EXT. NIGHT)</span>',
                '<span class="amp-pill-sep">·</span>',
                '<span class="amp-pill-hint">Press <kbd>Enter</kbd> to start Scene Description (Action)</span>',
                '<span class="amp-pill-guide-btn" title="Screenplay Playbook & Live Vitals (Ctrl+/)">?</span>'
            ].join( '' );

            pill.addEventListener( 'click', function( e ) {
                e.preventDefault();
                e.stopPropagation();
                self.toggleScreenplayDrawer();
            } );

            var targetParent = this.editorView || document.body;
            targetParent.appendChild( pill );
            this.pill = pill;
        },

        createCaretTooltip: function() {
            var existing = document.getElementById( 'andika-screenplay-tooltip' );
            if ( existing ) existing.remove();

            var tooltip = document.createElement( 'div' );
            tooltip.id = 'andika-screenplay-tooltip';
            tooltip.className = 'sw-hidden';
            tooltip.innerHTML = [
                '<div class="amp-tooltip-header">',
                '   <span class="amp-tooltip-title">Suggestions</span>',
                '   <span class="amp-key-hint"><kbd>Tab</kbd> / <kbd>↵</kbd> to insert</span>',
                '</div>',
                '<ul class="amp-tooltip-list" id="amp-tooltip-list"></ul>'
            ].join( '' );

            document.body.appendChild( tooltip );
            this.tooltip = tooltip;
            this.tooltipList = tooltip.querySelector( '#amp-tooltip-list' );
        },

        bindEvents: function() {
            var self = this;
            var ta = this.textarea;

            // Cursor movement and typing detection
            var updateThrottle = null;
            function scheduleUpdate() {
                if ( updateThrottle ) clearTimeout( updateThrottle );
                updateThrottle = setTimeout( function() {
                    self.updateDetection();
                    if ( self.drawer && typeof self.drawer.isOpen === 'function' && self.drawer.isOpen() ) {
                        self.updateDrawerVitals();
                    }
                }, 20 );
            }

            ta.addEventListener( 'input', function() {
                self.scriptData = ScreenplayEngine.parse( ta.value );
                scheduleUpdate();
                self.checkSuggestions();
            } );

            ta.addEventListener( 'click', function() {
                self.closeSuggestions();
                scheduleUpdate();
            } );

            ta.addEventListener( 'keyup', function( e ) {
                if ( [ 37, 38, 39, 40, 33, 34, 35, 36, 13, 8, 46 ].indexOf( e.keyCode ) !== -1 ) {
                    self.closeSuggestions();
                }
                scheduleUpdate();
            } );

            document.addEventListener( 'selectionchange', function() {
                if ( document.activeElement === ta ) {
                    scheduleUpdate();
                }
            } );

            ta.addEventListener( 'scroll', function() {
                if ( self.isSuggestOpen ) {
                    self.closeSuggestions();
                }
            } );

            // Smart Keyboard Navigation & Formatting Intuition
            ta.addEventListener( 'keydown', function( e ) {
                self.handleKeyDown( e );
            }, true );

            // Listen for document clicks to dismiss suggestions
            document.addEventListener( 'click', function( e ) {
                if ( self.isSuggestOpen && ! self.tooltip.contains( e.target ) && e.target !== ta ) {
                    self.closeSuggestions();
                }
            } );

            // Screenplay Playbook & Live Vitals Drawer Shortcut (Ctrl+/ or Cmd+/)
            document.addEventListener( 'keydown', function( e ) {
                if ( ( e.ctrlKey || e.metaKey ) && e.key === '/' ) {
                    e.preventDefault();
                    self.toggleScreenplayDrawer();
                }
            } );

            // Proximity-based Scrollbar: Keep hidden until cursor gets close to the right edge
            var hideScrollbarTimeout = null;
            var isDraggingScrollbar = false;

            function showCanvasScrollbar() {
                if ( hideScrollbarTimeout ) clearTimeout( hideScrollbarTimeout );
                ta.classList.add( 'sw-show-scrollbar' );
            }

            function scheduleHideCanvasScrollbar( delay ) {
                if ( isDraggingScrollbar ) return;
                if ( hideScrollbarTimeout ) clearTimeout( hideScrollbarTimeout );
                hideScrollbarTimeout = setTimeout( function() {
                    if ( ! isDraggingScrollbar ) {
                        ta.classList.remove( 'sw-show-scrollbar' );
                    }
                }, delay || 250 );
            }

            document.addEventListener( 'mousemove', function( e ) {
                if ( isDraggingScrollbar ) return;
                var editorActive = self.editorView && ( self.editorView.classList.contains( 'sw-view-active' ) || ! self.editorView.classList.contains( 'sw-view-hidden' ) );
                if ( ! editorActive ) return;

                var rect = ta.getBoundingClientRect();
                var isNearRightEdge = (
                    e.clientY >= rect.top &&
                    e.clientY <= rect.bottom &&
                    e.clientX >= ( rect.right - 75 ) &&
                    e.clientX <= ( rect.right + 25 )
                );

                if ( isNearRightEdge ) {
                    showCanvasScrollbar();
                } else {
                    scheduleHideCanvasScrollbar( 150 );
                }
            } );

            ta.addEventListener( 'mousedown', function( e ) {
                var rect = ta.getBoundingClientRect();
                if ( e.clientX >= rect.right - 18 ) {
                    isDraggingScrollbar = true;
                    showCanvasScrollbar();
                }
            } );

            document.addEventListener( 'mouseup', function() {
                if ( isDraggingScrollbar ) {
                    isDraggingScrollbar = false;
                    scheduleHideCanvasScrollbar( 400 );
                }
            } );

            ta.addEventListener( 'scroll', function() {
                showCanvasScrollbar();
                scheduleHideCanvasScrollbar( 1200 );
            } );

            // Listen to Andika Core state changes
            window.Andika.on( 'change', function( data ) {
                if ( data && typeof data.text === 'string' ) {
                    self.scriptData = ScreenplayEngine.parse( data.text );
                    self.updateDetection();
                }
            } );

            window.Andika.on( 'load', function( data ) {
                if ( data && typeof data.content === 'string' ) {
                    self.scriptData = ScreenplayEngine.parse( data.content );
                    self.updateDetection();
                }
            } );

            window.Andika.on( 'viewChange', function() {
                self.updateDetection();
            } );

            window.Andika.on( 'screenplay:imported', function( data ) {
                if ( data && data.content ) {
                    self.scriptData = ScreenplayEngine.parse( data.content );
                    self.updateDetection();
                    if ( data.is_movie_script ) {
                        self.openScreenplayDrawerToVitals();
                    }
                }
            } );
        },

        updateDetection: function() {
            if ( ! this.pill || ! this.textarea ) return;

            // Hide pill if not in editor view
            var editorActive = this.editorView && ( this.editorView.classList.contains( 'sw-view-active' ) || ! this.editorView.classList.contains( 'sw-view-hidden' ) );
            if ( ! editorActive ) {
                this.pill.classList.add( 'sw-hidden' );
                return;
            }

            var text = ( this.textarea && this.textarea.value ) ? this.textarea.value : '';
            var caretPos = ( this.textarea && typeof this.textarea.selectionStart === 'number' ) ? this.textarea.selectionStart : 0;

            // CONTEXTUAL SCRIPT DETECTION:
            // The tooltip & detector pill appears ONLY when a movie script is detected!
            // If writing general notes, prose, or on an empty canvas, keep dormant.
            var isScript = ScreenplayEngine.isMovieScript( text, caretPos );
            if ( ! isScript ) {
                this.pill.classList.add( 'sw-hidden' );
                this.closeSuggestions();
                return;
            }

            var classification = ScreenplayEngine.classifyLine( text, caretPos );

            // Update Pill DOM
            var dot = this.pill.querySelector( '.amp-pill-dot' );
            var type = this.pill.querySelector( '.amp-pill-type' );
            var detail = this.pill.querySelector( '.amp-pill-detail' );
            var hint = this.pill.querySelector( '.amp-pill-hint' );

            if ( dot ) dot.className = 'amp-pill-dot ' + classification.dotClass;
            if ( type ) type.textContent = classification.typeLabel;
            if ( detail ) detail.textContent = classification.detail;
            if ( hint ) hint.innerHTML = classification.hint;

            this.pill.classList.remove( 'sw-hidden' );
        },

        checkSuggestions: function() {
            var editorActive = this.editorView && ( this.editorView.classList.contains( 'sw-view-active' ) || ! this.editorView.classList.contains( 'sw-view-hidden' ) );
            if ( ! editorActive ) {
                this.closeSuggestions();
                return;
            }

            var ta = this.textarea;
            var caretPos = ta.selectionStart;
            var text = ta.value;
            var textBefore = text.substring( 0, caretPos );
            var currentLine = textBefore.substring( textBefore.lastIndexOf( '\n' ) + 1 );
            var trimmed = currentLine.trim();

            // Only show screenplay autocomplete if actively in a movie script or typing a slugline
            var isScript = ScreenplayEngine.isMovieScript( text, caretPos );
            var isStartingSlug = /^(INT|EXT|I\/E)(\.|\/|\s|$)/i.test( trimmed );
            if ( ! isScript && ! isStartingSlug ) {
                this.closeSuggestions();
                return;
            }

            // 1. Scene Heading Starter Autocomplete
            var lower = trimmed.toLowerCase();
            if ( lower === 'int.' || lower === 'ext.' || lower === 'i/e.' || lower === 'int/' || lower === 'ext/' ||
                 trimmed === 'INT' || trimmed === 'EXT' || trimmed === 'INT.' || trimmed === 'EXT.' || trimmed === 'I/E' || trimmed === 'I/E.' ) {

                var slugOptions = [
                    { label: 'INT. ', desc: 'Interior Scene', dot: '#f8fafc' },
                    { label: 'EXT. ', desc: 'Exterior Scene', dot: '#3b82f6' },
                    { label: 'INT./EXT. ', desc: 'Interior / Exterior', dot: '#10b981' },
                    { label: 'I/E. ', desc: 'Interior / Exterior', dot: '#10b981' }
                ];
                this.showSuggestions( slugOptions, trimmed.length );
                return;
            }

            // 2. Compound Slugline: Locations, Sub-Locations (/), and Times of Day (- )
            var slugPrefixMatch = currentLine.match( /^(?:(?:\d+[A-Z]?\s+)?)(INT\.\/EXT\.|EXT\.\/INT\.|INT\.|EXT\.|I\/E\.)\s*(.*)$/i );
            if ( slugPrefixMatch ) {
                var afterPrefix = slugPrefixMatch[ 2 ];

                // A. Time of Day Autocomplete (after "-" or "- ")
                if ( afterPrefix.indexOf( '-' ) !== -1 ) {
                    var dashIdx = afterPrefix.lastIndexOf( '-' );
                    var afterDash = afterPrefix.substring( dashIdx + 1 ).trim().toUpperCase();
                    var standardTimes = [
                        { label: 'DAY', desc: 'Daytime', dot: '#f59e0b' },
                        { label: 'NIGHT', desc: 'Nighttime', dot: '#3b82f6' },
                        { label: 'LATER', desc: 'Time passage', dot: '#94a3b8' },
                        { label: 'CONTINUOUS', desc: 'Direct unbroken action', dot: '#38bdf8' },
                        { label: 'MORNING', desc: 'Early morning light', dot: '#fbbf24' },
                        { label: 'EVENING', desc: 'Late afternoon / sunset', dot: '#f97316' },
                        { label: 'DAWN', desc: 'First break of dawn', dot: '#ec4899' },
                        { label: 'DUSK', desc: 'Twilight fading', dot: '#a855f7' }
                    ];

                    var timeMatches = [];
                    standardTimes.forEach( function( t ) {
                        if ( ! afterDash || t.label.indexOf( afterDash ) === 0 ) {
                            timeMatches.push( t );
                        }
                    } );

                    if ( timeMatches.length > 0 && afterDash !== timeMatches[ 0 ].label ) {
                        this.showSuggestions( timeMatches, afterDash.length );
                        return;
                    }
                }

                // B. Sub-location Autocomplete (after "/")
                if ( afterPrefix.indexOf( '/' ) !== -1 && afterPrefix.indexOf( '-' ) === -1 ) {
                    var slashIdx = afterPrefix.lastIndexOf( '/' );
                    var primaryLoc = afterPrefix.substring( 0, slashIdx ).trim().toUpperCase();
                    var afterSlash = afterPrefix.substring( slashIdx + 1 ).trim().toUpperCase();

                    var subList = ( this.scriptData && this.scriptData.subLocations && this.scriptData.subLocations[ primaryLoc ] )
                        || [ 'STUDY', 'BEDROOM', 'LIVING ROOM', 'KITCHEN', 'HALLWAY', 'OFFICE', 'FIELD', 'YARD' ];
                    var subMatches = [];
                    subList.forEach( function( sub ) {
                        if ( ! afterSlash || sub.indexOf( afterSlash ) === 0 ) {
                            subMatches.push( {
                                label: sub + ' - ',
                                desc: primaryLoc + ' Room / Area',
                                dot: '#f8fafc'
                            } );
                        }
                    } );

                    if ( subMatches.length > 0 ) {
                        this.showSuggestions( subMatches, afterSlash.length );
                        return;
                    }
                }

                // C. Established Location Autocomplete (before "-")
                if ( afterPrefix.indexOf( '-' ) === -1 && afterPrefix.indexOf( '/' ) === -1 ) {
                    var typedLoc = afterPrefix.trim().toUpperCase();
                    if ( typedLoc.length >= 1 ) {
                        var knownLocs = ( this.scriptData && this.scriptData.locations ) || [];
                        var locMatches = [];
                        knownLocs.forEach( function( loc ) {
                            if ( loc.indexOf( typedLoc ) === 0 && loc !== typedLoc ) {
                                locMatches.push( {
                                    label: loc + ' - ',
                                    desc: 'Established Location',
                                    dot: '#f8fafc'
                                } );
                            }
                        } );

                        if ( locMatches.length > 0 ) {
                            this.showSuggestions( locMatches, typedLoc.length );
                            return;
                        }
                    }
                }
            }

            // 3. Character Autocomplete & Continuity Extensions ((CONT'D), (O.S.), (V.O.))
            if ( trimmed.length >= 2 && trimmed.length <= 28 && trimmed === trimmed.toUpperCase() && ! /^(INT|EXT|SCENE|BEAT|NOTE)/.test( trimmed ) ) {
                var knownChars = ( this.scriptData && this.scriptData.characterList ) || [];
                var lastSpeaker = ( this.scriptData && this.scriptData.lastSpeakingCharacter ) || '';
                var matches = [];

                knownChars.forEach( function( name ) {
                    if ( name.indexOf( trimmed ) === 0 ) {
                        if ( name === lastSpeaker ) {
                            matches.unshift( {
                                label: name + ' (CONT\'D)',
                                desc: 'Continuing Dialogue',
                                dot: '#c084fc'
                            } );
                        }
                        matches.push( {
                            label: name,
                            desc: 'Character',
                            dot: '#c084fc'
                        } );
                        matches.push( {
                            label: name + ' (O.S.)',
                            desc: 'Off-Screen Voice',
                            dot: '#c084fc'
                        } );
                        matches.push( {
                            label: name + ' (V.O.)',
                            desc: 'Voice-Over Narration',
                            dot: '#c084fc'
                        } );
                    }
                } );

                if ( matches.length > 0 ) {
                    this.showSuggestions( matches, trimmed.length );
                    return;
                }
            }

            // 4. Parenthetical Wrylies & Directions Autocomplete (when typing "(")
            if ( trimmed.indexOf( '(' ) === 0 ) {
                var typedParen = trimmed.substring( 1 ).toLowerCase();
                var commonWrylies = [
                    { label: '(CONT\'D)', desc: 'Continuing Speech', dot: '#c084fc' },
                    { label: '(O.S.)', desc: 'Off-Screen Voice', dot: '#c084fc' },
                    { label: '(V.O.)', desc: 'Voice-Over Narration', dot: '#c084fc' },
                    { label: '(beat)', desc: 'Brief dramatic pause', dot: '#22d3ee' },
                    { label: '(sotto)', desc: 'Spoken softly / sotto voce', dot: '#22d3ee' },
                    { label: '(whispering)', desc: 'Whispered speech', dot: '#22d3ee' },
                    { label: '(cautiously)', desc: 'Cautious delivery', dot: '#22d3ee' },
                    { label: '(smiling)', desc: 'Warm / smiling delivery', dot: '#22d3ee' },
                    { label: '(coldly)', desc: 'Stern / cold delivery', dot: '#22d3ee' },
                    { label: '(to camera)', desc: 'Direct 4th-wall address', dot: '#22d3ee' }
                ];

                var parenMatches = [];
                commonWrylies.forEach( function( item ) {
                    if ( ! typedParen || item.label.toLowerCase().indexOf( typedParen ) !== -1 ) {
                        parenMatches.push( item );
                    }
                } );

                if ( parenMatches.length > 0 ) {
                    this.showSuggestions( parenMatches, trimmed.length );
                    return;
                }
            }

            this.closeSuggestions();
        },

        showSuggestions: function( items, replaceLen ) {
            if ( ! items || items.length === 0 ) {
                this.closeSuggestions();
                return;
            }

            this.activeSuggestions = items;
            this.replaceLength = replaceLen || 0;
            this.selectedSuggestIdx = 0;
            this.isSuggestOpen = true;

            var html = [];
            var self = this;
            items.forEach( function( item, idx ) {
                var activeClass = ( idx === 0 ) ? 'active' : '';
                html.push( '<li class="amp-tooltip-item ' + activeClass + '" data-idx="' + idx + '">' );
                html.push( '   <div class="amp-item-main">' );
                html.push( '       <span class="amp-item-dot" style="background:' + item.dot + '"></span>' );
                html.push( '       <span>' + item.label + '</span>' );
                html.push( '   </div>' );
                html.push( '   <span class="amp-item-desc">' + item.desc + '</span>' );
                html.push( '</li>' );
            } );

            this.tooltipList.innerHTML = html.join( '' );

            // Bind click to suggestion items
            var itemEls = this.tooltipList.querySelectorAll( '.amp-tooltip-item' );
            itemEls.forEach( function( el ) {
                el.addEventListener( 'mousedown', function( e ) {
                    e.preventDefault();
                    var idx = parseInt( el.dataset.idx, 10 );
                    self.applySuggestion( idx );
                } );
            } );

            // Position near caret
            var coords = getCaretCoordinates( this.textarea, this.textarea.selectionStart );
            var top = coords.top + coords.lineHeight + 6;
            var left = coords.left;

            // Constrain within viewport
            var maxLeft = window.innerWidth - 300;
            if ( left > maxLeft ) left = maxLeft;
            if ( left < 20 ) left = 20;

            this.tooltip.style.top = top + 'px';
            this.tooltip.style.left = left + 'px';
            this.tooltip.classList.remove( 'sw-hidden' );
        },

        closeSuggestions: function() {
            if ( ! this.isSuggestOpen ) return;
            this.isSuggestOpen = false;
            this.activeSuggestions = [];
            if ( this.tooltip ) {
                this.tooltip.classList.add( 'sw-hidden' );
            }
        },

        applySuggestion: function( index ) {
            var item = this.activeSuggestions[ index ];
            if ( ! item ) return;

            var ta = this.textarea;
            var caret = ta.selectionStart;
            var val = ta.value;

            var startPos = caret - this.replaceLength;
            var insertion = item.label;

            ta.value = val.substring( 0, startPos ) + insertion + val.substring( caret );
            ta.selectionStart = ta.selectionEnd = startPos + insertion.length;
            ta.focus();

            // Dispatch input event for auto-save and stats
            ta.dispatchEvent( new Event( 'input', { bubbles: true } ) );

            this.closeSuggestions();
            this.updateDetection();
        },

        handleKeyDown: function( e ) {
            var ta = this.textarea;

            // A. When Suggestions Popup is Open
            if ( this.isSuggestOpen ) {
                if ( e.key === 'ArrowDown' ) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.selectedSuggestIdx = ( this.selectedSuggestIdx + 1 ) % this.activeSuggestions.length;
                    this.highlightSuggestion( this.selectedSuggestIdx );
                    return;
                }
                if ( e.key === 'ArrowUp' ) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.selectedSuggestIdx = ( this.selectedSuggestIdx - 1 + this.activeSuggestions.length ) % this.activeSuggestions.length;
                    this.highlightSuggestion( this.selectedSuggestIdx );
                    return;
                }
                if ( e.key === 'Tab' || e.key === 'Enter' ) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.applySuggestion( this.selectedSuggestIdx );
                    return;
                }
                if ( e.key === 'Escape' ) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.closeSuggestions();
                    return;
                }
            }

            // B. Smart Keystroke Automation
            var caret = ta.selectionStart;
            var val = ta.value;

            // Only run screenplay keystroke automations if the document is actually a movie script!
            var isScript = ScreenplayEngine.isMovieScript( val, caret );
            if ( ! isScript ) {
                return;
            }

            var classification = ScreenplayEngine.classifyLine( val, caret );

            // 1. Enter Key Automation
            if ( e.key === 'Enter' && ! e.shiftKey && ! e.ctrlKey && ! e.metaKey ) {
                var isAtEndOfLine = ( caret === val.length || val.charAt( caret ) === '\n' );

                // A. Scene Heading -> Smart transition to Scene Description (Double newline for clean spacing)
                if ( classification.type === 'SCENE_HEADING' && isAtEndOfLine ) {
                    e.preventDefault();
                    ta.value = val.substring( 0, caret ) + '\n\n' + val.substring( caret );
                    ta.selectionStart = ta.selectionEnd = caret + 2;
                    ta.dispatchEvent( new Event( 'input', { bubbles: true } ) );
                    this.updateDetection();
                    return;
                }

                // B. Character Name -> Move immediately to Dialogue speech
                if ( classification.type === 'CHARACTER_CUE' && isAtEndOfLine ) {
                    e.preventDefault();
                    ta.value = val.substring( 0, caret ) + '\n' + val.substring( caret );
                    ta.selectionStart = ta.selectionEnd = caret + 1;
                    ta.dispatchEvent( new Event( 'input', { bubbles: true } ) );
                    this.updateDetection();
                    return;
                }

                // C. Direction / Parenthetical -> Auto-close parenthesis if needed and move to Dialogue speech
                if ( classification.type === 'PARENTHETICAL' && isAtEndOfLine ) {
                    e.preventDefault();
                    var lineText = classification.lineText || '';
                    var closeParen = ( lineText.indexOf( ')' ) === -1 ) ? ')\n' : '\n';
                    ta.value = val.substring( 0, caret ) + closeParen + val.substring( caret );
                    ta.selectionStart = ta.selectionEnd = caret + closeParen.length;
                    ta.dispatchEvent( new Event( 'input', { bubbles: true } ) );
                    this.updateDetection();
                    return;
                }

                // D. Dialogue -> Smart transition to Scene Description (Action)
                if ( classification.type === 'DIALOGUE' && isAtEndOfLine ) {
                    e.preventDefault();
                    ta.value = val.substring( 0, caret ) + '\n\n' + val.substring( caret );
                    ta.selectionStart = ta.selectionEnd = caret + 2;
                    ta.dispatchEvent( new Event( 'input', { bubbles: true } ) );
                    this.updateDetection();
                    return;
                }
            }

            // 2. Tab Key Automation
            if ( e.key === 'Tab' && ! e.shiftKey ) {
                // Tab on Character Name -> Show extensions popup: (CONT'D), (O.S.), (V.O.), or parenthetical wrylies
                if ( classification.type === 'CHARACTER_CUE' ) {
                    e.preventDefault();
                    e.stopPropagation();
                    var charExtensions = [
                        { label: ' (CONT\'D)', desc: 'Continuing Dialogue', dot: '#c084fc' },
                        { label: ' (O.S.)', desc: 'Off-Screen Voice', dot: '#c084fc' },
                        { label: ' (V.O.)', desc: 'Voice-Over Narration', dot: '#c084fc' },
                        { label: '\n(beat)', desc: 'Brief dramatic pause', dot: '#22d3ee' },
                        { label: '\n(sotto)', desc: 'Spoken softly / sotto voce', dot: '#22d3ee' },
                        { label: '\n(whispering)', desc: 'Whispered speech', dot: '#22d3ee' },
                        { label: '\n(cautiously)', desc: 'Cautious delivery', dot: '#22d3ee' },
                        { label: '\n(', desc: 'Custom actor delivery direction', dot: '#22d3ee' }
                    ];
                    this.showSuggestions( charExtensions, 0 );
                    return;
                }

                // Tab on Scene Description or Empty Line -> Suggest Characters from script
                if ( classification.type === 'ACTION' || classification.type === 'SCENE_DESCRIPTION' || classification.type === 'EMPTY_LINE' ) {
                    var knownChars = ( this.scriptData && this.scriptData.characterList ) || [];
                    if ( knownChars.length > 0 ) {
                        e.preventDefault();
                        e.stopPropagation();
                        var lastSpeaker = ( this.scriptData && this.scriptData.lastSpeakingCharacter ) || '';
                        var items = [];
                        knownChars.forEach( function( name ) {
                            if ( name === lastSpeaker ) {
                                items.unshift( { label: name + ' (CONT\'D)', desc: 'Continuing Dialogue', dot: '#c084fc' } );
                            }
                            items.push( { label: name, desc: 'Character Name', dot: '#c084fc' } );
                        } );
                        this.showSuggestions( items, 0 );
                        return;
                    }
                }
            }
        },

        highlightSuggestion: function( index ) {
            var items = this.tooltipList.querySelectorAll( '.amp-tooltip-item' );
            items.forEach( function( el, idx ) {
                if ( idx === index ) {
                    el.classList.add( 'active' );
                } else {
                    el.classList.remove( 'active' );
                }
            } );
        },

        createScreenplayDrawer: function() {
            var self = this;
            var contentHtml = [
                '<div class="amp-drawer-tabs">',
                '    <button type="button" class="amp-tab-btn active" data-tab="amp-tab-playbook">Screenplay Playbook</button>',
                '    <button type="button" class="amp-tab-btn" data-tab="amp-tab-vitals">Live Script Vitals</button>',
                '</div>',
                '<div id="amp-tab-playbook" class="amp-drawer-tab-content active">',
                '    <div class="amp-guide-section">',
                '        <h4 class="amp-guide-title">Import Screenplay PDF</h4>',
                '        <div class="amp-guide-item amp-guide-import-card">',
                '            <div class="amp-guide-badge" style="justify-content: space-between;">',
                '                <span>PDF / Shooting Script</span>',
                '                <button type="button" class="amp-guide-import-btn" id="amp-drawer-import-btn">Select PDF</button>',
                '            </div>',
                '            <p>Upload any PDF screenplay or shooting script. The engine automatically indexes scenes, speaking cast, page eighths, runtime, and production elements.</p>',
                '        </div>',
                '    </div>',
                '    <div class="amp-guide-section">',
                '        <h4 class="amp-guide-title">Sluglines & Scene Setup</h4>',
                '        <div class="amp-guide-item">',
                '            <div class="amp-guide-badge">',
                '                <code>INT.</code> / <code>EXT.</code>',
                '                <span>Scene Headings</span>',
                '            </div>',
                '            <p>Start any line with <code>INT.</code> or <code>EXT.</code> to define a scene. The engine autodetects day, night, interior, and exterior settings.</p>',
                '        </div>',
                '        <div class="amp-guide-item">',
                '            <div class="amp-guide-badge">',
                '                <code>/</code>',
                '                <span>Compound Sub-Locations</span>',
                '            </div>',
                '            <p>Type a slash after a primary location (e.g., <code>INT. FORD MANSION /</code>) to instantly autocomplete sub-rooms like PARLOR, BEDROOM, or KITCHEN.</p>',
                '        </div>',
                '        <div class="amp-guide-item">',
                '            <div class="amp-guide-badge">',
                '                <code>- </code>',
                '                <span>Lighting & Time of Day</span>',
                '            </div>',
                '            <p>Type a hyphen or space after your location to autocomplete standard times: DAY, NIGHT, DAWN, DUSK, LATER, CONTINUOUS, or SAME.</p>',
                '        </div>',
                '        <div class="amp-guide-item">',
                '            <div class="amp-guide-badge">',
                '                <kbd>Enter</kbd>',
                '                <span>Double-Break to Action</span>',
                '            </div>',
                '            <p>Pressing Enter at the end of a scene heading automatically formats Hollywood paragraph spacing down to Scene Description (Action).</p>',
                '        </div>',
                '    </div>',
                '    <div class="amp-guide-section">',
                '        <h4 class="amp-guide-title">Characters & Continuity</h4>',
                '        <div class="amp-guide-item">',
                '            <div class="amp-guide-badge">',
                '                <code>UPPERCASE</code>',
                '                <span>Character Cues</span>',
                '            </div>',
                '            <p>Type a character name in ALL CAPS. The engine automatically indexes them into your script\'s speaking cast roster.</p>',
                '        </div>',
                '        <div class="amp-guide-item">',
                '            <div class="amp-guide-badge">',
                '                <kbd>Tab</kbd>',
                '                <span>Extensions & Wrylies</span>',
                '            </div>',
                '            <p>Press Tab on any Character Cue to select dialogue extensions: <code>(CONT\'D)</code>, <code>(O.S.)</code>, <code>(V.O.)</code>, or parenthetical cues like <code>(beat)</code>, <code>(sotto)</code>, and <code>(whispering)</code>.</p>',
                '        </div>',
                '        <div class="amp-guide-item">',
                '            <div class="amp-guide-badge">',
                '                <kbd>Tab</kbd>',
                '                <span>Character Insertion</span>',
                '            </div>',
                '            <p>Press Tab on any blank line or action description to bring up your cast roster and insert a speaker instantly without retyping.</p>',
                '        </div>',
                '    </div>',
                '    <div class="amp-guide-section">',
                '        <h4 class="amp-guide-title">Dialogue & Direction</h4>',
                '        <div class="amp-guide-item">',
                '            <div class="amp-guide-badge">',
                '                <kbd>(</kbd>',
                '                <span>Actor Delivery (Wrylies)</span>',
                '            </div>',
                '            <p>Type an opening parenthesis under a character name to write an actor instruction. Pressing Enter automatically closes the parenthesis and drops to the dialogue line.</p>',
                '        </div>',
                '        <div class="amp-guide-item">',
                '            <div class="amp-guide-badge">',
                '                <kbd>Enter</kbd>',
                '                <span>Dialogue to Action Transition</span>',
                '            </div>',
                '            <p>Pressing Enter at the end of dialogue creates a standard Hollywood double break directly into Scene Description (Action).</p>',
                '        </div>',
                '    </div>',
                '    <div class="amp-guide-section">',
                '        <h4 class="amp-guide-title">Hollywood Production Engine</h4>',
                '        <div class="amp-guide-item">',
                '            <div class="amp-guide-badge">',
                '                <code>ALL CAPS</code>',
                '                <span>Dynamic Asset Breakdown</span>',
                '            </div>',
                '            <p>Objects and cues capitalized in action lines (e.g., VIOLIN, WHIP, CARRIAGE, GUNSHOT) are automatically cataloged into Props, Sound FX, Vehicles, and Wardrobe.</p>',
                '        </div>',
                '        <div class="amp-guide-item">',
                '            <div class="amp-guide-badge">',
                '                <code>1/8 pgs</code>',
                '                <span>Page Eighths & Screen Runtime</span>',
                '            </div>',
                '            <p>Industry-standard measurement: every scene is tracked in eighths of a page (~6.75 lines per eighth). Screen runtime estimates 1 page = 1 minute of film.</p>',
                '        </div>',
                '        <div class="amp-guide-item">',
                '            <div class="amp-guide-badge">',
                '                <kbd>Ctrl</kbd> + <kbd>/</kbd>',
                '                <span>Toggle Playbook & Vitals</span>',
                '            </div>',
                '            <p>Click the status pill at the bottom-right or press Ctrl+/ (or Cmd+/) at any time to open this guide and inspect live script vitals.</p>',
                '        </div>',
                '    </div>',
                '</div>',
                '<div id="amp-tab-vitals" class="amp-drawer-tab-content">',
                '</div>'
            ].join( '\n' );

            if ( this.api && typeof this.api.createDrawer === 'function' ) {
                this.drawer = this.api.createDrawer( {
                    id: 'andika-screenplay-drawer',
                    className: 'amp-drawer',
                    title: 'Screenplay Playbook & Live Vitals',
                    width: '440px',
                    contentHtml: contentHtml,
                    onOpen: function() {
                        self.updateDrawerVitals();
                    }
                } );
            } else {
                var drawer = document.createElement( 'div' );
                drawer.id = 'andika-screenplay-drawer';
                drawer.className = 'andika-drawer amp-drawer';
                drawer.style.width = '440px';
                drawer.innerHTML = [
                    '<div class="andika-drawer-header">',
                    '    <div class="andika-drawer-title-wrap">',
                    '        <h3 class="andika-drawer-title">Screenplay Playbook & Live Vitals</h3>',
                    '    </div>',
                    '    <button type="button" class="andika-drawer-close-btn" title="Close (Esc)">&times;</button>',
                    '</div>',
                    '<div class="andika-drawer-body">',
                    contentHtml,
                    '</div>'
                ].join( '' );

                var screenEl = document.getElementById( 'script-writer-screen' ) || document.body;
                screenEl.appendChild( drawer );

                var closeBtn = drawer.querySelector( '.andika-drawer-close-btn' );
                var bodyEl = drawer.querySelector( '.andika-drawer-body' );

                function openDrawer() {
                    drawer.classList.add( 'active' );
                    self.updateDrawerVitals();
                }
                function closeDrawer() {
                    drawer.classList.remove( 'active' );
                }
                function toggleDrawer() {
                    if ( drawer.classList.contains( 'active' ) ) closeDrawer();
                    else openDrawer();
                }

                closeBtn.addEventListener( 'click', closeDrawer );
                document.addEventListener( 'keydown', function( e ) {
                    if ( e.key === 'Escape' && drawer.classList.contains( 'active' ) ) closeDrawer();
                } );

                this.drawer = {
                    element: drawer,
                    body: bodyEl,
                    open: openDrawer,
                    close: closeDrawer,
                    toggle: toggleDrawer,
                    isOpen: function() { return drawer.classList.contains( 'active' ); }
                };
            }

            // Wire up close button, outside clicks, and tabs inside drawer
            if ( this.drawer && this.drawer.element ) {
                var closeBtn = this.drawer.element.querySelector( '.andika-drawer-close-btn' );
                if ( closeBtn ) {
                    closeBtn.addEventListener( 'click', function( e ) {
                        if ( e ) {
                            e.preventDefault();
                            e.stopPropagation();
                        }
                        if ( typeof self.drawer.close === 'function' ) {
                            self.drawer.close();
                        }
                    } );
                    closeBtn.addEventListener( 'pointerdown', function( e ) {
                        if ( e ) e.stopPropagation();
                    } );
                }

                // Click outside drawer on canvas to close
                document.addEventListener( 'mousedown', function( e ) {
                    if ( self.drawer && typeof self.drawer.isOpen === 'function' && self.drawer.isOpen() ) {
                        if ( ! self.drawer.element.contains( e.target ) && ( ! self.pill || ! self.pill.contains( e.target ) ) ) {
                            self.drawer.close();
                        }
                    }
                } );

                var tabBtns = this.drawer.element.querySelectorAll( '.amp-tab-btn' );
                var tabContents = this.drawer.element.querySelectorAll( '.amp-drawer-tab-content' );

                tabBtns.forEach( function( btn ) {
                    btn.addEventListener( 'click', function() {
                        var targetId = btn.getAttribute( 'data-tab' );
                        tabBtns.forEach( function( b ) { b.classList.remove( 'active' ); } );
                        tabContents.forEach( function( c ) { c.classList.remove( 'active' ); } );

                        btn.classList.add( 'active' );
                        var targetContent = self.drawer.element.querySelector( '#' + targetId );
                        if ( targetContent ) {
                            targetContent.classList.add( 'active' );
                        }
                        if ( targetId === 'amp-tab-vitals' ) {
                            self.updateDrawerVitals();
                        }
                    } );
                } );

                var importBtn = this.drawer.element.querySelector( '#amp-drawer-import-btn' );
                if ( importBtn ) {
                    importBtn.addEventListener( 'click', function( e ) {
                        e.preventDefault();
                        var fileInput = document.getElementById( 'script-writer-import-file' );
                        if ( fileInput ) {
                            fileInput.click();
                        }
                    } );
                }
            }
        },

        toggleScreenplayDrawer: function() {
            if ( ! this.drawer ) {
                this.createScreenplayDrawer();
            }
            if ( this.drawer && typeof this.drawer.toggle === 'function' ) {
                this.drawer.toggle();
            }
        },

        openScreenplayDrawerToVitals: function() {
            if ( ! this.drawer ) {
                this.createScreenplayDrawer();
            }
            if ( this.drawer && this.drawer.element ) {
                var tabBtns = this.drawer.element.querySelectorAll( '.amp-tab-btn' );
                var tabContents = this.drawer.element.querySelectorAll( '.amp-drawer-tab-content' );
                tabBtns.forEach( function( b ) {
                    if ( b.getAttribute( 'data-tab' ) === 'amp-tab-vitals' ) b.classList.add( 'active' );
                    else b.classList.remove( 'active' );
                } );
                tabContents.forEach( function( c ) {
                    if ( c.id === 'amp-tab-vitals' ) c.classList.add( 'active' );
                    else c.classList.remove( 'active' );
                } );
                if ( typeof this.drawer.open === 'function' ) {
                    this.drawer.open();
                }
                this.updateDrawerVitals();
            }
        },

        updateDrawerVitals: function() {
            var vitalsContainer = document.getElementById( 'amp-tab-vitals' );
            if ( ! vitalsContainer ) return;

            var text = ( this.textarea && this.textarea.value ) ? this.textarea.value : '';
            var data = ScreenplayEngine.parse( text );
            this.scriptData = data;

            if ( ! data.scenes.length && ! data.characterList.length ) {
                vitalsContainer.innerHTML = '<div class="amp-vitals-empty">No screenplay elements detected yet. Start writing with a scene heading (e.g. <code>INT. PARLOR - DAY</code>) to view live vitals.</div>';
                return;
            }

            var html = [];

            // 1. Executive Summary Grid
            html.push( '<div class="amp-vitals-grid">' );
            html.push( '   <div class="amp-vitals-card">' );
            html.push( '       <div class="amp-vcard-num">' + ( data.runtime ? data.runtime.timeStr : '0 sec' ) + '</div>' );
            html.push( '       <div class="amp-vcard-label">Screen Runtime</div>' );
            html.push( '   </div>' );
            html.push( '   <div class="amp-vitals-card">' );
            html.push( '       <div class="amp-vcard-num">' + ( data.runtime ? data.runtime.pages : '0' ) + ' pgs</div>' );
            html.push( '       <div class="amp-vcard-label">Script Pages</div>' );
            html.push( '   </div>' );
            html.push( '   <div class="amp-vitals-card">' );
            html.push( '       <div class="amp-vcard-num">' + data.totalScenes + '</div>' );
            html.push( '       <div class="amp-vcard-label">Total Scenes</div>' );
            html.push( '   </div>' );
            html.push( '   <div class="amp-vitals-card">' );
            html.push( '       <div class="amp-vcard-num">' + data.characterList.length + '</div>' );
            html.push( '       <div class="amp-vcard-label">Speaking Cast</div>' );
            html.push( '   </div>' );
            html.push( '</div>' );

            // 2. Cast Speaking Distribution
            var totalDialogue = 0;
            data.characterList.forEach( function( name ) {
                totalDialogue += ( data.characters[ name ].dialogueCount || 0 );
            } );

            var sortedCharacters = data.characterList.slice().sort( function( a, b ) {
                return ( data.characters[ b ].dialogueCount || 0 ) - ( data.characters[ a ].dialogueCount || 0 );
            } );

            html.push( '<div class="amp-vitals-section">' );
            html.push( '   <h4 class="amp-vitals-title">Cast & Speaking Distribution</h4>' );
            if ( sortedCharacters.length === 0 ) {
                html.push( '   <div class="amp-vitals-empty">No speaking characters detected yet.</div>' );
            } else {
                html.push( '   <div class="amp-cast-list">' );
                sortedCharacters.forEach( function( name ) {
                    var ch = data.characters[ name ];
                    var count = ch.dialogueCount || 0;
                    var pct = totalDialogue > 0 ? Math.round( ( count / totalDialogue ) * 100 ) : 0;
                    var scenesStr = ch.scenes.length + ( ch.scenes.length === 1 ? ' scene' : ' scenes' );
                    html.push( '       <div class="amp-cast-row">' );
                    html.push( '           <div class="amp-cast-header">' );
                    html.push( '               <span class="amp-cast-name">' + name + '</span>' );
                    html.push( '               <span class="amp-cast-count">' + scenesStr + ' · ' + count + ' lines (' + pct + '%)</span>' );
                    html.push( '           </div>' );
                    html.push( '           <div class="amp-cast-bar-track">' );
                    html.push( '               <div class="amp-cast-bar-fill" style="width: ' + pct + '%;"></div>' );
                    html.push( '           </div>' );
                    html.push( '       </div>' );
                } );
                html.push( '   </div>' );
            }
            html.push( '</div>' );

            // 3. Cataloged Production Elements
            var catConfigs = [
                { key: 'Props', title: 'Props & Key Items', dot: 'amp-dot-props' },
                { key: 'AudioFX', title: 'Sound Effects & Audio Cues', dot: 'amp-dot-audio' },
                { key: 'Vehicles', title: 'Vehicles & Animals', dot: 'amp-dot-vehicle' },
                { key: 'Wardrobe', title: 'Wardrobe & Costumes', dot: 'amp-dot-wardrobe' }
            ];

            var hasAnyElements = false;
            var elementsHtml = [];
            catConfigs.forEach( function( cfg ) {
                var elems = data.elements && data.elements[ cfg.key ] ? Object.keys( data.elements[ cfg.key ] ) : [];
                if ( elems.length > 0 ) {
                    hasAnyElements = true;
                    elementsHtml.push( '   <div class="amp-elem-category">' );
                    elementsHtml.push( '       <div class="amp-elem-cat-header">' );
                    elementsHtml.push( '           <span class="amp-strip-dot ' + cfg.dot + '"></span>' );
                    elementsHtml.push( '           <span class="amp-elem-cat-title">' + cfg.title + ' (' + elems.length + ')</span>' );
                    elementsHtml.push( '       </div>' );
                    elementsHtml.push( '       <div class="amp-elem-tags">' );
                    elems.forEach( function( elName ) {
                        var scCount = data.elements[ cfg.key ][ elName ].scenes.length;
                        elementsHtml.push( '           <span class="amp-elem-tag">' + elName + ' <small>(' + scCount + ' sc)</small></span>' );
                    } );
                    elementsHtml.push( '       </div>' );
                    elementsHtml.push( '   </div>' );
                }
            } );

            html.push( '<div class="amp-vitals-section">' );
            html.push( '   <h4 class="amp-vitals-title">Production Elements Breakdown</h4>' );
            if ( ! hasAnyElements ) {
                html.push( '   <div class="amp-vitals-empty">No production elements cataloged yet. Capitalized physical objects or sound cues in action lines (e.g. VIOLIN, WHIP, GUNSHOT) are automatically tracked here.</div>' );
            } else {
                html.push( elementsHtml.join( '\n' ) );
            }
            html.push( '</div>' );

            // 4. Scene Stripboard
            html.push( '<div class="amp-vitals-section">' );
            html.push( '   <h4 class="amp-vitals-title">Scene Stripboard (' + data.scenes.length + ')</h4>' );
            if ( data.scenes.length === 0 ) {
                html.push( '   <div class="amp-vitals-empty">No scenes recorded yet.</div>' );
            } else {
                html.push( '   <div class="amp-stripboard-list">' );
                data.scenes.forEach( function( sc ) {
                    var isExt = sc.setting === 'EXT';
                    var isNight = ( sc.time.indexOf( 'NIGHT' ) !== -1 || sc.time.indexOf( 'DUSK' ) !== -1 || sc.time.indexOf( 'EVENING' ) !== -1 );
                    var dotClass = 'amp-dot-scene-int-day';
                    if ( isExt && isNight ) dotClass = 'amp-dot-scene-ext-night';
                    else if ( isExt && ! isNight ) dotClass = 'amp-dot-scene-ext-day';
                    else if ( ! isExt && isNight ) dotClass = 'amp-dot-scene-int-night';

                    html.push( '       <div class="amp-strip-row">' );
                    html.push( '           <div class="amp-strip-left">' );
                    html.push( '               <span class="amp-strip-dot ' + dotClass + '"></span>' );
                    html.push( '               <span class="amp-strip-num">#' + sc.number + '</span>' );
                    html.push( '               <span class="amp-strip-slug" title="' + ( sc.setting + '. ' + sc.location + ' - ' + sc.time ) + '">' + sc.setting + '. ' + sc.location + ' - ' + sc.time + '</span>' );
                    html.push( '           </div>' );
                    html.push( '           <span class="amp-strip-eighths">' + sc.eighths + '</span>' );
                    html.push( '       </div>' );
                } );
                html.push( '   </div>' );
            }
            html.push( '</div>' );

            vitalsContainer.innerHTML = html.join( '\n' );
        },

        // =====================================================================
        // 5. 12YAS FILMSCRIPT & SIDES EXPORT ENGINE
        // =====================================================================
        escapeHtml: function( str ) {
            if ( ! str ) return '';
            return String( str )
                .replace( /&/g, '&amp;' )
                .replace( /</g, '&lt;' )
                .replace( />/g, '&gt;' )
                .replace( /"/g, '&quot;' )
                .replace( /'/g, '&#039;' );
        },

        unescapeHtml: function( str ) {
            if ( ! str ) return '';
            var txt = document.createElement( 'textarea' );
            txt.innerHTML = str;
            return txt.value;
        },

        formatInlineMarkdown: function( text ) {
            if ( ! text ) return '';
            var esc = this.escapeHtml( text );
            esc = esc.replace( /\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>' );
            esc = esc.replace( /\*\*(.*?)\*\*/g, '<strong>$1</strong>' );
            esc = esc.replace( /\*(.*?)\*/g, '<em>$1</em>' );
            esc = esc.replace( /_([^_]+)_/g, '<u>$1</u>' );
            esc = esc.replace( /`([^`]+)`/g, '<code class="sc-code">$1</code>' );
            return esc;
        },

        parseRangeString: function( str ) {
            var set = new Set();
            if ( ! str || ! str.trim() ) return set;
            var parts = str.split( ',' );
            parts.forEach( function( part ) {
                var p = part.trim();
                if ( ! p ) return;
                var dashMatch = p.match( /^(\d+)\s*-\s*(\d+)$/ );
                if ( dashMatch ) {
                    var from = parseInt( dashMatch[1], 10 );
                    var to = parseInt( dashMatch[2], 10 );
                    if ( ! isNaN( from ) && ! isNaN( to ) ) {
                        var start = Math.min( from, to );
                        var end = Math.max( from, to );
                        for ( var k = start; k <= end; k++ ) {
                            set.add( String( k ) );
                        }
                    }
                } else {
                    var singleMatch = p.match( /^#?(\d+[A-Z]?)$/i );
                    if ( singleMatch ) {
                        set.add( singleMatch[1] );
                    }
                }
            } );
            return set;
        },

        formatRangeString: function( numbers ) {
            if ( ! numbers || numbers.length === 0 ) return '';
            var pureNums = [];
            var alphaNums = [];
            numbers.forEach( function( n ) {
                var num = parseInt( n, 10 );
                if ( ! isNaN( num ) && String( num ) === String( n ) ) {
                    pureNums.push( num );
                } else {
                    alphaNums.push( String( n ) );
                }
            } );

            pureNums.sort( function( a, b ) { return a - b; } );
            alphaNums.sort();

            var ranges = [];
            if ( pureNums.length > 0 ) {
                var start = pureNums[0];
                var prev = pureNums[0];
                for ( var i = 1; i < pureNums.length; i++ ) {
                    if ( pureNums[i] === prev + 1 ) {
                        prev = pureNums[i];
                    } else {
                        if ( start === prev ) ranges.push( String( start ) );
                        else if ( prev === start + 1 ) ranges.push( start + ', ' + prev );
                        else ranges.push( start + '-' + prev );
                        start = pureNums[i];
                        prev = pureNums[i];
                    }
                }
                if ( start === prev ) ranges.push( String( start ) );
                else if ( prev === start + 1 ) ranges.push( start + ', ' + prev );
                else ranges.push( start + '-' + prev );
            }

            if ( alphaNums.length > 0 ) {
                ranges.push( alphaNums.join( ', ' ) );
            }

            return ranges.join( ', ' );
        },

        setupSidesExportUi: function( context ) {
            var self = this;
            var text = ( context && typeof context.content === 'string' ) ? context.content : ( ( this.textarea && this.textarea.value ) || '' );
            var data = ScreenplayEngine.parse( text );
            this.activeExportData = data;

            // Reveal Scope Switcher
            var scopeWrap = document.getElementById( 'sw-export-scope-wrap' );
            if ( scopeWrap ) {
                scopeWrap.style.display = 'block';
            }

            var fullBtn = document.getElementById( 'sw-scope-full-btn' );
            var sidesBtn = document.getElementById( 'sw-scope-sides-btn' );
            var sidesPanel = document.getElementById( 'sw-sides-options-panel' );
            var charSelect = document.getElementById( 'sw-sides-char-select' );
            var rangeInput = document.getElementById( 'sw-sides-range-input' );
            var selectAllBtn = document.getElementById( 'sw-sides-select-all' );
            var deselectAllBtn = document.getElementById( 'sw-sides-deselect-all' );
            var checklistEl = document.getElementById( 'sw-sides-scene-checklist' );
            var optHighlight = document.getElementById( 'sw-sides-opt-highlight' );
            var optSlip = document.getElementById( 'sw-sides-opt-slip' );
            var slipFields = document.getElementById( 'sw-sides-slip-fields' );
            var dayInput = document.getElementById( 'sw-sides-day-input' );
            var targetInput = document.getElementById( 'sw-sides-target-input' );

            if ( ! this.sidesState ) {
                this.sidesState = {
                    scope: 'full',
                    selectedScenes: new Set(),
                    targetCharacter: '',
                    highlightTarget: false,
                    includeSidesSlip: true,
                    dayNote: '',
                    recipient: ''
                };
            }

            // Sync Scope buttons & panel
            function applyScope( newScope ) {
                self.sidesState.scope = newScope;
                if ( newScope === 'sides' ) {
                    if ( sidesBtn ) sidesBtn.classList.add( 'active' );
                    if ( fullBtn ) fullBtn.classList.remove( 'active' );
                    if ( sidesPanel ) sidesPanel.style.display = 'flex';
                } else {
                    if ( fullBtn ) fullBtn.classList.add( 'active' );
                    if ( sidesBtn ) sidesBtn.classList.remove( 'active' );
                    if ( sidesPanel ) sidesPanel.style.display = 'none';
                }
                if ( context && typeof context.updatePreview === 'function' ) {
                    context.updatePreview();
                }
            }

            if ( fullBtn ) {
                fullBtn.onclick = function() { applyScope( 'full' ); };
            }
            if ( sidesBtn ) {
                sidesBtn.onclick = function() { applyScope( 'sides' ); };
            }

            // Populate Speaking Characters
            if ( charSelect ) {
                var prevChar = charSelect.value || self.sidesState.targetCharacter || '';
                var charHtml = '<option value="">— All Speaking Cast —</option>';
                var sortedChars = ( data.characterList || [] ).slice().sort();
                sortedChars.forEach( function( c ) {
                    var scCount = ( data.characters[ c ] && data.characters[ c ].scenes ) ? data.characters[ c ].scenes.length : 0;
                    charHtml += '<option value="' + self.escapeHtml( c ) + '">' + self.escapeHtml( c ) + ' (' + scCount + ' scenes)</option>';
                } );
                charSelect.innerHTML = charHtml;
                if ( prevChar && data.characters[ prevChar ] ) {
                    charSelect.value = prevChar;
                }
            }

            // Populate Scene Checklist
            if ( checklistEl ) {
                var listHtml = '';
                if ( self.sidesState.selectedScenes.size === 0 && data.scenes.length > 0 ) {
                    data.scenes.forEach( function( sc ) {
                        self.sidesState.selectedScenes.add( String( sc.number ) );
                    } );
                }

                data.scenes.forEach( function( sc ) {
                    var isChecked = self.sidesState.selectedScenes.has( String( sc.number ) );
                    listHtml += '<label class="sw-sides-scene-item">' +
                        '<input type="checkbox" class="sw-sides-scene-cb" value="' + self.escapeHtml( sc.number ) + '"' + ( isChecked ? ' checked' : '' ) + ' />' +
                        '<span class="sw-sides-scene-num">#' + self.escapeHtml( sc.number ) + '</span>' +
                        '<span class="sw-sides-scene-slug" title="' + self.escapeHtml( sc.slugline ) + '">' + self.escapeHtml( sc.slugline ) + '</span>' +
                        '<span class="sw-sides-scene-length">' + self.escapeHtml( sc.eighths ) + '</span>' +
                    '</label>';
                } );
                checklistEl.innerHTML = listHtml;

                // Bind checkbox changes
                checklistEl.querySelectorAll( '.sw-sides-scene-cb' ).forEach( function( cb ) {
                    cb.onchange = function() {
                        var scNum = this.value;
                        if ( this.checked ) {
                            self.sidesState.selectedScenes.add( scNum );
                        } else {
                            self.sidesState.selectedScenes.delete( scNum );
                        }
                        self.syncSceneSelectionToInput();
                        if ( context && typeof context.updatePreview === 'function' ) {
                            context.updatePreview();
                        }
                    };
                } );
            }

            self.syncSceneSelectionToInput();

            // Bind Character Filter
            if ( charSelect ) {
                charSelect.onchange = function() {
                    var selectedChar = this.value;
                    self.sidesState.targetCharacter = selectedChar;
                    if ( selectedChar && data.characters[ selectedChar ] ) {
                        var charScenes = data.characters[ selectedChar ].scenes || [];
                        self.sidesState.selectedScenes.clear();
                        charScenes.forEach( function( num ) {
                            self.sidesState.selectedScenes.add( String( num ) );
                        } );

                        // Pre-populate target recipient and check dialogue highlight
                        if ( targetInput ) {
                            targetInput.value = selectedChar + ' SIDES';
                            self.sidesState.recipient = targetInput.value;
                        }
                        if ( optHighlight ) {
                            optHighlight.checked = true;
                            self.sidesState.highlightTarget = true;
                        }
                    } else {
                        // All Cast selected: check all scenes
                        data.scenes.forEach( function( sc ) {
                            self.sidesState.selectedScenes.add( String( sc.number ) );
                        } );
                    }

                    // Update checkboxes in DOM
                    if ( checklistEl ) {
                        checklistEl.querySelectorAll( '.sw-sides-scene-cb' ).forEach( function( cb ) {
                            cb.checked = self.sidesState.selectedScenes.has( cb.value );
                        } );
                    }

                    self.syncSceneSelectionToInput();
                    if ( context && typeof context.updatePreview === 'function' ) {
                        context.updatePreview();
                    }
                };
            }

            // Bind Range Input
            if ( rangeInput ) {
                rangeInput.oninput = function() {
                    var typedSet = self.parseRangeString( this.value );
                    self.sidesState.selectedScenes = typedSet;
                    if ( checklistEl ) {
                        checklistEl.querySelectorAll( '.sw-sides-scene-cb' ).forEach( function( cb ) {
                            cb.checked = typedSet.has( cb.value );
                        } );
                    }
                    self.updateSidesSelectedBadge();
                    if ( context && typeof context.updatePreview === 'function' ) {
                        context.updatePreview();
                    }
                };
            }

            // Bind Select All / Deselect All
            if ( selectAllBtn ) {
                selectAllBtn.onclick = function() {
                    data.scenes.forEach( function( sc ) {
                        self.sidesState.selectedScenes.add( String( sc.number ) );
                    } );
                    if ( checklistEl ) {
                        checklistEl.querySelectorAll( '.sw-sides-scene-cb' ).forEach( function( cb ) { cb.checked = true; } );
                    }
                    self.syncSceneSelectionToInput();
                    if ( context && typeof context.updatePreview === 'function' ) {
                        context.updatePreview();
                    }
                };
            }

            if ( deselectAllBtn ) {
                deselectAllBtn.onclick = function() {
                    self.sidesState.selectedScenes.clear();
                    if ( checklistEl ) {
                        checklistEl.querySelectorAll( '.sw-sides-scene-cb' ).forEach( function( cb ) { cb.checked = false; } );
                    }
                    self.syncSceneSelectionToInput();
                    if ( context && typeof context.updatePreview === 'function' ) {
                        context.updatePreview();
                    }
                };
            }

            // Bind Highlight option
            if ( optHighlight ) {
                optHighlight.onchange = function() {
                    self.sidesState.highlightTarget = this.checked;
                    if ( context && typeof context.updatePreview === 'function' ) {
                        context.updatePreview();
                    }
                };
            }

            // Bind Sides Slip option
            if ( optSlip ) {
                optSlip.onchange = function() {
                    self.sidesState.includeSidesSlip = this.checked;
                    if ( slipFields ) {
                        slipFields.style.display = this.checked ? 'block' : 'none';
                    }
                    if ( context && typeof context.updatePreview === 'function' ) {
                        context.updatePreview();
                    }
                };
            }

            // Bind Day Note and Recipient inputs
            if ( dayInput ) {
                dayInput.oninput = function() {
                    self.sidesState.dayNote = this.value;
                    if ( context && typeof context.updatePreview === 'function' ) {
                        context.updatePreview();
                    }
                };
            }
            if ( targetInput ) {
                targetInput.oninput = function() {
                    self.sidesState.recipient = this.value;
                    if ( context && typeof context.updatePreview === 'function' ) {
                        context.updatePreview();
                    }
                };
            }
        },

        syncSceneSelectionToInput: function() {
            var rangeInput = document.getElementById( 'sw-sides-range-input' );
            if ( rangeInput && this.sidesState && this.sidesState.selectedScenes ) {
                var arr = Array.from( this.sidesState.selectedScenes );
                rangeInput.value = this.formatRangeString( arr );
            }
            this.updateSidesSelectedBadge();
        },

        updateSidesSelectedBadge: function() {
            var badge = document.getElementById( 'sw-sides-selected-badge' );
            if ( ! badge ) return;
            var count = ( this.sidesState && this.sidesState.selectedScenes ) ? this.sidesState.selectedScenes.size : 0;
            var total = ( this.activeExportData && this.activeExportData.scenes ) ? this.activeExportData.scenes.length : 0;

            var totalLines = 0;
            if ( this.activeExportData && this.activeExportData.scenes ) {
                var set = this.sidesState.selectedScenes;
                this.activeExportData.scenes.forEach( function( sc ) {
                    if ( set.has( String( sc.number ) ) ) {
                        totalLines += ( sc.lineCount || 1 );
                    }
                } );
            }
            var eighthsStr = ScreenplayEngine.formatEighths( totalLines );
            badge.textContent = count + ' of ' + total + ' selected (' + eighthsStr + ')';
        },

        getSidesExportOptions: function() {
            if ( ! this.sidesState ) {
                return {};
            }
            return {
                scope: this.sidesState.scope || 'full',
                selectedScenes: Array.from( this.sidesState.selectedScenes || [] ),
                targetCharacter: this.sidesState.targetCharacter || '',
                highlightCharacter: !! this.sidesState.highlightTarget,
                includeSidesSlip: this.sidesState.includeSidesSlip !== false,
                sidesDay: this.sidesState.dayNote || '',
                sidesRecipient: this.sidesState.recipient || ''
            };
        },

        parseFilmscriptManuscript: function( rawText, options ) {
            options = options || {};
            var includeTitlePage = options.includeTitlePage !== false;
            var pageNumbers = options.pageNumbers !== false;
            var boldSlugs = options.boldSlugs !== false;
            var hideNotes = options.hideNotes !== false;
            var defaultTitle = options.title || 'Untitled';
            var scope = options.scope || 'full';
            var selectedScenesSet = new Set( ( options.selectedScenes || [] ).map( function( s ) { return String( s ); } ) );
            var highlightCharacter = !! options.highlightCharacter;
            var targetCharacter = ( options.targetCharacter || '' ).toUpperCase().trim();
            var includeSidesSlip = options.includeSidesSlip !== false;
            var sidesDay = options.sidesDay || '';
            var sidesRecipient = options.sidesRecipient || '';

            var cleanRaw = this.unescapeHtml( rawText || '' );
            var lines = cleanRaw.split( /\r?\n/ );

            var titlePageData = {
                title: defaultTitle,
                credit: 'Screenplay by',
                author: '',
                source: '',
                rights: '',
                date: new Date().toLocaleDateString( 'en-US', { month: 'numeric', day: 'numeric', year: '2-digit' } ),
                contact: '',
                forYourConsideration: false
            };

            var bodyLines = [];
            var inHeaderBlock = true;
            var i = 0;

            // Check for 12YAS style or Fountain front-matter at top
            var topTextSample = lines.slice( 0, 25 ).join( '\n' );
            if ( /FOR YOUR CONSIDERATION/i.test( topTextSample ) || /BEST ADAPTED SCREENPLAY/i.test( topTextSample ) ) {
                titlePageData.forYourConsideration = true;
                while ( i < lines.length ) {
                    var l = lines[i].trim();
                    if ( /^CARD:\s*/i.test( l ) || /^FADE\s+IN:?/i.test( l ) || /^(\d+\s+)?(INT|EXT)[\.\s\-]/i.test( l ) ) {
                        break;
                    }
                    if ( /^Screenplay by/i.test( l ) && i + 1 < lines.length ) {
                        titlePageData.credit = l;
                        titlePageData.author = lines[i + 1].trim();
                        i += 2;
                        continue;
                    }
                    if ( /ALL RIGHTS RESERVED/i.test( l ) ) {
                        var rightsArr = [ l ];
                        var rIdx = i + 1;
                        while ( rIdx < lines.length && lines[rIdx].trim() !== '' && ! /^CARD:/i.test( lines[rIdx].trim() ) && ! /^FADE\s+IN/i.test( lines[rIdx].trim() ) ) {
                            rightsArr.push( lines[rIdx].trim() );
                            rIdx++;
                        }
                        titlePageData.rights = rightsArr.join( ' ' );
                        i = rIdx;
                        continue;
                    }
                    if ( /^BEST ADAPTED SCREENPLAY/i.test( l ) && ( ! titlePageData.title || titlePageData.title === 'Untitled' ) ) {
                        titlePageData.title = defaultTitle && defaultTitle !== 'Untitled' ? defaultTitle : '12 Years A Slave';
                    }
                    i++;
                }
            } else {
                while ( i < lines.length && inHeaderBlock ) {
                    var l = lines[i].trim();
                    if ( l === '' ) {
                        inHeaderBlock = false;
                        i++;
                        break;
                    }
                    var metaMatch = l.match( /^(Title|Credit|Author|Authors|Source|Draft date|Date|Contact|Rights):\s*(.*)$/i );
                    if ( metaMatch ) {
                        var key = metaMatch[1].toLowerCase();
                        var val = metaMatch[2].trim();
                        if ( key === 'title' ) titlePageData.title = val;
                        else if ( key === 'credit' ) titlePageData.credit = val;
                        else if ( key === 'author' || key === 'authors' ) titlePageData.author = val;
                        else if ( key === 'source' ) titlePageData.source = val;
                        else if ( key === 'draft date' || key === 'date' ) titlePageData.date = val;
                        else if ( key === 'contact' ) titlePageData.contact = val;
                        else if ( key === 'rights' ) titlePageData.rights = val;
                        i++;
                    } else {
                        inHeaderBlock = false;
                        break;
                    }
                }
            }

            for ( ; i < lines.length; i++ ) {
                bodyLines.push( lines[i] );
            }

            var slugRegex = /^(\.?)(INT|EXT|INT\/EXT|EXT\/INT|I\/E|EST)[\.\s\-]/i;
            var transRegex = /^((CUT|FADE|DISSOLVE|SMASH CUT|MATCH CUT|JUMP CUT|WIPE)\s+TO:?|FADE\s+(OUT|IN)\.?|FADE\s+TO\s+BLACK\.?|>.*<|BLACK)$/i;

            var html = '';

            // 1. Title Page / Sides Slip
            if ( scope === 'sides' ) {
                if ( includeSidesSlip ) {
                    var parsedInfo = ScreenplayEngine.parse( rawText );
                    var activeScenesList = parsedInfo.scenes.filter( function( sc ) {
                        return selectedScenesSet.has( String( sc.number ) );
                    } );
                    var totalLinesSelected = 0;
                    activeScenesList.forEach( function( sc ) { totalLinesSelected += ( sc.lineCount || 1 ); } );
                    var totalLengthStr = ScreenplayEngine.formatEighths( totalLinesSelected );
                    var scNumbersList = activeScenesList.map( function( sc ) { return '#' + sc.number; } ).join( ', ' ) || 'None';

                    html += '<div class="sc-sides-slip">' +
                        '<div class="sc-sides-slip-header">' +
                            '<div class="sc-sides-slip-title">' + this.escapeHtml( titlePageData.title || defaultTitle ) + '</div>' +
                            '<div class="sc-sides-slip-sub">PRODUCTION SIDES COVER SHEET</div>' +
                        '</div>' +
                        '<div class="sc-sides-slip-meta">' +
                            '<div class="sc-sides-slip-row">' +
                                '<span class="sc-sides-slip-label">Recipient / Cast</span>' +
                                '<span class="sc-sides-slip-val">' + this.escapeHtml( sidesRecipient || ( targetCharacter ? targetCharacter + ' SIDES' : 'Cast & Crew' ) ) + '</span>' +
                            '</div>' +
                            '<div class="sc-sides-slip-row">' +
                                '<span class="sc-sides-slip-label">Call Sheet Day</span>' +
                                '<span class="sc-sides-slip-val">' + this.escapeHtml( sidesDay || 'Main Unit Shooting' ) + '</span>' +
                            '</div>' +
                            '<div class="sc-sides-slip-row">' +
                                '<span class="sc-sides-slip-label">Date</span>' +
                                '<span class="sc-sides-slip-val">' + this.escapeHtml( titlePageData.date || new Date().toLocaleDateString() ) + '</span>' +
                            '</div>' +
                            '<div class="sc-sides-slip-row">' +
                                '<span class="sc-sides-slip-label">Selected Scenes</span>' +
                                '<span class="sc-sides-slip-val">' + activeScenesList.length + ' scenes (' + totalLengthStr + ')</span>' +
                            '</div>' +
                        '</div>' +
                        '<div class="sc-sides-slip-scenes">' +
                            '<strong>Included Scenes:</strong> ' + this.escapeHtml( scNumbersList ) +
                        '</div>' +
                    '</div><div class="sc-page-break"></div>';
                }
            } else if ( includeTitlePage ) {
                html += '<div class="sc-title-page">';
                if ( titlePageData.forYourConsideration ) {
                    html += '  <div class="sc-title-top">F O R &nbsp; Y O U R &nbsp; C O N S I D E R A T I O N</div>';
                }
                html += '  <div class="sc-title-center">';
                html += '    <div class="sc-title-text">' + this.escapeHtml( titlePageData.title || defaultTitle ) + '</div>';
                if ( titlePageData.credit ) {
                    html += '    <div class="sc-title-credit">' + this.escapeHtml( titlePageData.credit ) + '</div>';
                }
                if ( titlePageData.author ) {
                    html += '    <div class="sc-title-author">' + this.escapeHtml( titlePageData.author ) + '</div>';
                }
                if ( titlePageData.source ) {
                    html += '    <div class="sc-title-credit">' + this.escapeHtml( titlePageData.source ) + '</div>';
                }
                html += '  </div>';
                html += '  <div class="sc-title-bottom">';
                if ( titlePageData.rights ) {
                    html += '    <div class="sc-title-rights">' + this.escapeHtml( titlePageData.rights ) + '</div>';
                }
                html += '    <div class="sc-title-meta-row">';
                html += '      <div>' + ( titlePageData.date ? this.escapeHtml( titlePageData.date ) : '' ) + '</div>';
                html += '      <div>' + ( titlePageData.contact ? this.escapeHtml( titlePageData.contact ) : '' ) + '</div>';
                html += '    </div>';
                html += '  </div>';
                html += '</div>';
            }

            var inDialogue = false;
            var currentCharacterName = '';
            var lineIdx = 0;
            var currentSceneNum = '';
            var currentSceneCount = 0;
            var isCurrentSceneSelected = ( scope !== 'sides' );
            var currentDraftDate = '1/24/13';
            var currentDraftTitle = 'FINAL SHOOTING SCRIPT';
            var hasEmbeddedPages = false;

            while ( lineIdx < bodyLines.length ) {
                var cur = bodyLines[lineIdx].trim();

                if ( cur === '' ) {
                    inDialogue = false;
                    lineIdx++;
                    continue;
                }

                // Embedded Page Header
                var headerMatch = cur.match( /^(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+)$/ );
                if ( headerMatch ) {
                    var dateVal = headerMatch[1];
                    var titleVal = headerMatch[2].trim();
                    var pageNumVal = '';
                    if ( lineIdx + 1 < bodyLines.length && /^\d+[A-Z]?\.$/.test( bodyLines[lineIdx + 1].trim() ) ) {
                        pageNumVal = bodyLines[lineIdx + 1].trim();
                        lineIdx++;
                    }
                    hasEmbeddedPages = true;
                    currentDraftDate = dateVal;
                    currentDraftTitle = titleVal;

                    if ( isCurrentSceneSelected ) {
                        html += '<div class="sc-page-break"></div>';
                        if ( pageNumbers ) {
                            html += '<div class="sc-page-header">' +
                                '<span class="sc-header-date">' + this.escapeHtml( currentDraftDate ) + '</span>' +
                                '<span class="sc-header-title">' + this.escapeHtml( currentDraftTitle ) + '</span>' +
                                '<span class="sc-header-page">' + this.escapeHtml( pageNumVal ) + '</span>' +
                            '</div>';
                        }
                    }
                    inDialogue = false;
                    lineIdx++;
                    continue;
                }

                // Bottom-of-page continuation
                if ( /^\(?CONTINUED\)?$/i.test( cur ) && ( cur.toUpperCase() === '(CONTINUED)' || cur.toUpperCase() === '(CONTINUED' ) ) {
                    if ( isCurrentSceneSelected ) {
                        html += '<div class="sc-page-footer-continued">(CONTINUED)</div>';
                    }
                    inDialogue = false;
                    lineIdx++;
                    continue;
                }

                // Dialogue continuation marker (MORE)
                if ( /^\(?MORE\)?$/i.test( cur ) ) {
                    if ( isCurrentSceneSelected ) {
                        html += '<div class="sc-more">(MORE)</div>';
                    }
                    inDialogue = false;
                    lineIdx++;
                    continue;
                }

                // Scene Continuation Header
                var contMatch = cur.match( /^(?:(\d+[A-Z]?)\s+)?CONTINUED:?\s*(\(?\d*\)?)?(?:\s+(\d+[A-Z]?))?$/i );
                if ( contMatch || ( cur.toUpperCase().indexOf( 'CONTINUED:' ) === 0 ) ) {
                    inDialogue = false;
                    var contSceneNum = ( contMatch && contMatch[1] ) ? contMatch[1] : '';
                    var contSuffix = ( contMatch && contMatch[2] ) ? contMatch[2].trim() : '';
                    if ( contSuffix && ! contSuffix.endsWith( ')' ) ) {
                        contSuffix += ')';
                    }
                    var nextJ = lineIdx + 1;
                    var trailingNums = [];
                    while ( nextJ < bodyLines.length && /^\d+[A-Z]?$/.test( bodyLines[nextJ].trim() ) && trailingNums.length < 2 ) {
                        trailingNums.push( bodyLines[nextJ].trim() );
                        nextJ++;
                    }
                    if ( trailingNums.length > 0 ) {
                        contSceneNum = contSceneNum || trailingNums[0];
                        lineIdx = nextJ - 1;
                    }
                    contSceneNum = contSceneNum || currentSceneNum;
                    var contText = 'CONTINUED:' + ( contSuffix ? ' ' + contSuffix : '' );

                    if ( isCurrentSceneSelected ) {
                        html += '<div class="sc-slugline sc-continued-line">' +
                            ( contSceneNum ? '<span class="sc-scene-num sc-num-left">' + this.escapeHtml( contSceneNum ) + '</span>' : '' ) +
                            '<span class="sc-slugline-content">' + this.escapeHtml( contText ) + '</span>' +
                            ( contSceneNum ? '<span class="sc-scene-num sc-num-right">' + this.escapeHtml( contSceneNum ) + '</span>' : '' ) +
                        '</div>';
                    }
                    lineIdx++;
                    continue;
                }

                // Scene Heading / Slugline (# or INT./EXT. or with scene numbers)
                var isSlugline = cur.startsWith( '# ' ) || cur.startsWith( '## ' ) || cur.startsWith( '### ' ) ||
                    slugRegex.test( cur ) || cur.startsWith( '.INT' ) || cur.startsWith( '.EXT' );
                var slugWithNumMatch = cur.match( /^(?:(\d+[A-Z]?)\s+)?(INT|EXT|INT\/EXT|EXT\/INT|I\/E|EST)[\.\s\-].*?(?:\s+(\d+[A-Z]?))?$/i );

                if ( isSlugline || slugWithNumMatch ) {
                    inDialogue = false;
                    currentSceneCount++;
                    var leftNum = '';
                    var rightNum = '';
                    var cleanSlug = cur.replace( /^#+\s*/, '' );

                    if ( slugWithNumMatch ) {
                        leftNum = slugWithNumMatch[1] || '';
                        rightNum = slugWithNumMatch[3] || '';
                    }

                    if ( leftNum && cleanSlug.startsWith( leftNum ) ) {
                        cleanSlug = cleanSlug.substring( leftNum.length ).trim();
                    }
                    if ( rightNum && cleanSlug.endsWith( rightNum ) ) {
                        cleanSlug = cleanSlug.substring( 0, cleanSlug.length - rightNum.length ).trim();
                    }

                    var nextJ = lineIdx + 1;
                    var trailingNums = [];
                    while ( nextJ < bodyLines.length && /^\d+[A-Z]?$/.test( bodyLines[nextJ].trim() ) && trailingNums.length < 2 ) {
                        trailingNums.push( bodyLines[nextJ].trim() );
                        nextJ++;
                    }
                    if ( trailingNums.length > 0 ) {
                        leftNum = leftNum || trailingNums[0];
                        rightNum = rightNum || ( trailingNums.length > 1 ? trailingNums[1] : trailingNums[0] );
                        lineIdx = nextJ - 1;
                    }

                    var sceneNum = leftNum || rightNum || String( currentSceneCount );
                    currentSceneNum = sceneNum;

                    if ( scope === 'sides' ) {
                        isCurrentSceneSelected = selectedScenesSet.has( String( sceneNum ) );
                    } else {
                        isCurrentSceneSelected = true;
                    }

                    if ( isCurrentSceneSelected ) {
                        var slugClass = 'sc-slugline' + ( boldSlugs ? '' : ' normal-weight' );
                        html += '<div class="' + slugClass + '">' +
                            ( sceneNum ? '<span class="sc-scene-num sc-num-left">' + this.escapeHtml( sceneNum ) + '</span>' : '' ) +
                            '<span class="sc-slugline-content">' + this.escapeHtml( cleanSlug.toUpperCase() ) + '</span>' +
                            ( sceneNum ? '<span class="sc-scene-num sc-num-right">' + this.escapeHtml( sceneNum ) + '</span>' : '' ) +
                        '</div>';
                    }
                    lineIdx++;
                    continue;
                }

                // If current scene is not in selected sides, skip rendering body lines
                if ( ! isCurrentSceneSelected ) {
                    lineIdx++;
                    continue;
                }

                // Comment / Notes (// or [[ ]])
                if ( cur.startsWith( '//' ) ) {
                    if ( ! hideNotes ) {
                        var noteText = cur.substring( 2 ).trim();
                        html += '<div class="sc-note">' + this.escapeHtml( noteText ) + '</div>';
                    }
                    lineIdx++;
                    continue;
                } else if ( cur.startsWith( '[[' ) && cur.endsWith( ']]' ) ) {
                    if ( ! hideNotes ) {
                        var noteText = cur.substring( 2, cur.length - 2 ).trim();
                        html += '<div class="sc-note">' + this.escapeHtml( noteText ) + '</div>';
                    }
                    lineIdx++;
                    continue;
                }

                // Transitions
                if ( transRegex.test( cur ) ) {
                    inDialogue = false;
                    var transText = cur.replace( /^>\s*/, '' ).replace( /\s*<$/, '' ).toUpperCase();
                    html += '<div class="sc-transition">' + this.escapeHtml( transText ) + '</div>';
                    lineIdx++;
                    continue;
                }

                // Screenplay Card Cues
                if ( /^CARD:\s*/i.test( cur ) || /^-.*?-\s*$/.test( cur ) ) {
                    inDialogue = false;
                    html += '<div class="sc-card-cue">' + this.escapeHtml( cur ) + '</div>';
                    lineIdx++;
                    continue;
                }

                // Parenthetical
                var isParen = ( cur.startsWith( '(' ) && cur.endsWith( ')' ) ) || ( cur.startsWith( '(' ) && cur.indexOf( '\n' ) === -1 && cur.length < 60 );
                if ( isParen ) {
                    var parenText = cur;
                    if ( ! parenText.endsWith( ')' ) ) parenText += ')';
                    html += '<div class="sc-parenthetical">' + this.formatInlineMarkdown( parenText ) + '</div>';
                    lineIdx++;
                    continue;
                }

                // Markdown quote dialogue
                if ( cur.startsWith( '> ' ) ) {
                    var isTarget = highlightCharacter && targetCharacter && ( currentCharacterName === targetCharacter );
                    html += '<div class="sc-dialogue' + ( isTarget ? ' sc-highlight-dialogue' : '' ) + '">' + this.formatInlineMarkdown( cur.substring( 2 ).trim() ) + '</div>';
                    lineIdx++;
                    continue;
                }

                // Character Cue check
                var normalizedCharLine = cur
                    .replace( /\(CONT222D/gi, "(CONT'D)" )
                    .replace( /CONT[’']D/gi, "CONT'D" )
                    .replace( /\(CONT'D$/gi, "(CONT'D)" )
                    .replace( /\(O\.S\.$/gi, "(O.S.)" )
                    .replace( /\(V\.O\.$/gi, "(V.O.)" );

                var cleanName = normalizedCharLine.replace( /\(.*?\)/g, '' ).trim();
                var isAllUpper = cleanName.length > 0 && cleanName === cleanName.toUpperCase() && cleanName.length <= 40 && ! /[0-9]{3,}/.test( cleanName );
                var hasNextLine = ( lineIdx + 1 < bodyLines.length && bodyLines[lineIdx + 1].trim() !== '' );

                if ( ( isAllUpper && hasNextLine ) || cur.startsWith( '@' ) ) {
                    inDialogue = true;
                    var charName = normalizedCharLine.replace( /^@/, '' ).toUpperCase();
                    currentCharacterName = cleanName.toUpperCase();
                    html += '<div class="sc-character">' + this.escapeHtml( charName ) + '</div>';
                    lineIdx++;
                    continue;
                }

                // Dialogue following character cue or parenthetical
                if ( inDialogue ) {
                    var isTarget = highlightCharacter && targetCharacter && ( currentCharacterName === targetCharacter );
                    html += '<div class="sc-dialogue' + ( isTarget ? ' sc-highlight-dialogue' : '' ) + '">' + this.formatInlineMarkdown( cur ) + '</div>';
                    lineIdx++;
                    continue;
                }

                // Narrative Action block
                html += '<div class="sc-action">' + this.formatInlineMarkdown( cur ) + '</div>';
                lineIdx++;
            }

            // Running header for page 2 onward
            if ( ! hasEmbeddedPages && pageNumbers && scope !== 'sides' ) {
                var initialHeader = '<div class="sc-page-header">' +
                    '<span class="sc-header-date">' + this.escapeHtml( titlePageData.date || '' ) + '</span>' +
                    '<span class="sc-header-title">' + this.escapeHtml( titlePageData.title || defaultTitle ) + '</span>' +
                    '<span class="sc-header-page">2.</span>' +
                '</div>';
                html = initialHeader + html;
            }

            return html;
        },

        getFilmscriptPrintCss: function( pageSize ) {
            var isA4 = ( pageSize === 'a4' );
            var sizeRule = isA4 ? '210mm 297mm' : 'letter portrait';
            var marginRule = isA4 ? '25mm 25mm 25mm 38mm' : '1.0in 1.0in 1.0in 1.5in';

            var fontFam = "'Courier Final Draft', 'Courier Prime', 'Courier New', Courier, monospace";
            var fontSz = "12pt";
            var lineH = "1.15";

            return '@page { size: ' + sizeRule + '; margin: ' + marginRule + '; }' +
                '@media print { ' +
                    'body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; } ' +
                    '.sc-page-break { page-break-before: always; break-before: page; height: 0; margin: 0; border: none; background: transparent; } ' +
                    '.sc-highlight-dialogue { background: #fef08a !important; color: #000 !important; border-left: 3px solid #ca8a04 !important; padding-left: 6px !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } ' +
                '}' +
                'html, body { margin: 0; padding: 0; background: #ffffff; color: #111111; font-family: ' + fontFam + '; font-size: ' + fontSz + '; line-height: ' + lineH + '; }' +
                '.sc-title-page { min-height: 8.5in; display: flex; flex-direction: column; justify-content: space-between; text-align: center; page-break-after: always; break-after: page; box-sizing: border-box; padding-top: 0.5in; padding-bottom: 0.5in; }' +
                '.sc-title-top { font-size: 11pt; letter-spacing: 0.25em; text-transform: uppercase; margin-bottom: 1.5in; }' +
                '.sc-title-center { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; }' +
                '.sc-title-text { font-size: 14pt; font-weight: bold; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 24pt; }' +
                '.sc-title-credit { font-size: 11pt; margin-bottom: 12pt; }' +
                '.sc-title-author { font-size: 12pt; text-transform: uppercase; margin-bottom: 18pt; }' +
                '.sc-title-bottom { text-align: left; width: 6.0in; margin: 0 auto; font-size: 10pt; line-height: 1.3; }' +
                '.sc-title-rights { margin-bottom: 18pt; }' +
                '.sc-title-meta-row { display: flex; justify-content: space-between; font-size: 10pt; }' +
                '.sc-sides-slip { border: 2px solid #111; padding: 24px; margin-bottom: 36px; page-break-after: always; break-after: page; box-sizing: border-box; min-height: 4.5in; display: flex; flex-direction: column; justify-content: space-between; font-family: inherit; }' +
                '.sc-sides-slip-header { text-align: center; border-bottom: 1px solid #333; padding-bottom: 14px; margin-bottom: 16px; }' +
                '.sc-sides-slip-title { font-size: 16pt; font-weight: bold; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 4pt; }' +
                '.sc-sides-slip-sub { font-size: 11pt; color: #444; }' +
                '.sc-sides-slip-meta { display: flex; flex-direction: column; gap: 8px; font-size: 11pt; margin-bottom: 16px; }' +
                '.sc-sides-slip-row { display: flex; justify-content: space-between; border-bottom: 1px dashed #ccc; padding-bottom: 4px; }' +
                '.sc-sides-slip-label { font-weight: bold; text-transform: uppercase; }' +
                '.sc-sides-slip-scenes { border-top: 1px solid #333; padding-top: 12pt; font-size: 10.5pt; line-height: 1.4; }' +
                '.sc-page-header { display: flex; justify-content: space-between; width: 6.0in; margin-top: 0; margin-bottom: 18pt; font-size: 11pt; }' +
                '.sc-header-date { width: 1.5in; }' +
                '.sc-header-title { flex: 1; text-align: center; text-transform: uppercase; letter-spacing: 0.05em; }' +
                '.sc-header-page { width: 1.0in; text-align: right; }' +
                '.sc-slugline { position: relative; width: 6.0in; font-weight: bold; text-transform: uppercase; margin-top: 18pt; margin-bottom: 9pt; page-break-after: avoid; break-after: avoid; }' +
                '.sc-slugline.normal-weight { font-weight: normal; }' +
                '.sc-scene-num { position: absolute; top: 0; font-weight: bold; }' +
                '.sc-num-left { left: -0.65in; width: 0.5in; text-align: left; }' +
                '.sc-num-right { right: 0; width: 0.5in; text-align: right; }' +
                '.sc-slugline-content { display: block; max-width: 5.35in; }' +
                '.sc-continued-line { margin-top: 14pt; margin-bottom: 9pt; }' +
                '.sc-action { margin-top: 0; margin-bottom: 9pt; line-height: 1.15; text-align: left; max-width: 6.0in; }' +
                '.sc-character { text-transform: uppercase; margin-top: 12pt; margin-bottom: 0; margin-left: 2.0in; max-width: 3.5in; page-break-after: avoid; break-after: avoid; }' +
                '.sc-parenthetical { margin-top: 0; margin-bottom: 0; margin-left: 1.5in; max-width: 2.5in; font-style: normal; page-break-after: avoid; break-after: avoid; }' +
                '.sc-dialogue { margin-top: 0; margin-bottom: 9pt; margin-left: 1.0in; max-width: 3.5in; line-height: 1.15; }' +
                '.sc-highlight-dialogue { background: #fef08a !important; color: #000 !important; border-left: 3px solid #ca8a04; padding-left: 6px; margin-left: calc(1.0in - 9px) !important; }' +
                '.sc-more { margin-top: 0; margin-bottom: 9pt; margin-left: 2.0in; max-width: 3.5in; text-transform: uppercase; }' +
                '.sc-page-footer-continued { text-align: right; width: 6.0in; margin-top: 16pt; margin-bottom: 16pt; page-break-after: avoid; break-after: avoid; }' +
                '.sc-transition { text-transform: uppercase; margin-top: 12pt; margin-bottom: 12pt; text-align: right; width: 6.0in; page-break-after: avoid; break-after: avoid; }' +
                '.sc-card-cue { text-transform: uppercase; margin-top: 12pt; margin-bottom: 8pt; text-align: left; max-width: 6.0in; }' +
                '.sc-note { color: #666; font-style: italic; font-size: 10pt; margin: 6pt 0; padding-left: 8pt; border-left: 2px solid #ccc; }' +
                '.sc-code { font-family: inherit; font-size: 11pt; }';
        },

        initScreenplayExport: function( api ) {
            var self = this;
            if ( ! api || typeof api.registerExportProvider !== 'function' ) {
                return;
            }

            var filmscriptProvider = {
                id: 'filmscript',
                name: 'Filmscript Manuscript (12YAS)',
                tag: '12pt Courier Final Draft',
                sub: 'Hollywood Shooting Script Standard (12YAS)',
                help: 'Authentic Hollywood shooting script standard with 12pt Courier typography, dual scene numbers, running headers, intuitive CONTINUED recognition, and Scenes & Sides packaging.',
                isDefault: true,
                parse: function( rawText, options ) {
                    return self.parseFilmscriptManuscript( rawText, options );
                },
                getCss: function( pageSize ) {
                    return self.getFilmscriptPrintCss( pageSize );
                },
                getExtraOptions: function() {
                    return self.getSidesExportOptions();
                },
                onExportOpen: function( ctx ) {
                    self.setupSidesExportUi( ctx );
                }
            };

            api.registerExportProvider( 'filmscript', filmscriptProvider );
            if ( typeof api.setActiveExportProvider === 'function' ) {
                api.setActiveExportProvider( 'filmscript' );
            }
        }
    } );
} )();
