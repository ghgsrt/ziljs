import { preprocess } from './process';
import { toRecallIter } from './utils';

//? types for ROUTINE execution
export type _ROUTINE = [string, _ROUTINE_ARGS | _COND_ARGS];
export type _INSTRUCTIONS = Array<_ROUTINE>;
export type _ROUTINE_ARGS = Array<_ROUTINE | string | number>;
export type _COND_ARGS = Array<[_ROUTINE, _INSTRUCTIONS]>;

export type PARSER<T> = (iter: ReturnType<typeof toRecallIter>) => T;
export type OBJECT = {
	[key: string]: number | string | Array<string> | Set<string> | undefined;
	tags: Array<string>; // for Obsidian
	aliases: Array<string>; // for Obsidian
	NORTH?: string;
	SOUTH?: string;
	EAST?: string;
	WEST?: string;
	NE?: string;
	NW?: string;
	SE?: string;
	SW?: string;
	UP?: string;
	DOWN?: string;
	IN?: string;
	OUT?: string;
	LAND?: string;
	SYNONYM?: Array<string>; // valid nouns to refer to OBJECT
	ADJECTIVE?: Array<string>; // valid adjectives for OBJECT
	ACTION?: string; // associated ROUTINE called in PERFORM; OBJECT: when PRSO/PRSI; ROOM: called with M-BEG & M-END once each turn, M-ENTER on room enter, M-LOOK for describers
	DESCFN?: string; // ROUTINE for describers to descibe the OBJECT (can be ACTION if handles "OPT" M-OBJDESC or M-OBJDESC?)
	CONTFN?: string; // ROUTINE for when PRSO/PRSI is inside this OBJECT
	GENERIC?: string; // ROUTINE which handles OBJECT ambiguity (unsure what do if parser finds multiple with GENERIC set)
	DESC?: string; // ROOM: before room desc and on status line; OBJECT: verb defaults, player inv, etc. (actual display name)
	SDESC?: string; // mutable DESC
	LDESC?: string; // ROOM: long desc; OBJECT: desc when on ground
	FDESC?: string; // describes OBJECT before the first time it is moved
	LOC?: string; // name of OBJECT or ROOM which contains this OBJECT
	SIZE?: number; // also weight; if undefined, == 5
	CAPACITY?: number; // total size of OBJECTS a container can hold; if undefined, == size
	VALUE?: number; // score value
	TVALUE?: number; // treasure value
	GLOBAL?: Array<string>; // LOCAL-GLOBALS referencable in ROOM
	OWNER?: string; // OBJECT which owns this OBJECT; <OBJECT CAR ... (OWNER CYBIL)> --> "Cybil's car" -> car
	TEXT?: string; // text to display when OBJECT is READ
	PSEUDO?: string; // it's not the 80's anymore, the use case for this is gone; just create a new OBJECT
	PLURAL?: string; // plural form of OBJECT? (not used in source, apparently only 'Stu' knows 🤷🏻‍♂️)
	ADJACENT?: Array<string>; // ROOMs for ADJACENT syntax token??? (somebody find Stu)
	FLAGS?: Set<string>; // TAKEBIT, DOORBIT, etc.; effectively defines generic OBJECT behaviors
	first?: string; // first OBJECT in container (OBJECT must have CONTBIT)
	last?: string; // last OBJECT in container (OBJECT must have CONTBIT)
	next?: string; // next OBJECT in linked LOCs
	prev?: string; // previous OBJECT in linked LOCs (for doubly linking)
};
export type ROOM = OBJECT;
export type ROUTINE = {
	tells: string[]; // sequestered for much easier postprocessing
	arguments: {
		[key: string]: Array<string | any> | undefined; // typescript sucks ("no index signature of type string" 🤪)
		_?: Array<any>; // argument values
		req?: Array<string>; // names & order of required arguments
		opt?: Array<string>; // " optional arguments
		aux?: Array<string>; // " local variables
	};
	main: _INSTRUCTIONS;
};
export type TABLE<T = undefined> = T extends Array<infer U>
	? T
	: Array<string | number | boolean | OBJECT | ROOM | ROUTINE | TABLE>;
export type GLOBAL = string | number | boolean | TABLE;
export type CONSTANT = number;

const directions = [
	'NORTH',
	'SOUTH',
	'EAST',
	'WEST',
	'NE',
	'NW',
	'SE',
	'SW',
	'UP',
	'DOWN',
	'IN',
	'OUT',
	'LAND',
] as const;
export type Direction = (typeof directions)[number];

const getAliases = (name: string) => [
	name,
	name
		.split('-')
		.map((word) => word[0] + word.slice(1).toLowerCase())
		.join(' '),
];

const blacklist = new Set<string>();
const synonyms: Record<string, Set<string>> = {};
const adjectives: Record<string, Set<string>> = {};

const FLAGS = [
	'NONLANDBIT',
	'SACREDBIT',
	'WEARBIT',
	'STAGGERED',
	'FIGHTBIT',
	'TRANSBIT',
	'SEARCHBIT',
	'SURFACEBIT',
	'TOUCHBIT',
	'INVISIBLE',
	'OPENBIT',
	'RLANDBIT',
	'TRYTAKEBIT',
	'NDESCBIT',
	'TURNBIT',
	'READBIT',
	'TAKEBIT',
	'CONTBIT',
	'ONBIT',
	'FOODBIT',
	'DRINKBIT',
	'DOORBIT',
	'CLIMBBIT',
	'RMUNGBIT',
	'FLAMEBIT',
	'BURNBIT',
	'VEHBIT',
	'TOOLBIT',
	'WEAPONBIT',
	'ACTORBIT',
	'LIGHTBIT',
];
const FX = (flag: string) => {
	const flagIdx = FLAGS.indexOf(flag) + 1;
	if (flagIdx === 0) return 0;
	return 1 << (15 - (flagIdx < 16 ? flagIdx : flagIdx % 16));
};

// type __OBJECT = ['flags 1-15','flags 16-31', 'in', 'next', 'first', 'prop table'];
// type OBJPRP = TABLE<['temp', 'temp2']>;
const _PS = [
	'BUZZ-WORD',
	'PREPOSITION',
	'DIRECTION',
	'ADJECTIVE',
	'VERB',
	'OBJECT',
] as const;
const _P1 = ['OBJECT', 'VERB', 'ADJECTIVE', 'DIRECTION'] as const;
const PS = (ps: (typeof _PS)[number]) => 1 << (_PS.indexOf(ps) + 2);
const P1 = (p1: (typeof _P1)[number]) => _P1.indexOf(p1);

const _B: Array<string> = []; // buzz-words
const _PR: Array<string> = []; // prepositions
const _A: Array<string> = []; // adjectives
const _ACT: Array<string> = []; // syntax verbs
const _V: Array<string> = []; // verb routines
const _P: Array<string> = []; // properties
const _STR: Array<string> = []; // strings
const B = (b: string) => _B.indexOf(b);
const PR = (pr: string) => _PR.indexOf(pr);
const A = (a: string) => _A.indexOf(a);
const ACT = (act: string) => _ACT.indexOf(act);
const V = (v: string) => _V.indexOf(v);
const P = (p: string) => _P.indexOf(p);
const STR = (str: string) => _STR.indexOf(str);

// verbs = routines w/ prefix nuked
// actions = syntax verb words

// note, if synonym, act of synonym
// PS?B -> S:B?W
// PS?V+P1?V -> S:ACT?W
// PS?O+PS?V+P1?O -> S:O?ANY, F:ACT?W
// PS?O+PS?A+P1?A -> S:A?W, F:O?ANY
// PS?V+PS?D+P1?D -> S:D?W, F:ACT?W
// PS?A+P1?A -> S:A?W
// PS?A+PS?D+P1?A -> S:A?W, F:D?W
// PS?D+PS?P+P1?O -> S:PR?W, F:D?W
// PS?D+P1?D -> S:D?W
// PS?P+P1?O -> S:PR?W
// O > ACT
// A > O
// D > ACT
// A > D
// PR > D
// A > O > PR > D > ACT

export type TABLE_TYPE = 'NONE' | 'BYTE' | 'WORD';
export type TABLE_MOD = 'LENGTH' | 'PURE';
export type TABLE_FLAG = TABLE_TYPE | TABLE_MOD;

function TABLE(flags: Array<TABLE_FLAG>, args: Array<number | string>) {
	const table: Array<number> = [];

	if (flags.includes('LENGTH')) {
		if (flags.includes('BYTE')) table.push(args.length);
		else {
			const len = args.length;
			const high = (len & 0xff00) >> 8;
			const low = len & 0xff;
			table.push(high);
			table.push(low);
		}
	}

	for (const arg of args) {
		const toPush = typeof arg === 'string' ? _STR.push(arg) - 1 : arg;

		if (flags.includes('BYTE')) {
			table.push(toPush);
			continue;
		}

		const high = (toPush & 0xff00) >> 8;
		const low = toPush & 0xff;
		table.push(high);
		table.push(low);
	}

	return table;
}
function ITABLE(len: number): Array<number>;
function ITABLE(flag: TABLE_TYPE, len: number): Array<number>;
function ITABLE(flag: TABLE_TYPE, len: number, def: number): Array<number>;
function ITABLE(
	len: number,
	flags: Array<TABLE_FLAG | 'LEXV'>,
	defs?: number | [number | undefined, number | undefined, number | undefined]
): Array<number>;
function ITABLE(...args: any[]) {
	if (args.length === 1) return _ITABLE(args[0]);

	if (args.length === 2 && !Array.isArray(args[1]))
		return _ITABLE(args[1], [args[0]]);

	if (typeof args[0] === 'string')
		return _ITABLE(args[2], [args[0] as TABLE_FLAG], args[1]);

	return _ITABLE(args[0], args[1], args[2]);
}
const _ITABLE = (
	len: number,
	flags: Array<TABLE_FLAG | 'LEXV'> = [],
	def?: number | [number | undefined, number | undefined, number | undefined]
) => {
	const table: Array<number> = [];

	const isLEXV = flags.includes('LEXV');

	if (flags.includes('LENGTH')) {
		if (flags.includes('BYTE')) table.push(len);
		else {
			if (isLEXV) len *= 3;
			const high = (len & 0xff00) >> 8;
			const low = len & 0xff;
			table.push(high);
			table.push(low);
		}
	}

	for (let i = 0; i < len; i++) {
		if (flags.includes('BYTE')) {
			table.push((def as number) ?? 0);
			continue;
		}

		if (isLEXV) {
			const high = ((def?.[0] ?? 0) & 0xff00) >> 8;
			const low = (def?.[0] ?? 0) & 0xff;
			table.push(high);
			table.push(low);
		}

		table.push((Array.isArray(def) ? def?.[1] : def) ?? 0);
		table.push((Array.isArray(def) ? def?.[2] : def) ?? 0);
	}

	return table;
};

const parseObjectOrRoom: PARSER<OBJECT | ROOM> = (iter) => {
	const result: OBJECT | ROOM = {
		tags: [iter.prev.toLowerCase()],
		aliases: getAliases(iter.current),
	};

	let name = iter.current;
	let property: string;

	while (iter.next() !== '>') {
		property = iter.next();

		if (directions.includes(property as Direction)) {
			//! KEEP IN MIND PARSER NEEDS TO SOMEHOW BE FED 'PER'
			result[property] = '';
			while (iter.next() !== ')') result[property] += iter.current;
			continue;
		}

		if (property === 'DESC') {
			const desc = iter.current.slice(1, -1);

			if (!result.aliases.includes(desc)) result.aliases.push(desc);

			let blacklisted = blacklist.has(desc);
			if (!blacklisted) {
				for (const key in synonyms) {
					if (!synonyms[key].has(desc)) continue;

					synonyms[key].delete(desc);
					blacklist.add(desc);
					blacklisted = true;
					break;
				}

				if (!blacklisted) synonyms[name].add(desc);
			}

			result[property] = desc;
			continue;
		}

		result[property] = [];
		while (iter.next() !== ')')
			(result[property]! as Array<string>).push(iter.current);
	}

	return result;
};
const parseRoutine: PARSER<ROUTINE> = (iter) => {};
const parseTable: PARSER<TABLE> = (iter) => {
	const flags: Array<TABLE_FLAG | 'LEXV'> = [];
	let len: number;
	let def: number | Array<number>;

	if (iter.current === 'ITABLE') {
		if (['NONE', 'BYTE', 'WORD'].includes(iter.next())) {
			flags.push(iter.current as TABLE_FLAG);
			len = Number(iter.next());
			def = Number(iter.next());
			return ITABLE(len, flags, def);
		}

		len = Number(iter.current);

		if (iter.next() === '>') return ITABLE(len);
		//@ts-ignore
		if (iter.current !== '(') return ITABLE(len, flags, Number(iter.current));

		while (iter.next() !== ')') flags.push(iter.current);

		if (flags.includes('LEXV')) {
			while (iter.next() !== '>')
				((def ??= []) as Array<number>).push(iter.current);

			return ITABLE(
				len,
				flags,
				def! as [number | undefined, number | undefined, number | undefined]
			);
		}

		def = Number(iter.next());
		iter.next(); //? '>'
		return ITABLE(len, flags, def);
	}

	if (iter.current === 'PTABLE') flags.push('PURE');
	else if (iter.current === 'LTABLE') flags.push('LENGTH');
	else if (iter.current === 'PLTABLE') flags.push('PURE', 'LENGTH');

	if (iter.next() === '(')
		while (iter.next() !== ')') flags.push(iter.current as TABLE_FLAG);

	const args: Array<number | string> = [];
	while (iter.next() !== '>') args.push(iter.current);

	return TABLE(flags as Array<TABLE_FLAG>, args);
};

export function parser(input: string) {
	const FLAGS: Set<string> = new Set();
	const types: {
		CONSTANT: Record<string, CONSTANT>;
		GLOBAL: Record<string, GLOBAL>;
		OBJECT: Record<string, OBJECT>;
		ROOM: Record<string, ROOM>;
		ROUTINE: Record<string, ROUTINE>;
	} = {
		CONSTANT: {},
		GLOBAL: {},
		OBJECT: {},
		ROOM: {},
		ROUTINE: {},
	};
	const iter = toRecallIter(preprocess(input));

	const parseStatment = () => {
		if (iter.next() === '<') {
			if (iter.next() === '>') return false;
			if (!iter.current.includes('TABLE')) {
				console.log('bro huhhhh', iter.current);
				return false;
			}

			return parseTable(iter);
		}

		iter.next(); //? '>'
		return iter.prev;
	};

	const _parseOoR = () => {
		const temp = parseObjectOrRoom(iter);
		if (temp.FLAGS) for (const flag of temp.FLAGS) FLAGS.add(flag);
		return temp;
	};

	const parse = {
		CONSTANT: parseStatment,
		GLOBAL: parseStatment,
		OBJECT: _parseOoR,
		ROOM: _parseOoR,
		ROUTINE: parseRoutine,
	};

	while (iter.next() || !iter.done) {
		if (iter.current !== '<') {
			console.log('uhhh wtf', iter.current);
			break;
		}

		types[iter.next()][iter.next()] = parse[iter.prev]();
	}

	return {
		FLAGS,
		CONSTANTS: types.CONSTANT,
		GLOBALS: types.GLOBAL,
		OBJECTS: types.OBJECT,
		ROOMS: types.ROOM,
		ROUTINES: types.ROUTINE,
	};
}
