import { dungeon } from './1dungeon';
import { parser, ROUTINE, TABLE } from './parser';
import { toRecallIter } from './utils';

//? HELPER FNS ==========================================================
const tryResolveGlobal = (
	global: string | number | boolean
): string | number | boolean => // ts won't recognize it can return a string unless explicitly stated lmao
	typeof global === 'string'
		? CONSTANTS[global] ?? GLOBALS[global] ?? global
		: global;

//? ARITHMETIC OPS ======================================================
const ADD = (first: any, ...rest: any[]) =>
	rest.reduce((acc, val) => acc + val, first);
const SUB = (first: any, ...rest: any[]) =>
	rest.reduce((acc, val) => acc - val, first);
const MUL = (first: any, ...rest: any[]) =>
	rest.reduce((acc, val) => acc * val, first);
const DIV = (first: any, ...rest: any[]) =>
	rest.reduce((acc, val) => acc / val, first);
const MOD = (first: any, ...rest: any[]) =>
	rest.reduce((acc, val) => acc % val, first);
const RANDOM = (int: number) => Math.floor(Math.random() * int) + 1;

//? LOGIC OPS ===========================================================
const AND = (...args: Array<string | boolean>) =>
	args.every((arg) => !!tryResolveGlobal(arg));
const OR = (...args: Array<string | boolean>) =>
	args.some((arg) => !!tryResolveGlobal(arg));
const NOT = (lhs: string | boolean) => !tryResolveGlobal(lhs);

//? STANDARD PREDICATES =================================================
const isEQUAL = (lhs: string, ...rhs: string[]) => {
	const _lhs = tryResolveGlobal(lhs);
	return rhs.some((arg) => _lhs == tryResolveGlobal(arg)); //! intentionally allowed coercion
};
const isGRTR = (lhs: string | number, rhs: string | number) =>
	Number(tryResolveGlobal(lhs)) > Number(tryResolveGlobal(rhs));
const isLESS = (lhs: string | number, rhs: string | number) =>
	Number(tryResolveGlobal(lhs)) < Number(tryResolveGlobal(rhs));
const isZERO = (lhs: string | number) => Number(lhs) === 0;

//? ZORK PREDICATES =====================================================
const isFSET = (OBJ: string, FLAG: string) => OBJECTS[OBJ]?.FLAGS?.has(FLAG);
const isIN = (OBJ: string, RM: string) => OBJECTS[OBJ].LOC === RM;
const isHERE = (OBJ: string) => OBJECTS[OBJ].LOC === GLOBALS.HERE;
const isGLOBAL_IN = (OBJ: string, RM: string) =>
	ROOMS[RM].GLOBAL?.includes(OBJ);

//? ZORK ROUTINES =======================================================

//? OBJ OPS
const MOVE = (OBJ1: string, OBJ2: string) => {
	const _OBJ1 = OBJECTS[OBJ1];
	const _OBJ2 = OBJECTS[OBJ2];

	if (_OBJ1.LOC === OBJ2) return;

	if (_OBJ1.LOC) REMOVE(OBJ1);

	_OBJ1.LOC = OBJ2;
	_OBJ1.prev = _OBJ2.last;
	_OBJ1.next = undefined;
	if (!_OBJ2.first) _OBJ2.first = OBJ1;
	if (!_OBJ2.last) _OBJ2.last = OBJ1;
	else OBJECTS[_OBJ2.last].next = OBJ1;
};
const REMOVE = (OBJ: string) => {
	const _OBJ = OBJECTS[OBJ];

	if (!_OBJ.LOC) return;

	const prev = _OBJ.prev && OBJECTS[_OBJ.prev];
	const next = _OBJ.next && OBJECTS[_OBJ.next];

	//! verify the logic is sound
	if (prev) prev.next = _OBJ.next;
	else OBJECTS[_OBJ.LOC].first = _OBJ.next;
	if (next) next.prev = _OBJ.prev;
	else OBJECTS[_OBJ.LOC].last = _OBJ.prev;
};
const FIRST = (OBJ: string) => OBJECTS[OBJ].first;
const NEXT = (OBJ: string) => OBJECTS[OBJ].next;
const LOC = (OBJ: string) => OBJECTS[OBJ].LOC ?? false;
const FSET = (OBJ: string, FLAG: string) =>
	(OBJECTS[OBJ].FLAGS ??= new Set()).add(FLAG);
const FCLEAR = (OBJ: string, FLAG: string) => OBJECTS[OBJ].FLAGS?.delete(FLAG);
const GETP = (OBJ: string, PROP: string) => OBJECTS[OBJ][PROP];
const PUTP = (OBJ: string, PROP: string, VAL: any) =>
	(OBJECTS[OBJ][PROP] = VAL);

//? GLOBAL OPS
const SETG = (global: string, value: any) => (GLOBALS[global] = value);
const GASSIGNED = (global: string) => GLOBALS[global] !== undefined;

//? TABLE OPS
const PUT = (table: TABLE, index: number, value: any) =>
	(table[index * 2] = value);
const GET = (table: TABLE, index: number) => table[index * 2];
const PUTB = (table: TABLE, index: number, value: any) =>
	(table[index] = value);
const GETB = (table: TABLE, index: number) => table[index];

//? PARSER INTERNAL ACTIONS =============================================
const TELL = () => {};
const WALK = () => {};
const FIND = () => {};

const REMOVE_CAREFULLY = (OBJ: any) => {
	//! HAS A DEFINED ROUTINE, REMEMBER TO NUKE
};

const LANG_ROUTINES: Record<string, Function> = {
	ADD,
	'+': ADD,
	SUB,
	'-': SUB,
	MUL,
	'*': MUL,
	DIV,
	'/': DIV,
	MOD,
	RANDOM,
	AND,
	NOT,
	OR,
	'EQUAL?': isEQUAL,
	'==?': isEQUAL,
	'GRTR?': isGRTR,
	'G?': isGRTR,
	'LESS?': isLESS,
	'L?': isLESS,
	'ZERO?': isZERO,
	'0?': isZERO,
	'FSET?': isFSET,
	'IN?': isIN,
	'HERE?': isHERE,
	'GLOBAL-IN?': isGLOBAL_IN,
	'REMOVE-CAREFULLY': REMOVE_CAREFULLY, //! REMEMBER TO NUKE
	MOVE,
	REMOVE,
	'FIRST?': FIRST,
	'NEXT?': NEXT,
	LOC,
	FSET,
	FCLEAR,
	GETP,
	PUTP,
	SETG,
	'GASSIGNED?': GASSIGNED,
	PUT,
	GET,
	PUTB,
	GETB,
};

// const { OBJECTS, ROOMS, GLOBALS: _GLOBALS } = dungeonParser(dungeon);

const {
	FLAGS,
	CONSTANTS,
	GLOBALS: _GLOBALS,
	OBJECTS,
	ROOMS,
	ROUTINES,
} = parser(dungeon);

const GLOBALS: Record<string, any> = {
	..._GLOBALS,
	PRSO: {},
	['GLOBAL-WATER']: {},
	HERE: {},
};

const __ROUTINES: Record<string, ROUTINE> = {
	'V-HIT-SPOT': {
		tells: [
			'Thank you very much. I was rather thirsty (from all this talking, probably).<br>',
		],
		arguments: {},
		main: [
			['SETG', ['PRSO', ',WATER']],
			[
				'COND',
				[
					[
						[
							'AND',
							[
								['EQUAL?', [',PRSO', ',WATER']],
								['NOT', [['GLOBAL-IN?', [',GLOBAL-WATER', ',HERE']]]],
							],
						],
						[['REMOVE-CAREFULLY', [',PRSO']]],
					],
				],
			],
			['TELL', [0]],
		],
	},
	'V-DRINK': {
		tells: [],
		arguments: {},
		main: [['V-HIT-SPOT', []]],
	},
};

type _ROUTINE = [string, _ROUTINE_ARGS | _COND_ARGS];
type _INSTRUCTIONS = Array<_ROUTINE>;
type _ROUTINE_ARGS = Array<_ROUTINE | string | number>;
type _COND_ARGS = Array<[_ROUTINE, _INSTRUCTIONS]>;

function resolveRoutine(name: string) {
	if (LANG_ROUTINES[name]) return LANG_ROUTINES[name];
	if (name.startsWith('V-')) return V[name.slice(2)];
	if (name.startsWith('PRE-')) return PRE[name.slice(4)];
	return INT[name];
}

const getArgument = (def: ROUTINE, arg: string) => {
	let idx = 0;
	for (const argType in def.arguments) {
		if (argType === '_') continue;

		const _idx = def.arguments[argType]?.indexOf(arg) ?? 0;
		if (_idx !== -1) return def.arguments._![idx + _idx];

		idx += def.arguments[argType]?.length ?? 0;
	}
};

// PARTS OF SPEECH (PS?)::
// DIRECTION
// PREPOSITION
// OBJECT
// ADJECTIVE
// BUZZ-WORD
// VERB

function resolveVarAccess(def: ROUTINE, arg: string | number) {
	if (arg === 'T') return true;
	if (arg === '<>') return false;
	if (typeof arg === 'number' || (arg[0] !== ',' && arg[0] !== '.')) return arg;

	if (arg[0] === ',') return arg.slice(1); //? string representation (name of key pointing to actual value)

	return getArgument(def, arg.slice(1)); //? actual value

	// if (arg[0] === ',') {
	// 	arg = arg.slice(1);
	// 	if (GLOBALS[arg]) return GLOBALS[arg];
	// 	if (OBJECTS[arg] || ROOMS[arg] || FLAGS.has(arg)) return arg;
	// 	return arg;
	// }

	// return getArgument(def, arg.slice(1));
}

function resolveObject(name: string) {}

function execute(def: ROUTINE, deconstructedFn: _ROUTINE): any {
	switch (deconstructedFn[0]) {
		case 'COND':
			for (const arg of deconstructedFn[1])
				if (
					arg === 'T' ||
					arg === 'ELSE' ||
					execute(def, (arg as _COND_ARGS[number])[0])
				)
					return executeInstructions(def, (arg as _COND_ARGS[number])[1]);

			return false;
		case 'TELL':
			console.log(
				def.tells[((deconstructedFn as _ROUTINE_ARGS)[1] as number) ?? 0]
			);
			return false;
		case 'SET':
			return false;
		case 'ASSIGNED':
			return false;
		default:
			return resolveRoutine(deconstructedFn[0])(
				...(deconstructedFn[1] as _ROUTINE_ARGS).map((arg) =>
					Array.isArray(arg) ? execute(def, arg) : resolveVarAccess(def, arg)
				)
			);
	}
}

const _executeInstructions = (def: ROUTINE, instrs: _INSTRUCTIONS) => {
	let last: any;
	for (const instr of instrs) last = execute(def, instr);
	return last;
};
function executeInstructions(def: ROUTINE, instrs: _INSTRUCTIONS): any;
function executeInstructions(def: ROUTINE): any;
function executeInstructions(def: ROUTINE, instrs?: _INSTRUCTIONS) {
	if (instrs) return _executeInstructions(def, instrs);
	return _executeInstructions(def, def.main);
}

const defToCallable =
	(def: ROUTINE) =>
	(...args: Array<any>) => {
		// apply args to routine definition
		if (args.length > 0 && def.arguments._)
			def.arguments._.splice(0, args.length, ...args);

		return executeInstructions(def);
	};
type ROUTINE_CALLABLE = ReturnType<typeof defToCallable>;

const V: Record<string, ROUTINE_CALLABLE> = {};
const PRE: Record<string, ROUTINE_CALLABLE> = {};
const INT: Record<string, ROUTINE_CALLABLE> = {};

const setRoutine = (name: string, callable: (...args: any) => any) => {
	if (name.startsWith('V-')) V[name.slice(2)] = callable;
	else if (name.startsWith('PRE-')) PRE[name.slice(4)] = callable;
	else INT[name] = callable;
};

(() =>
	Object.entries(__ROUTINES).forEach(([name, def]) =>
		setRoutine(name, defToCallable(def))
	))();

// (function init() {
// 	for (const key in __ROUTINES) {
// 		const callable = defToCallable(__ROUTINES[key]);

// 		if (key.startsWith('V-')) V[key.slice(2)] = callable;
// 		else if (key.startsWith('PRE-')) PRE[key.slice(4)] = callable;
// 		else INT[key] = callable;
// 	}
// })();

const BUZZ = [
	'AGAIN',
	'G',
	'OOPS',
	'A',
	'AN',
	'THE',
	'IS',
	'AND',
	'OF',
	'THEN',
	'ALL',
	'ONE',
	'BUT',
	'EXCEPT',
	'.',
	',',
	'"',
	'YES',
	'NO',
	'Y',
	'HERE',
];

const validObject = () => {};

const setFindFlags = (
	target: Record<string, any>,
	name: string,
	receiver: Record<string, any>
) => {
	if (name.includes('FIND'))
		Reflect.set(
			target,
			'_find',
			[
				...(Reflect.get(target, '_find', receiver) ?? []),
				...name.slice(6, -1).split(' '),
			],
			receiver
		);
	else
		Reflect.set(
			target,
			'_flags',
			[
				...(Reflect.get(target, '_flags', receiver) ?? []),
				...name.slice(1, -1).split(' '),
			],
			receiver
		);
};

let __prompting = false;
const SYNTAX = new Proxy<Record<string, any>>(
	{ _objs: 0 },
	{
		get(target, name, receiver) {
			if (typeof name === 'string') {
				if (BUZZ.includes(name)) return receiver;
				if (name[0] === '(') {
					setFindFlags(target, name, receiver);
					return receiver;
				}
				if (Reflect.has(target, name)) {
					const rv = Reflect.get(target, name, receiver);

					// if (Reflect.has(rv, 'OBJECT')) {
					// 	const { _find, _flags } = rv['OBJECT'];

					// 	for (const find of _find ?? []) {
					// 		if (find === 'ROOMSBIT') {
					// 			SETG('PRSO', 'ROOMS');
					// 			break;
					// 		}

					// 		for (const key in OBJECTS) {
					// 			if (OBJECTS[key].FLAGS.includes(find) && validObject(OBJECTS[key])) {

					// 			}
					// 		}
					// 	}
					// }

					return rv;
				} else if (Reflect.has(target, 'OBJECT') && OBJECTS[name]) {
					// const find = receiver._find ?? [];
					// const flags = receiver._flags ?? [];

					return Reflect.get(target, 'OBJECT', receiver);
				}
			}

			if (__prompting)
				return () => console.log(`${String(name)} is not recognized.`);

			const temp: Record<string, any> = { _objs: receiver._objs };
			if (name === 'OBJECT')
				temp['_type'] = temp._objs++ === 0 ? 'PRSO' : 'PRSI';

			const newLayer = new Proxy(temp, this);
			Reflect.set(target, name, newLayer, receiver);
			return newLayer;
		},
		set(target, name, newValue, receiver) {
			if (typeof name === 'string' && name[0] === '(') {
				setFindFlags(target, name, receiver);

				Reflect.set(target, 'call', newValue, receiver);
			} else Reflect.set(target, name, { call: newValue }, receiver);

			return true;
		},
	}
);

// console.log(SYNTAX['AND']['foo']['IS']['bar']['(HELD)']['THE']['baz']);

function PROMPT(prompt: string) {
	__prompting = true;

	const words = prompt.toUpperCase().split(' ');

	let layer = SYNTAX;
	for (const word of words) {
		layer = layer[word];

		if (Reflect.has(layer, 'call')) {
			Reflect.get(layer, 'call')(); // actually call PERFORM here
			return;
		}
	}

	if (typeof layer['OBJECT'] === 'function') layer['OBJECT']();
	// actually call PERFORM here, assumes previous layer(s) set PRSO/(PRSI)
	else if (typeof layer['OBJECT']?.['OBJECT'] === 'function')
		layer['OBJECT']['OBJECT']();
	// actually call PERFORM here, assumes previous layer(s) set PRSO and PRSI
	else console.log('no action', SYNTAX);
}

// SYNTAX['FOO']['BAR']['BAZ'] = () => console.log('hello');

// PROMPT('and foo is bar (HELD) the baz');

SYNTAX['DRINK']['OBJECT']['(FIND DRINKBIT)'][
	'(HELD CARRIED ON-GROUND IN-ROOM)'
] = V.DRINK;

PROMPT('drink water');

// type __OBJECT = [''];

// type Result = Record<string, Record<string, Array<string>>>;

// const directions = [
// 	'NORTH',
// 	'SOUTH',
// 	'EAST',
// 	'WEST',
// 	'NE',
// 	'NW',
// 	'SE',
// 	'SW',
// 	'UP',
// 	'DOWN',
// 	'IN',
// 	'OUT',
// 	'LAND',
// ] as const;
// type Direction = (typeof directions)[number];

// function preprocess(str: string) {
// 	const delimiters = ['<', '>', '(', ')'];
// 	const result: Array<string> = [];
// 	let currentWord = '';
// 	let insideString = false;

// 	for (let i = 0; i < str.length; i++) {
// 		const char = str[i];

// 		if (char === '\\') {
// 			i++;
// 			currentWord += '"';
// 			continue;
// 		}

// 		if (char === '"') insideString = !insideString;

// 		if (delimiters.includes(char) && !insideString) {
// 			if (currentWord.trim()) result.push(currentWord.trim());

// 			result.push(char);
// 			currentWord = '';
// 		} else if (/\s/.test(char) && !insideString) {
// 			if (currentWord.trim()) result.push(currentWord.trim());

// 			currentWord = '';
// 		} else currentWord += char;
// 	}

// 	const trimmed = currentWord.trim();
// 	if (trimmed) result.push(trimmed);

// 	return result.filter(Boolean).map(
// 		(token) =>
// 			token
// 				.replace(/\|\n|\n\|/g, '|') // remove newlines before/after pipes
// 				.replace(/\|/g, '<br>') // replace pipes with <br>
// 				.replace(/\n/g, ' ') // replace remaining newlines with spaces
// 	);
// }

// function collectEscapedStrings(str: string) {
// 	const results: Array<string> = [];
// 	const regex = /"(?:[^"\\]|\\.)*"/g; // match escaped strings

// 	let match: RegExpExecArray | null;
// 	while ((match = regex.exec(str)) !== null) results.push(match[0]);

// 	return results;
// }

// const _tryLinkValue = (prefix?: string) => (value: string, key?: string) =>
// 	value[0] === '"'
// 		? value
// 		: `[[${prefix && `${prefix}; `}${key ?? value}|${value}]]`;

// const replaceWrapper =
// 	(
// 		name: string,
// 		adjectives: Array<string>,
// 		tryLinkValue: ReturnType<typeof _tryLinkValue>
// 	) =>
// 	(match: string, preceding: string): string =>
// 		preceding &&
// 		adjectives.some((adj) => adj.toLowerCase() === preceding.toLowerCase())
// 			? tryLinkValue(`${preceding} ${match}`, name)
// 			: `${preceding} ${tryLinkValue(
// 					match.replace(preceding, '').trim(),
// 					name
// 			  )}`;

// const replaceAllInstances = (
// 	str: string,
// 	find: string,
// 	replaceFn: ReturnType<typeof replaceWrapper>
// ) =>
// 	str.replace(
// 		new RegExp(`(?<=\\s|^)(\\w+)? ?(${find})(?=\\s|[.,!?]|$)`, 'gi'),
// 		replaceFn
// 	);

// const descendingLength = (a: string, b: string) => b.length - a.length;

// const blacklist = new Set<string>();
// const synonyms: Record<string, Set<string>> = {};
// const adjectives: Record<string, Set<string>> = {};

// const propertiesToIgnore = [
// 	'tags',
// 	'aliases',
// 	'IN',
// 	'FLAGS',
// 	'GLOBAL',
// 	'ACTION',
// 	'PSEUDO',
// 	'DESC',
// ];
// function postprocess(input: Result, prefix?: string) {
// 	const keys = Object.keys(input).sort(descendingLength);
// 	for (const key of keys) {
// 		const _synonyms = Array.from(synonyms[key]).sort(descendingLength);
// 		const _adjectives = Array.from(adjectives[key]).sort(descendingLength);
// 		const replaceFn = replaceWrapper(key, _adjectives, _tryLinkValue(prefix));

// 		for (const key2 in input) {
// 			if (key === key2 || input[key].tags[0] === 'room') continue;

// 			for (const property in input[key2]) {
// 				if (propertiesToIgnore.includes(property)) continue;

// 				const values = input[key2][property];
// 				for (let i = 0; i < values.length; i++) {
// 					const escapedStrings = collectEscapedStrings(values[i]);

// 					for (const escapedString of escapedStrings) {
// 						let newString = escapedString;

// 						for (const synonym of _synonyms)
// 							newString = replaceAllInstances(newString, synonym, replaceFn);

// 						input[key2][property][i] = values[i].replace(
// 							escapedString,
// 							newString
// 						);
// 					}
// 				}
// 			}
// 		}
// 	}

// 	return input;
// }

// const toDirtyLexedRecallIter = (input: string) =>
// 	toRecallIter(preprocess(input));

// const getAliases = (name: string) => [
// 	name,
// 	name
// 		.split('-')
// 		.map((word) => word[0] + word.slice(1).toLowerCase())
// 		.join(' '),
// ];

// =======================================================================

// type PARSER<T> = (iter: ReturnType<typeof toRecallIter>) => T;
// type OBJECT = {
// 	[key: string]: number | string | Array<string> | Set<string> | undefined;
// 	tags: Array<string>; // for Obsidian
// 	aliases: Array<string>; // for Obsidian
// 	NORTH?: string;
// 	SOUTH?: string;
// 	EAST?: string;
// 	WEST?: string;
// 	NE?: string;
// 	NW?: string;
// 	SE?: string;
// 	SW?: string;
// 	UP?: string;
// 	DOWN?: string;
// 	IN?: string;
// 	OUT?: string;
// 	LAND?: string;
// 	SYNONYM?: Array<string>; // valid nouns to refer to OBJECT
// 	ADJECTIVE?: Array<string>; // valid adjectives for OBJECT
// 	ACTION?: string; // associated ROUTINE called in PERFORM; OBJECT: when PRSO/PRSI; ROOM: called with M-BEG & M-END once each turn, M-ENTER on room enter, M-LOOK for describers
// 	DESCFN?: string; // ROUTINE for describers to descibe the OBJECT (can be ACTION if handles "OPT" M-OBJDESC or M-OBJDESC?)
// 	CONTFN?: string; // ROUTINE for when PRSO/PRSI is inside this OBJECT
// 	GENERIC?: string; // ROUTINE which handles OBJECT ambiguity (unsure what do if parser finds multiple with GENERIC set)
// 	DESC?: string; // ROOM: before room desc and on status line; OBJECT: verb defaults, player inv, etc. (actual display name)
// 	SDESC?: string; // mutable DESC
// 	LDESC?: string; // ROOM: long desc; OBJECT: desc when on ground
// 	FDESC?: string; // describes OBJECT before the first time it is moved
// 	LOC?: string; // name of OBJECT or ROOM which contains this OBJECT
// 	SIZE?: number; // also weight; if undefined, == 5
// 	CAPACITY?: number; // total size of OBJECTS a container can hold; if undefined, == size
// 	VALUE?: number; // score value
// 	TVALUE?: number; // treasure value
// 	GLOBAL?: Array<string>; // LOCAL-GLOBALS referencable in ROOM
// 	OWNER?: string; // OBJECT which owns this OBJECT; <OBJECT CAR ... (OWNER CYBIL)> --> "Cybil's car" -> car
// 	TEXT?: string; // text to display when OBJECT is READ
// 	PSEUDO?: string; // it's not the 80's anymore, the use case for this is gone; just create a new OBJECT
// 	PLURAL?: string; // plural form of OBJECT? (not used in source, apparently only Stu knows 🤷🏻‍♂️)
// 	ADJACENT?: Array<string>; // ROOMs for ADJACENT syntax token??? (somebody find Stu)
// 	FLAGS?: Set<string>; // TAKEBIT, DOORBIT, etc.; effectively defines generic OBJECT behaviors
// 	first?: string; // first OBJECT in container (OBJECT must have CONTBIT)
// 	last?: string; // last OBJECT in container (OBJECT must have CONTBIT)
// 	next?: string; // next OBJECT in linked LOCs
// 	prev?: string; // previous OBJECT in linked LOCs (for doubly linking)
// };
// type ROOM = OBJECT;
// type ROUTINE = {
// 	tells: string[]; // sequestered for much easier postprocessing
// 	arguments: {
// 		[key: string]: Array<string | any> | undefined; // typescript sucks ("no index signature of type string" 🤪)
// 		_?: Array<any>; // argument values
// 		req?: Array<string>; // names & order of required arguments
// 		opt?: Array<string>; // " optional arguments
// 		aux?: Array<string>; // " local variables
// 	};
// 	main: _INSTRUCTIONS;
// };
// type TABLE = Array<string | number | boolean | OBJECT | ROOM | ROUTINE | TABLE>;
// type GLOBAL = string | number | boolean | TABLE;
// type CONSTANT = number;

// const arrayProperties = ['SYNONYM', 'ADJECTIVE', 'GLOBAL', 'ADJACENT', 'FLAGS'];

// const parseObjectOrRoom: PARSER<OBJECT | ROOM> = (iter) => {
// 	const result: OBJECT | ROOM = {
// 		tags: [iter.prev.toLowerCase()],
// 		aliases: getAliases(iter.current),
// 	};

// 	let name = iter.current;
// 	let property: string;

// 	while (iter.next() !== '>') {
// 		property = iter.next();

// 		if (directions.includes(property as Direction)) {
// 			//! KEEP IN MIND PARSER NEEDS TO SOMEHOW BE FED 'PER'
// 			result[property] = '';
// 			while (iter.next() !== ')') result[property] += iter.current;
// 			continue;
// 		}

// 		if (property === 'DESC') {
// 			const desc = iter.current.slice(1, -1);

// 			if (!result.aliases.includes(desc)) result.aliases.push(desc);

// 			let blacklisted = blacklist.has(desc);
// 			if (!blacklisted) {
// 				for (const key in synonyms) {
// 					if (!synonyms[key].has(desc)) continue;

// 					synonyms[key].delete(desc);
// 					blacklist.add(desc);
// 					blacklisted = true;
// 					break;
// 				}

// 				if (!blacklisted) synonyms[name].add(desc);
// 			}

// 			result[property] = desc;
// 			continue;
// 		}

// 		result[property] = [];
// 		while (iter.next() !== ')')
// 			(result[property]! as Array<string>).push(iter.current);
// 	}

// 	return result;
// };
// const parseRoutine: PARSER<ROUTINE> = (iter) => {};
// const parseTable: PARSER<TABLE> = (iter) => {
// 	const table: TABLE = [];

// 	// switch (iter.current) {
// 	// 	case 'TABLE': // dynamic mem, no len
// 	// 	case 'PTABLE': // static mem, no len
// 	// 		break;
// 	// 	case 'LTABLE': // dynamic mem, len
// 	// 	case 'PLTABLE': // static mem, len
// 	// 		break;
// 	// 	case 'ITABLE': // spec. len, def values (think '[defV] * len' from python)
// 	// 		let defVal: any = 0;
// 	// 		let type: 'LEXV' | 'BYTE' | 'WORD';
// 	// 		let useLen = false;
// 	// 		let len: number;

// 	// 		if (iter.next() === 'BYTE') type = 'BYTE';
// 	// 		//@ts-ignore
// 	// 		else if (iter.current === 'WORD' || iter.current === 'NONE')
// 	// 			type = 'WORD';
// 	// 		else len = parseInt(iter.current);

// 	// 		while (iter.next() !== '>')
// 	// 			switch (iter.current) {
// 	// 				//@ts-ignore
// 	// 				case '>':
// 	// 					for (let i = 0; i < parseInt(iter.prev); i++) {
// 	// 						//@ts-ignore
// 	// 						if (type === 'WORD') {
// 	// 							table.push(defVal);
// 	// 						}
// 	// 						table.push(defVal);
// 	// 					}
// 	// 				//@ts-ignore
// 	// 				case '(':
// 	// 					while (iter.next() !== ')')
// 	// 						switch (iter.current) {
// 	// 							//@ts-ignore
// 	// 							case 'LENGTH':
// 	// 								table.push(len!);
// 	// 							//@ts-ignore
// 	// 							case 'WORD':
// 	// 								type = 'WORD';
// 	// 							//@ts-ignore
// 	// 							case 'BYTE':
// 	// 								type = 'BYTE';
// 	// 							//@ts-ignore
// 	// 							case 'LEXV':
// 	// 								type = 'LEXV';
// 	// 						}
// 	// 				default:
// 	// 					//@ts-ignore
// 	// 					if (len === undefined) len = parseInt(iter.current);

// 	// 			}

// 	// 		break;
// 	// 	default:
// 	// 		console.log('what in the fck', iter.current);
// 	// }
// };

// // const PUT = (table: TABLE, index: number, value: any) => {
// // 	const realIdx = index * 2;
// // 	const high = (value & 0xff00) >> 8;
// // 	const low = value & 0xff;

// // 	table[realIdx + 1] = low;
// // 	table[realIdx] = high;
// // };
// // const GET = (table: TABLE, index: number) => {
// // 	const realIdx = index * 2;
// // 	const high = table[realIdx];
// // 	const low = table[realIdx + 1];

// // 	return (high << 8) | low;
// // }

// function parser(input: string) {
// 	const FLAGS: Set<string> = new Set();
// 	const types: {
// 		CONSTANT: Record<string, CONSTANT>;
// 		GLOBAL: Record<string, GLOBAL>;
// 		OBJECT: Record<string, OBJECT>;
// 		ROOM: Record<string, ROOM>;
// 		ROUTINE: Record<string, ROUTINE>;
// 	} = {
// 		CONSTANT: {},
// 		GLOBAL: {},
// 		OBJECT: {},
// 		ROOM: {},
// 		ROUTINE: {},
// 	};
// 	const iter = toRecallIter(preprocess(input));

// 	const parseStatment = () => {
// 		if (iter.next() === '<') {
// 			if (iter.next() === '>') return false;
// 			if (!iter.current.includes('TABLE')) {
// 				console.log('bro huhhhh', iter.current);
// 				return false;
// 			}
// 			return parseTable(iter);
// 		}
// 		iter.next(); // align index (want next next to be <)
// 		return iter.prev;
// 	};

// 	const _parseOoR = () => {
// 		const temp = parseObjectOrRoom(iter);
// 		if (temp.FLAGS) for (const flag of temp.FLAGS) FLAGS.add(flag);
// 		return temp;
// 	};

// 	const parse = {
// 		CONSTANT: parseStatment,
// 		GLOBAL: parseStatment,
// 		OBJECT: _parseOoR,
// 		ROOM: _parseOoR,
// 		ROUTINE: parseRoutine,
// 	};

// 	while (iter.next() || !iter.done) {
// 		if (iter.current !== '<') {
// 			console.log('uhhh wtf', iter.current);
// 			break;
// 		}

// 		types[iter.next()][iter.next()] = parse[iter.prev]();
// 	}

// 	return {
// 		FLAGS,
// 		CONSTANTS: types.CONSTANT,
// 		GLOBALS: types.GLOBAL,
// 		OBJECTS: types.OBJECT,
// 		ROOMS: types.ROOM,
// 		ROUTINES: types.ROUTINE,
// 	};
// }

// function dungeonParser(input: string) {
// 	const result: Record<string, Result> = {
// 		OBJECT: {},
// 		ROOM: {},
// 	};
// 	const globalFlags = new Set<string>();

// 	let iter = toRecallIter(preprocess(input));

// 	let retrievingProperties = false;
// 	let retrievingValues = false;
// 	let tag = '';
// 	let key = '';
// 	let property = '';

// 	const tryLinkValue = _tryLinkValue('zork');

// 	const pushToken = (token: string, propertyName?: string) =>
// 		(result[tag][key][propertyName ?? property] ??= []).push(
// 			tryLinkValue(token)
// 		);

// 	while (true) {
// 		iter.next();

// 		if (iter.done) break;

// 		switch (iter.current) {
// 			case '<':
// 				const type: string = iter.next();
// 				if (type !== 'OBJECT' && type !== 'ROOM') break;

// 				tag = type;

// 				key = iter.next();
// 				result[tag][key] = {
// 					tags: [type.toLowerCase()],
// 					aliases: getAliases(key),
// 				};

// 				synonyms[key] = new Set([key, key.replace(/-/g, ' ')]);
// 				adjectives[key] = new Set();

// 				retrievingProperties = true;
// 				break;
// 			case '>':
// 				retrievingProperties = false;
// 				break;
// 			case '(':
// 				if (!retrievingProperties) break;

// 				property = iter.next();
// 				result[tag][key][property] = [];

// 				retrievingValues = true;
// 				break;
// 			case ')':
// 				retrievingValues = false;
// 				break;
// 			default:
// 				if (!retrievingValues || iter.current[0] === ';') break;

// 				if (
// 					directions.includes(property as Direction) &&
// 					(iter.current === 'PER' || iter.current === 'TO')
// 				) {
// 					if (iter.current === 'PER') {
// 						const per = iter.next();
// 						iter.next(); // skip closing parens
// 						const destination: string = iter.next().slice(5, -1); // assuming was in form: ;"to DEST"

// 						pushToken(destination);
// 						pushToken(per, `${property}_PER`);
// 					} else {
// 						let dirValue = tryLinkValue(iter.next());

// 						if (iter.next() === 'IF') {
// 							const condition = iter.next();
// 							globalFlags.add(condition);

// 							dirValue += ` IF ${tryLinkValue(condition)}`;

// 							let next = iter.next();
// 							if (next === 'IS') dirValue += ` IS ${tryLinkValue(iter.next())}`;
// 							if (next === 'ELSE' || iter.next() === 'ELSE')
// 								dirValue += ` ELSE ${tryLinkValue(iter.next())}`;
// 						}

// 						result[tag][key][property].push(dirValue);
// 					}

// 					retrievingValues = false;
// 				} else {
// 					if (property === 'SYNONYM') synonyms[key].add(iter.current);
// 					else if (property === 'ADJECTIVE') adjectives[key].add(iter.current);
// 					else if (property === 'DESC') {
// 						const desc = iter.current.slice(1, -1);

// 						if (!result[tag][key].aliases.includes(desc))
// 							result[tag][key].aliases.push(desc);

// 						let blacklisted = blacklist.has(desc);
// 						if (!blacklisted) {
// 							for (const _key in synonyms) {
// 								if (!synonyms[_key].has(desc)) continue;

// 								synonyms[_key].delete(desc);
// 								blacklist.add(desc);
// 								blacklisted = true;
// 								break;
// 							}

// 							if (!blacklisted) synonyms[key].add(desc);
// 						}
// 					}
// 					pushToken(iter.current);
// 				}
// 		}
// 	}

// 	return {
// 		OBJECTS: postprocess(result.OBJECT),
// 		ROOMS: postprocess(result.ROOM),
// 		GLOBALS: globalFlags,
// 	};
// }


