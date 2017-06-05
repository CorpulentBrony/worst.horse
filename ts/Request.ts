import { Buffer } from "buffer";
import * as Http from "http";
import * as Https from "https";
import * as Process from "process";
import * as Stream from "stream";
import * as Url from "url";
import * as Zlib from "zlib";

const ACCEPT_ENCODING: string = "deflate, gzip";
const USER_AGENT: string = `${Process.env.npm_package_name}/${Process.env.npm_package_version} (${Process.platform}; ${Process.arch}; ${ACCEPT_ENCODING}; +${Process.env.npm_package_homepage}) node/${Process.version}`;

export async function binary(url: Url.URL): Promise<Buffer> {
	const response: Stream.Transform | undefined = await stream(url);
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

export async function json<T>(url: Url.URL): Promise<T> {
	const data: Buffer = await binary(url);
	return JSON.parse(data.toString("utf8"));
}

export async function stream(url: Url.URL): Promise<Stream.Transform> {
	return new Promise<Stream.Transform>((resolve: (value: Stream.Transform | PromiseLike<Stream.Transform>) => void, reject: (reason?: any) => void): void => {
		Https.request(Object.assign(Url.parse(url.toString()), { ["accept-encoding"]: ACCEPT_ENCODING, connection: "keep-alive", ["user-agent"]: USER_AGENT }), (response: Http.IncomingMessage): void => {
			let error: Error | undefined;

			if (response.statusCode === 304)
				resolve.call(undefined, new Stream.PassThrough());

			if (response.statusCode !== undefined && response.statusCode !== 200)
				error = new Error("HTTPS request failed.  Status code: " + response.statusCode.toString());

			if (error !== undefined) {
				reject(error);
				response.resume();
				return;
			}

			switch (response.headers["content-encoding"]) {
				case "gzip":
					resolve.call(undefined, response.pipe(Zlib.createGunzip()));
					break;
				case "deflate":
					resolve.call(undefined, response.pipe(Zlib.createInflate()));
					break;
				default:
					resolve.call(undefined, response);
			}
		})
		.on("error", reject)
		.end();
	});
}