/// <reference path="./Promisify.d.ts" />
import * as Buffer from "buffer";
import * as Crypto from "crypto";
import { Map } from "../CustomTypes/Map";
import * as Util from "util";

// upperLimit is NON-INCLUSIVE
export async function integer(upperLimit: number): Promise<number> {
	if (upperLimit <= 1)
		return 0;
	const numBytes: number = Math.ceil(Math.log2(upperLimit) / 8);
	const randomBytes: Buffer = await Util.promisify(Crypto.randomBytes)(numBytes);
	const randomByteString: string = randomBytes.toString("hex");
	const randomNum: number = Number.parseInt(randomByteString, 16);
	return randomNum / (1 << (numBytes << 3)) * upperLimit >>> 0;
}

// https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
export async function shuffle<Value>(array: Array<Value>): Promise<Array<Value>> {
	if (array.length <= 1)
		return array;
	return array.reduce<Promise<Array<Value>>>(async (final: Promise<Array<Value>>, value: Value, i: number): Promise<Array<Value>> => {
		const j: number = await integer(i + 1);
		const result: Array<Value> = await final;

		if (i !== j)
			result[i] = result[j];
		result[j] = value;
		return result;
	}, Promise.resolve(new Array<Value>(array.length)));
}

type WeightedMap<T> = {
	length?: number;
	size?: number; 

	reduce<U extends number>(callback: (sum: U, weight: number) => U, begin: number): U;
	forEach(callback: (weight: number, item: T) => void): void;
} & ({ length: number } | { size: number });

export async function weighted<T>(map: WeightedMap<T>, sum?: number): Promise<T> {
	if (sum === undefined)
		sum = map.reduce<number>((sum: number, weight: number): number => sum + weight, 0);
	const length: number = (map.size !== undefined) ? map.size : (map.length !== undefined) ? map.length : 0;
	let random: number = await integer(sum);
	let result: T | undefined;
	map.forEach((weight: number, item: T): void => {
		if (result === undefined && random <= weight)
			result = item;
		random -= weight;
	});

	if (result === undefined)
		throw new Error("Could not pick a random value based on the given weighted information.");
	return result;
}