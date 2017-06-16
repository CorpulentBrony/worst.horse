import { Buffer } from "buffer";
import * as Cache from "./Request/Cache";
import * as File from "./File";
import * as Http from "http";
import * as Https from "https";
import * as Process from "process";
import * as Stream from "stream";
import * as Url from "url";
import * as Zlib from "zlib";

const ACCEPT_ENCODING: string = Process.env.npm_package_config_requestAcceptEncoding;
const USER_AGENT: string = `${Process.env.npm_package_name}/${Process.env.npm_package_version} (${Process.platform}; ${Process.arch}; ${ACCEPT_ENCODING}; +${Process.env.npm_package_homepage}) node/${Process.version}`;

export async function binary(url: Url.URL, additionalHeaders?: { [header: string]: string }): Promise<Buffer> {
	const response: Stream.Readable = await stream(url, additionalHeaders);
	const buffers = new Array<Buffer>();
	let length: number = 0;
	response.on("data", (chunk: Buffer): void => {
		buffers.push(chunk);
		length += chunk.length;
	});
	return new Promise<Buffer>((resolve: (value: Buffer | PromiseLike<Buffer>) => void, reject: (reason?: any) => void): void => {
		response.on("end", (): void => {
			resolve.call(undefined, Buffer.concat(buffers, length));
		});
	});
}

export const buffer: (url: Url.URL, additionalHeaders?: { [header: string]: string }) => Promise<Buffer> = binary;
export async function json<T>(url: Url.URL, additionalHeaders?: { [header: string]: string }): Promise<T> { return JSON.parse(await text(url, additionalHeaders)); }

export async function stream(url: Url.URL, additionalHeaders: { [header: string]: string } = {}): Promise<Stream.Readable> {
	const urlString: string = url.toString();
	let cacheEntry: Cache.Entry | boolean = await Cache.query(urlString);
	let etag: string | undefined;

	if (Cache.isEntry(cacheEntry) && await cacheEntry.fileExists)
		if (cacheEntry.isExpired)
			additionalHeaders["if-none-matched"] = cacheEntry.etag;
		else
			return cacheEntry.file.readStream();
	additionalHeaders = Object.assign(additionalHeaders, { ["accept-encoding"]: ACCEPT_ENCODING, connection: "keep-alive", ["user-agent"]: USER_AGENT });
	return new Promise<Stream.Readable>((resolve: (value: Stream.Readable | PromiseLike<Stream.Readable>) => void, reject: (reason?: any) => void): void => {
		Https.request(Object.assign(Url.parse(urlString), { headers: additionalHeaders }), async (response: Http.IncomingMessage): Promise<void> => {
			let error: Error | undefined;
			
			if (response.statusCode === 304) {
				resolve.call(undefined, Cache.isEntry(cacheEntry) ? cacheEntry.file.readStream() : new Stream.PassThrough());
				Cache.set(urlString, response.headers);
				return;
			}

			if (response.statusCode !== undefined && response.statusCode !== 200)
				error = new Error("HTTPS request failed.  Status code: " + response.statusCode.toString());

			if (error !== undefined) {
				reject(error);
				response.resume();
				return;
			}

			cacheEntry = await Cache.set(urlString, response.headers);
			const saveThroughStream: Stream.Transform = Cache.isEntry(cacheEntry) ? cacheEntry.file.saveThroughStream : new Stream.PassThrough();
			switch (response.headers["content-encoding"]) {
				case "gzip":
					resolve.call(undefined, response.pipe(Zlib.createGunzip()).pipe(saveThroughStream));
					break;
				case "deflate":
					resolve.call(undefined, response.pipe(Zlib.createInflate()).pipe(saveThroughStream));
					break;
				default:
					resolve.call(undefined, response.pipe(saveThroughStream));
			}
		})
		.on("error", reject)
		.end();
	});
}

export const string: (url: Url.URL, additionalHeaders?: { [header: string]: string }) => Promise<string> = text;

export async function text(url: Url.URL, additionalHeaders?: { [header: string]: string }): Promise<string> {
	const data: Buffer = await binary(url, additionalHeaders);
	return data.toString(Process.env.npm_package_config_defaultTextEncoding);
}