declare module "highwayhash" {
	import { Buffer } from "buffer";

	type HashFunction<T> = (key: Buffer, input: Buffer) => T;
	
	export const asBuffer: HashFunction<Buffer>;
	export const asHexString: HashFunction<string>;
	export const asString: HashFunction<string>;
	export const asUInt32High: HashFunction<number>;
	export const asUInt32Low: HashFunction<number>;
}