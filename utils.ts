const itPrototype = Object.getPrototypeOf(
	Object.getPrototypeOf([][Symbol.iterator]())
);
export const toRecallIter = (
	iterOrIterable: Array<string> | IterableIterator<string>
) => {
	const _iter =
		Symbol.iterator in iterOrIterable
			? iterOrIterable[Symbol.iterator]()
			: iterOrIterable;

	const iter = Object.create(itPrototype);

	let current: string;
	let prev: string;
	let done: boolean | undefined;
	let idx = 0;

	return {
		...iter,
		next() {
			const { value, done: _done } = _iter.next();
			if (value !== undefined) idx++;
			prev = current;
			current = value;
			done = _done;
			return value;
		},
		get current() {
			return current;
		},
		get prev() {
			return prev;
		},
		get done() {
			return done;
		},
		get index() {
			return idx;
		},
	} as {
		next(): string;
		get current(): string;
		get prev(): string;
		get done(): boolean | undefined;
		get index(): number;
	};
};