/// <reference path="../../@types/HighwayHash.d.ts" />
import { Buffer } from "buffer";
import * as HighwayHash from "highwayhash";
// key is hash of url
const DIGITS: string = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const SALT: Buffer = Buffer.from([0xfd, 0x68, 0xf1, 0x4b, 0x16, 0x18, 0xcc, 0xcf, 0x39, 0x69, 0x22, 0xab, 0x47, 0xd3, 0xa6, 0x69, 0xa1, 0xd4, 0xc4, 0x99, 0xdd, 0xd7, 0x98, 0x7c, 0xe5, 0x05, 0xa9, 0x76, 0xee, 0x09, 0x4b, 0xb3]);

export class Key {
	private static cache = new Map<string, string>();

	private _hashBase64: string | undefined;
	private _hashNumericString: string;
	private _urlBuffer: Buffer;
	public readonly url: string;

	public static from(url: string): Key { return new this(url); }

	constructor(url: string) {
		this.url = url;

		if (Key.cache.has(url))
			this._hashBase64 = Key.cache.get(url);
	}

	public get hash(): string { return this.hashBase64; }
	public get hashBase64(): string { return (this._hashBase64 !== undefined) ? this._hashBase64 : Uint64.from(this.hashNumericString).toBase62(); }
	public get hashNumericString(): string { return (this._hashNumericString !== undefined) ? this._hashNumericString : HighwayHash.asString(SALT, this.urlBuffer); }
	public get urlBuffer(): Buffer { return this._urlBuffer ? this._urlBuffer : this._urlBuffer = Buffer.from(this.url); }
	public get value(): string { return this.hash; }
	public get [Symbol.toStringTag](): "Request.Cache.Key" { return "Request.Cache.Key"; }

	public toJSON(): string { return this.toString(); }
	public toString(): string { return this.value; }
	public [Symbol.toPrimitive](hint: "default" | "number" | "string"): string { return this.toString(); }
}

class Uint64 {
	private _value: [number, number];

	public static from(string: string): Uint64 { return new this(string); }

	constructor(highLowTuple: [number, number]);
	constructor(string: string);
	constructor(highLowTupleOrString: [number, number] | string) {
		if (Array.isArray(highLowTupleOrString))
			this._value = highLowTupleOrString;
		else
			this._value = [Number.parseInt(highLowTupleOrString.slice(0, highLowTupleOrString.length - 10)), Number.parseInt(highLowTupleOrString.slice(-10))];
	}

	public div(x: number): Uint64 {
		if (this._value[0] < 1e4)
			return new Uint64([0, Math.floor((this._value[0] * 1e10 + this._value[1]) / x)]);
		const calc: [number, number] = this._value.map<number>((y: number): number => y / x);
		return new Uint64([Math.floor(calc[0]), Math.floor(calc[1] + this._value[0] % x / x * 1e10)]);
	}

	public isGreaterThanZero(): boolean { return this._value.some((x: number): boolean => x > 0); }

	public mod(x: number): number {
		if (this._value[0] < 1e4)
			return (this._value[0] * 1e10 + this._value[1]) % x;
		const calc: [number, number] = this._value.map<number>((y: number): number => y % x);
		return (calc[0] * 1e10 + calc[1]) % x;
	}

	public toBase62(): string {
		let [quotient, remainder]: [Uint64, number] = [this.div(62), this.mod(62)];
		let result: string = DIGITS.charAt(remainder);

		while (quotient.isGreaterThanZero()) {
			[quotient, remainder] = [quotient.div(62), quotient.mod(62)];
			result = DIGITS.charAt(remainder) + result;
		}
		return result;
	}
}