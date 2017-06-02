/// <reference path="./image.d.ts" />
import * as Buffer from "buffer";
import * as Fs from "fs";
import * as Http from "http";
import * as Https from "https";
import * as Net from "net";
import * as Process from "process";
import * as Stream from "stream";
import * as Timers from "timers";
import * as Url from "url";
import * as Util from "util";
import * as Zlib from "zlib";

const ACCEPT_ENCODING: string = "deflate, gzip";
const APP_URL: string = "https://worst.horse";
const BUFFER_SECONDS: number = 30;
const SOCKET_FILE: string = "/var/www/html/worst.horse/image";
const USER_AGENT: string = `worst.horse/1.0.0 (${Process.platform}; ${Process.arch}; ${ACCEPT_ENCODING}; +${APP_URL}) node/${Process.version}`;

type ListeningListenerFunction = (err?: Error, success?: void) => void;
type ListenFunction = (path: string, listeningListener?: ListeningListenerFunction) => Net.Server;

interface DerpibooruImage {
	downvotes: number;
	faves: number;
	file_name: string;
	id: string;
	image: string;
	score: number;
	tags: string;
	uploader: string;
	upvotes: number;
}

interface DerpibooruSearchResults {
	search: Array<DerpibooruImage>;
	total: number;
}

class ElapsedTime {
	public begin: [number, number];
	private timer: NodeJS.Timer;

	private static tupleToSeconds(tuple: [number, number]): number { return tuple[0] + tuple[1] / 1e9; }

	constructor(begin: [number, number] = Process.hrtime(), ttlSeconds?: number) {
		this.update(begin);

		if (ttlSeconds !== undefined)
			this.timer = Timers.setInterval(this.update.bind(this), ttlSeconds * 1e3);
	}

	public get seconds(): number { return ElapsedTime.tupleToSeconds(Process.hrtime(this.begin)); }

	public update(begin: [number, number] = Process.hrtime()): number {
		const elapsed: number = this.seconds;
		this.begin = begin;
		return elapsed;
	}
}

const elapsedTime = new ElapsedTime();

async function requestHandler(request: Http.IncomingMessage, response: Http.ServerResponse): Promise<void> {
	const url = new Url.URL("https://derpibooru.org/search.json");
	const query = new Url.URLSearchParams({ q: "applejack" });
	url.search = query.toString();
	const searchResults: DerpibooruSearchResults = await new Promise<DerpibooruSearchResults>((resolve: (value: DerpibooruSearchResults | PromiseLike<DerpibooruSearchResults>) => void, reject: (reason?: any) => void): void => {
		Https.request(url.toString(), (response: Http.IncomingMessage): void => {
			let error: Error | undefined;

			if (response.statusCode === 304)
				resolve.call(undefined, undefined);

			if (response.statusCode !== undefined && response.statusCode !== 200)
				error = new Error("HTTPS request failed.  Status code: " + response.statusCode.toString());
			else if (!/^application\/json/.test(response.headers["content-type"]))
				error = new Error("Invalid content-type for HTTPS request.  Expected application/json but received " + response.headers["content-type"]);

			if (error !== undefined) {
				reject(error);
				response.resume();
				return;
			}
			const finalize = new Stream.PassThrough();
			let objectString: string = "";
			finalize.on("data", (chunk: Buffer): void => { objectString += chunk.toString(); });
			finalize.on("end", (): void => {
				try { resolve.call(undefined, JSON.parse(objectString)); }
				catch (err) { reject(err); }
			});

			switch (response.headers["content-encoding"]) {
				case "gzip":
					response.pipe(Zlib.createGunzip()).pipe(finalize);
					break;
				case "deflate":
					response.pipe(Zlib.createInflate()).pipe(finalize);
					break;
				default:
					response.pipe(finalize);
			}
		})
		.on("error", reject)
		.end();
	});
	console.log(request.url);
	response.end(JSON.stringify(searchResults));
}

	// 	return new Promise<T>((resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void): void => {
	// 		Https.request(this.buildRequestOptions(method, query), (response: Http.IncomingMessage): void => {
	// 			let error: Error;

	// 			if (response.statusCode === 304)
	// 				resolve.call(this, undefined);

	// 			if (response.statusCode !== 200)
	// 				error = new Error("HTTPS request failed.  Status code: " + response.statusCode.toString());
	// 			else if (!/^application\/json/.test(response.headers["content-type"]))
	// 				error = new Error("Invalid content-type for HTTPS request.  Expected application/json but received " + response.headers["content-type"]);

	// 			if (error) {
	// 				reject(error);
	// 				response.resume();
	// 				return;
	// 			}
	// 			const finalize: Stream.PassThrough = new Stream.PassThrough();
	// 			let objectString: string = "";
	// 			finalize.on("data", (chunk: Buffer): void => { objectString += chunk.toString(); });
	// 			finalize.on("end", (): void => {
	// 				try { resolve.call(this, JSON.parse(objectString)); }
	// 				catch (err) { reject(err); }
	// 			});

	// 			switch (response.headers["content-encoding"]) {
	// 				case "gzip":
	// 					response.pipe(Zlib.createGunzip()).pipe(finalize);
	// 					break;
	// 				case "deflate":
	// 					response.pipe(Zlib.createInflate()).pipe(finalize);
	// 					break;
	// 				default:
	// 					response.pipe(finalize);
	// 			}
	// 		})
	// 		.on("error", reject)
	// 		.end();
	// 	});
	// }

async function fileExists(file: string | Buffer): Promise<boolean> {
	try { await Util.promisify(Fs.stat)(file); }
	catch (err) { return false; }
	return true;
}

const server: Http.Server = Http.createServer(requestHandler);
const listenAsync: ListenFunction = <any>Util.promisify((path: string, listeningListener?: ListeningListenerFunction): Net.Server => server.listen(path, listeningListener));

async function startServer(): Promise<void> {
	if (await fileExists(SOCKET_FILE)) {
		await Util.promisify(Fs.unlink)(SOCKET_FILE);
	}
	await listenAsync(SOCKET_FILE);
	console.log("server is up");
}

startServer().catch(console.error);