declare namespace NodeJS {
	export interface Timer {
		ref(): void;
		unref(): void;
	}
}

declare module "util" {
	export function promisify(original: Function): Function;
}