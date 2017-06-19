import { Entry } from "./Cache/Entry";
import * as File from "../File";
import { Key } from "./Cache/Key";
import * as Process from "process";
import { Redis } from "./Cache/Redis";
import * as Util from "util";

const REDIS: Redis = new Redis(Process.env.npm_package_config_redisSocketPath);

// TODO: maybe something to clean up cache periodically or something?

type Splitter = { [Symbol.split](string: string, limit?: number): Array<string> };

export interface CacheHeaders {
	["cache-control"]?: string;
	["content-length"]?: string;
	["content-type"]?: string;
	etag?: string;
	expires?: string;
}

const HeaderValueSplitter: Splitter = { [Symbol.split]: (string: string, limit?: number): Array<string> => string.toLowerCase().split(",", limit).map<string>((string: string): string => string.trim()) };

function clearCache(): void {
	REDIS.flush().catch(console.error);
	File.unlinkDirFiles(Process.env.npm_package_config_cacheDirectory).catch(console.error);
}

export function isEntry(object: any): object is Entry {
	return object !== false;
}

export async function query(url: string): Promise<Entry | boolean> {
	const hash: string = Key.from(url).hash;
	const record: Entry.Object | null = await REDIS.getObject<Entry.Object>(hash);

	if (!record)
		return false;
	return new Entry(hash, record);
}

async function _set(hash: string, headers: CacheHeaders): Promise<Entry | boolean> {
	const created: number = Date.now();
	const etag: string = headers.etag ? headers.etag : "";
	const mimeType: string = headers["content-type"] ? headers["content-type"]! : Process.env.npm_package_config_defaultMimeType;
	let expires: number | undefined;
	let size: number = headers["content-length"] ? Number.parseInt(headers["content-length"]!) : 0;

	if (!Number.isFinite(size))
		size = 0;

	if (headers["cache-control"]) {
		const cacheControl: Array<string> = headers["cache-control"]!.split(HeaderValueSplitter);

		if (cacheControl.some((value: string): boolean => value === "no-cache"))
			if (etag === "")
				return false;
			else
				expires = created;
		else if (cacheControl.some((value: string): boolean => value.startsWith("max-age")))
			expires = created + cacheControl.reduce<number>((expires: number, value: string): number => value.startsWith("max-age") ? Number.parseInt(value.slice(8)) * 1000 : expires, 0);
	}

	if (expires !== undefined && expires < created)
		expires = undefined;

	if (expires === undefined && headers.expires)
		try {
			const expiresDate: Date = new Date(headers.expires);
			expires = expiresDate.valueOf();
			
			if (expires < created)
				return false;
		} catch (e) {
			return false;
		}

	if (expires === undefined)
		if (etag === "")
			return false;
		else
			expires = created;

	const record: Entry.Object = { created, etag, expires, mimeType, size };
	return (REDIS.setObject<Entry.Object>(hash, record)) ? new Entry(hash, record) : false;
}

export async function set(url: string, headers: CacheHeaders): Promise<Entry | boolean> {
	const hash: string = Key.from(url).hash;
	const result: Entry | boolean = await _set(hash, headers);

	if (!isEntry(result))
		REDIS.del(hash);
	return result;
}

export { Entry } from "./Cache/Entry";

clearCache();

// async function test(): Promise<void> {
// 	console.log("for fubar, aka ", Key.from("fubar").hash);
// 	console.log("does fubar exist?");
// 	console.log(await query("fubar"));
// 	console.log("setting fubar");
// 	console.log(await set("fubar", { etag: "this is an etag", ["content-type"]: "text/plain", ["content-length"]: "42", expires: "Thu, 15 Jun 2017 17:06:44 GMT" }));
// 	console.log("getting fubar");
// 	console.log(await query("fubar"));
// 	console.log("deleting fubar");
// 	REDIS.client.del(Key.from("fubar").hash);
// }

// test().catch(console.error);