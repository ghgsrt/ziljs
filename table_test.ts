import { TABLE_FLAG, PARSER, TABLE, TABLE_MOD, TABLE_TYPE } from './parser';
import { preprocess } from './process';
import { toRecallIter } from './utils';

const _STR: Array<string> = [];

// const isNumeric = (str: string) => /^\d+$/.test(str);

const isNumeric = (str: string) => +str === +str;
const resolveNumOrStr = (str: string) => (isNumeric(str) ? Number(str) : str);
const toHigh = (num: number) => (num & 0xff00) >> 8;
const toLow = (num: number) => num & 0xff;
const toNum = (high: number, low: number) => (high << 8) | low;

function TABLE(
	flags: Array<TABLE_FLAG | 'LEXV'> | string,
	args: Array<number | string> | number,
	def?: number,
	defLex1?: number,
	defLex2?: number
) {
	const table: Array<number> = [];

	const len = typeof args === 'number' ? args : args.length;
	const isLEXV = flags.includes('LEXV');

	for (let i = 0; i < len; i++) {
		const arg = Number((args as Array<string | number>)[i]);
		// const arg = typeof _arg === 'string' ? _STR.push(_arg) - 1 : _arg;

		if (flags.includes('BYTE')) {
			table.push(def ?? arg);
			continue;
		}

		if (isLEXV) table.push(toHigh(def ?? 0), toLow(def ?? 0));

		table.push(
			defLex1 ?? toHigh(def ?? arg ?? 0),
			defLex2 ?? toLow(def ?? arg ?? 0)
		);
	}

	if (flags.includes('LENGTH')) {
		if (flags.includes('BYTE')) table.unshift(table.length);
		else {
			let len = table.length;
			if (isLEXV) len *= 0.75;
			table.unshift(toHigh(len), toLow(len));
		}
	}

	table.PUT = (index: number, value: number) => {
		const realIdx = index * 2;
		table[realIdx] = toHigh(value);
		table[realIdx + 1] = toLow(value);
	};
	table.GET = (index: number) => {
		const realIdx = index * 2;
		const high = table[realIdx];
		const low = table[realIdx + 1];
		return toNum(high, low);
	};

	table.PUTB = (index: number, value: number) => (table[index] = value);
	table.GETB = (index: number) => table[index];

	return table;
}

const parseTable: PARSER<TABLE> = (iter) => {
	const flags: Array<TABLE_MOD | 'LEXV'> | Array<TABLE_FLAG> = [];
	let len: number;
	let def: number | Array<number>;

	if (iter.current === 'ITABLE') {
		if (['NONE', 'BYTE', 'WORD'].includes(iter.next()))
			return TABLE(
				iter.current as TABLE_TYPE,
				Number(iter.next()),
				Number(iter.next()) || 0 //? may be NaN
			);

		len = Number(iter.current);

		if (iter.next() === '>') return TABLE(flags, len);
		// @ts-ignore
		if (iter.current !== '(') return TABLE(flags, len, Number(iter.current)); //! might still need to move iter forward

		while (iter.next() !== ')') flags.push(iter.current);

		//@ts-ignore
		if (flags.includes('LEXV')) {
			while (iter.next() !== '>')
				((def ??= []) as Array<number>).push(Number(iter.current));

			return TABLE(
				flags as Array<TABLE_MOD | 'LEXV'>,
				len,
				...(def! as [
					number | undefined,
					number | undefined,
					number | undefined
				])
			);
		}

		def = Number(iter.next());
		iter.next(); //? '>'
		return TABLE(flags, len, def);
	}

	if (iter.current === 'PTABLE') flags.push('PURE');
	else if (iter.current === 'LTABLE') flags.push('LENGTH');
	else if (iter.current === 'PLTABLE') flags.push('PURE', 'LENGTH');

	const args: Array<number | string> = [];

	if (iter.next() === '(')
		while (iter.next() !== ')')
			(flags as Array<TABLE_FLAG>).push(iter.current as TABLE_FLAG);
	else args.push(resolveNumOrStr(iter.current));

	while (iter.next() !== '>') args.push(resolveNumOrStr(iter.current));

	return TABLE(flags as Array<TABLE_FLAG>, args);
};

const test = (tableStr: string) => {
	// const iter = toRecallIter(tableStr.split(' '));
	const iter = toRecallIter(preprocess(tableStr));
	iter.next(); //? get first element
	const temp = parseTable(iter);
	console.log(temp);
	return temp;
};

// const PUT = (table: TABLE, index: number, value: number) => {
// 	const high = (value & 0xff00) >> 8;
// 	const low = value & 0xff;
// 	const realIdx = index * 2;
// 	table[realIdx] = high;
// 	table[realIdx + 1] = low;
// };
// const GET = (table: TABLE, index: number) => {
// 	const realIdx = index * 2;
// 	const high = table[realIdx];
// 	const low = table[realIdx + 1];
// 	return (high << 8) | low;
// };
// const PUTB = (table: TABLE, index: number, value: number) =>
// 	(table[index] = value & 0xff);
// const GETB = (table: TABLE, index: number) => table[index];

// test('TABLE 1 2 3 4 5 6 7 >');
// test('TABLE ( BYTE ) 1 2 3 4 5 6 7 >');
// test('TABLE ( BYTE LENGTH ) 1 2 3 4 5 6 7 >');
// test('LTABLE 1 2 3 4 5 6 7 >');
// test('LTABLE ( BYTE ) 1 2 3 4 5 6 7 >');
// test('PTABLE 1 2 3 4 5 6 7 >');
// test('PTABLE ( BYTE ) 1 2 3 4 5 6 7 >');
// test('PLTABLE 1 2 3 4 5 6 7 >');
test('PLTABLE ( BYTE ) 1 2 3 4 5 6 7 >');
const WIT = test('ITABLE 5 >');
// test('ITABLE 5 1 >');
// test('ITABLE 5 ( BYTE ) 1 >');
const BIT = test('ITABLE BYTE 5 >');
// test('ITABLE BYTE 5 1 >');
test('ITABLE 5 ( LENGTH BYTE ) 1 >');
// test('ITABLE 5 ( LEXV ) 1 2 3 >');
const LIT = test('ITABLE 5 ( LEXV LENGTH ) 1 2 3 >');
