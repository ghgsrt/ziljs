function collectEscapedStrings(str: string) {
	const results: Array<string> = [];
	const regex = /"(?:[^"\\]|\\.)*"/g; // match escaped strings

	let match: RegExpExecArray | null;
	while ((match = regex.exec(str)) !== null) results.push(match[0]);

	return results;
}

const _tryLinkValue = (prefix?: string) => (value: string, key?: string) =>
	value[0] === '"'
		? value
		: `[[${prefix && `${prefix}; `}${key ?? value}|${value}]]`;

const replaceWrapper =
	(
		name: string,
		adjectives: Array<string>,
		tryLinkValue: ReturnType<typeof _tryLinkValue>
	) =>
	(match: string, preceding: string): string =>
		preceding &&
		adjectives.some((adj) => adj.toLowerCase() === preceding.toLowerCase())
			? tryLinkValue(`${preceding} ${match}}`, name)
			: `${preceding} ${tryLinkValue(
					match.replace(preceding, '').trim(),
					name
			  )}`;

const replaceAllInstances = (
	str: string,
	find: string,
	replaceFn: ReturnType<typeof replaceWrapper>
) =>
	str.replace(
		new RegExp(`(?<=\\s|^)(\\w+)? ?(${find})(?=\\s|[.,!?]|$)`, 'gi'),
		replaceFn
	);

const descendingLength = (a: string, b: string) => b.length - a.length;

export function preprocess(str: string) {
	const delimiters = ['<', '>', '(', ')'];
	const result: Array<string> = [];
	let currentWord = '';
	let insideString = false;

	for (let i = 0; i < str.length; i++) {
		const char = str[i];

		if (char === '\\') {
			i++;
			currentWord += '"';
			continue;
		}

		if (char === '"') insideString = !insideString;

		if (delimiters.includes(char) && !insideString) {
			if (currentWord.trim()) result.push(currentWord.trim());

			result.push(char);
			currentWord = '';
		} else if (/\s/.test(char) && !insideString) {
			if (currentWord.trim()) result.push(currentWord.trim());

			currentWord = '';
		} else currentWord += char;
	}

	const trimmed = currentWord.trim();
	if (trimmed) result.push(trimmed);

	return result.filter(Boolean).map(
		(token) =>
			token
				.replace(/\|\n|\n\|/g, '|') // remove newlines before/after pipes
				.replace(/\|/g, '<br>') // replace pipes with <br>
				.replace(/\n/g, ' ') // replace remaining newlines with spaces
	);
}

const propertiesToIgnore = [
	'tags',
	'aliases',
	'IN',
	'FLAGS',
	'GLOBAL',
	'ACTION',
	'PSEUDO',
	'DESC',
];
export function postprocess(
	input: any,
	synonyms: Record<string, Set<string>>,
	adjectives: Record<string, Set<string>>,
	prefix?: string
) {
	const keys = Object.keys(input).sort(descendingLength);
	for (const key of keys) {
		const _synonyms = Array.from(synonyms[key]).sort(descendingLength);
		const _adjectives = Array.from(adjectives[key]).sort(descendingLength);
		const replaceFn = replaceWrapper(key, _adjectives, _tryLinkValue(prefix));

		for (const key2 in input) {
			if (input[key].tags[0] === 'room' || key === key2) continue;

			for (const property in input[key2]) {
				if (propertiesToIgnore.includes(property)) continue;

				const values = input[key2][property];
				for (let i = 0; i < values.length; i++) {
					const escapedStrings = collectEscapedStrings(values[i]);

					for (const escapedString of escapedStrings) {
						let newString = escapedString;

						for (const synonym of _synonyms)
							newString = replaceAllInstances(newString, synonym, replaceFn);

						input[key2][property][i] = values[i].replace(
							escapedString,
							newString
						);
					}
				}
			}
		}
	}

	return input;
}
