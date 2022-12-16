/** @type {monaco.languages.SemanticTokensLegend} */
const legend = {
	tokenTypes: [
		'kommentar'
	],
	tokenModifiers: [
		'declaration',
		'documentation',
		'readonly',
		'static',
		'abstract',
		'deprecated',
		'modification',
		'async'
	]
};

/** @type {(type: string)=>number} */
function getType(type) {
	return legend.tokenTypes.indexOf(type);
}

/** @type {(modifier: string[]|string|null)=>number} */
function getModifier(modifiers) {
	if (typeof modifiers === 'string') {
		modifiers = [modifiers];
	}
	if (Array.isArray(modifiers)) {
		let nModifiers = 0;
		for (let modifier of modifiers) {
			const nModifier = legend.tokenModifiers.indexOf(modifier);
			if (nModifier > -1) {
				nModifiers |= (1 << nModifier) >>> 0;
			}
		}
		return nModifiers;
	} else {
		return 0;
	}
}

const tokenPattern = new RegExp('\{\!(.*)\}', 'g');

monaco.languages.registerDocumentSemanticTokensProvider('java', {
	getLegend: function () {
		return legend;
	},
	provideDocumentSemanticTokens: function (model, lastResultId, token) {
		const lines = model.getLinesContent();

		/** @type {number[]} */
		const data = [];

		let prevLine = 0;
		let prevChar = 0;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			for (let match = null; (match = tokenPattern.exec(line)); ) {
                console.log(match[1], match[2])
				let modifier = -1;

				data.push(
					// translate line to deltaLine
					i - prevLine,
					// for the same line, translate start to deltaStart
					prevLine === i ? match.index - prevChar : match.index,
					match[0].length,
					0,
					modifier
				);

				prevLine = i;
				prevChar = match.index;
			}
		}
		return {
			data: new Uint32Array(data),
			resultId: null
		};
	},
	releaseDocumentSemanticTokens: function (resultId) {}
});

// add some missing tokens
monaco.editor.defineTheme('myCustomTheme', {
	base: 'vs',
	inherit: true,
	colors: {},
	rules: [
		{ token: 'kommentar', foreground: 'aaaaaa', background:'777777', fontStyle: 'bold' }
	]
});

const editor = monaco.editor.create(document.getElementById('container'), {
	value: [
		'public class {!foo} {',
		'    [kommentar] [string] [keyword] [zahl] [regexp] [operator] [namespace]',
		'    [type] [struct] [class] [interface] [enum] [typeParameter] [function]',
		'    [member] [macro] [variable] [parameter] [property] [label]',
		'',
		'Available token modifiers:',
		'    [type.declaration] [type.documentation] [type.member] [type.static]',
		'    [type.abstract] [type.deprecated] [type.modification] [type.async]',
		'',
		'Some examples:',
		'    [class.static.token]     [type.static.abstract]',
		'    [class.static.token]     [type.static]',
		'',
		'    [struct]',
		'',
		'    [function.private]',
		'',
		'An error case:',
		'    [notInLegend]'
	].join('\n'),
	language: 'java',
	theme: 'myCustomTheme',
	// semantic tokens provider is disabled by default
	'semanticHighlighting.enabled': true
});






// Theme matching (i.e. applying a style to a token) happens in JavaScript.
// We must therefore register the theme rules in JavaScript.

// A custom theme must name its base theme (i.e. 'vs', 'vs-dark' or 'hc-black')
// It can then choose to inherit the rules from the base theme or not
// A rule token matching is prefix based: e.g.
//  - string will match a token with type: string, string.double.js or string.html
//  - string.double will match a token with type string.double but will not match string or string.html

// !!! Tokens can be inspected using F1 > Developer: Inspect Tokens !!!

monaco.editor.defineTheme('myCustomTheme', {
	base: 'vs', // can also be vs-dark or hc-black
	inherit: true, // can also be false to completely replace the builtin rules
	rules: [
		{ token: 'comment', foreground: 'ffa500', fontStyle: 'italic underline' },
		{ token: 'comment.js', foreground: '008800', fontStyle: 'bold' },
		{ token: 'comment.css', foreground: '0000ff' } // will inherit fontStyle from `comment` above
	],
	colors: {
		'editor.foreground': '#000000'
	}
});

let ed = monaco.editor.create(document.getElementById('container'), {
	value: getCode(),
	language: 'text/html',
	theme: 'myCustomTheme',
    minimap: {
		enabled: false
	},
    insertSpaces: true,
    tabSize: 4,
    lineNumbers: num => num ,
    lineNumbersMinChars: 1,
    automaticLayout: true,
    glyphMargin: false,
});


let ed2 = monaco.editor.create(document.getElementById('container2'), {
	value: getCode(),
	language: 'text/html',
	theme: 'myCustomTheme',
    minimap: {
		enabled: false
	},
    insertSpaces: true,
    tabSize: 4,
    lineNumbers: num => num + ed.getModel().getLineCount(),
    lineNumbersMinChars: 1,
    automaticLayout: true,
    glyphMargin: false,
});

ed.getModel().onDidChangeContent((event) => {
    console.log("change")
    const nr = ed.getModel().getLineCount();
  ed2.updateOptions({
    lineNumbers: num => num + nr
  })
})

function getCode() {
	return (
		'<html><!-- // !!! Tokens can be inspected using F1 > Developer: Inspect Tokens !!! -->\n<head>\n	<!-- HTML comment -->\n	<style type="text/css">\n		/* CSS comment */\n	</style>\n	<script type="javascript">\n		// JavaScript comment\n	</' +
		'script>\n</head>\n<body></body>\n</html>'
	);
}