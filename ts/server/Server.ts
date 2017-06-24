import { Derpibooru } from "./Derpibooru";
import { ElapsedTime } from "./ElapsedTime";
import * as File from "./File";
import * as Gm from "gm";
import * as Http from "http";
import * as Net from "net";
import * as Process from "process";
import * as Request from "./Request";
import * as Stream from "stream";
import * as Url from "url";

const BUFFER_SECONDS: number = 30; // is this even being used?
const SOCKET_FILE: string = Process.env.npm_package_config_serverSocketFile;

type ListeningListenerFunction = (err?: Error, success?: void) => void;
type ListenFunction = (path: string, listeningListener?: ListeningListenerFunction) => Net.Server;

export class Server {
	private elapsedTime: ElapsedTime;
	private server: Http.Server;

	public static async start(): Promise<Server> {
		Process.stdout.write("Starting worst.horse image server ... ");
		let server: Server;

		try {
			server = new Server();
			await server.startServer();
			Process.stdout.write("[OK]\n");
			return server;
		} catch (err) {
			Process.stdout.write("[ERROR]\n");
			throw err;
		}
	}

	constructor() {
		[this.elapsedTime, this.server] = [new ElapsedTime(), Http.createServer(this.requestHandler)];
		this.server.on("error", (err: any): void => {
			if (err.code === "EADDRINUSE") {
				File.unlinkSync(SOCKET_FILE);
			}
		});
	}

	private async listen(path: string = SOCKET_FILE): Promise<void> {
		try { await File.unlink(path); }
		catch (err) {}
		return new Promise<void>((resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: any) => void): void => {
			this.server.listen(SOCKET_FILE, (err: Error, server: void): void => {
				if (err)
					reject(err);
				else
					resolve(server);
			});
		});
	}

	private requestHandler = async function requestHandler(request: Http.IncomingMessage, response: Http.ServerResponse): Promise<void> {
		try {
			let requestUrl: Url.URL;

			if (request.url === undefined || (requestUrl = new Url.URL(request.url, "https://image")).pathname !== "/") {
				response.setHeader("Content-Type", "text/plain; charset=utf-8");
				response.writeHead(404, "Not Found");
				response.write("404 Not Found");
				response.end();
				return;
			}
			const searchResult: Derpibooru.Image = await Derpibooru.newRandom();

			if (requestUrl.searchParams.has("json")) {
				response.setHeader("content-type", "application/json; charset=utf-8");
				response.setHeader("link", "<https://worst.horse>; rel=dns-prefetch");
				response.end(await Derpibooru.Image.Display.fromImage(searchResult));
				return;
			}

			if (requestUrl.searchParams.has("binary")) {
				response.setHeader("content-type", "application/octet-stream; type=worst.horse-image-response");
				response.setHeader("link", "<https://worst.horse>; rel=dns-prefetch");
				response.end(await Derpibooru.Image.Display.bufferFromImage(searchResult));
				return;
			}
			const searchResultUrl = new Url.URL("https:" + searchResult.representations.large);
			let imageRequest: Stream.Readable = await Request.stream(searchResultUrl);
			response.setHeader("Cache-Control", "max-age=0, no-cache");

			if (requestUrl.searchParams.has("webp")) {
				response.setHeader("Content-Type", "image/webp");
				imageRequest = Gm(imageRequest).setFormat("webp").stream();
			} else if (requestUrl.searchParams.has("placeholder")) {
				response.setHeader("Content-Type", "image/gif");
				imageRequest = Gm(imageRequest).filter("Gaussian").resize(3, 3).setFormat("gif").stream();
			} else
				response.setHeader("Content-Type", searchResult.mime_type);
			imageRequest.pipe(response);
			// Gm(imageRequest).filter("Gaussian").resize(250, 250).colorspace("YUV").colors(1).toBuffer("RGB", (err: Error, buffer: Buffer): void => {
			// 	console.log(buffer.slice(0, 3)); // three bytes corresponding to R G B
			// });
		} catch (err) { console.error(err); }
	}

	public async startServer(): Promise<this> {
		try {
			await this.listen();
		} catch (err) {
			if (err.code === "EADDRINUSE") {
				await File.unlink(SOCKET_FILE);
				this.listen();
			}
			else
				throw err;
		}
		return this;
	}
}