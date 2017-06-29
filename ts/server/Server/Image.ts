import { Derpibooru } from "../Derpibooru";
// import { ElapsedTime } from "../ElapsedTime";
import * as File from "../File";
import * as Generic from "./Generic";
import * as Gm from "gm";
import * as Http from "http";
import * as Net from "net";
import * as Path from "path";
import * as Process from "process";
import * as Request from "../Request";
import * as Stream from "stream";
import * as Url from "url";

export class Image implements Generic.Interface {
	// private elapsedTime: ElapsedTime;
	private server: Http.Server;
	public readonly socketFile: string;

	public static async start(socketFile: string): Promise<Image> {
		Process.stdout.write("\nStarting worst.horse image server ... ");
		let server: Image;

		try {
			server = new this(socketFile);
			await server.startServer();
			Process.stdout.write("[OK]\n");
			return server;
		} catch (err) {
			Process.stdout.write("[ERROR]\n");
			throw err;
		}
	}

	constructor(socketFile: string) {
		[/*this.elapsedTime, */this.server, this.socketFile] = [/*new ElapsedTime(), */Http.createServer(this.requestHandler), socketFile];
		this.server.on("error", (err: any): void => {
			if (err.code === "EADDRINUSE") {
				File.unlinkSync(this.socketFile);
			}
		});
	}

	private async listen(path: string = this.socketFile): Promise<void> {
		try { await File.unlink(path); }
		catch (err) {}
		return new Promise<void>((resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: any) => void): void => {
			this.server.listen(this.socketFile, (err: Error, server: void): void => {
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

			if (requestUrl.searchParams.has("binary")) {
				response.setHeader("content-type", "application/octet-stream; type=worst.horse");
				response.setHeader("link", "<https://worst.horse>; rel=dns-prefetch");
				response.setHeader("vary", "accept, user-agent");
				response.end(await Derpibooru.Image.Display.bufferFromImage(searchResult, request.headers));
				return;
			}

			response.setHeader("Content-Type", "text/plain; charset=utf-8");
			response.writeHead(404, "Not Found");
			response.write("404 Not Found");
			response.end();



			// if (requestUrl.searchParams.has("json")) {
			// 	response.setHeader("content-type", "application/json; charset=utf-8");
			// 	response.setHeader("link", "<https://worst.horse>; rel=dns-prefetch");
			// 	response.end(await Derpibooru.Image.Display.fromImage(searchResult));
			// 	return;
			// }
			// const searchResultUrl = new Url.URL(Path.resolve(searchResult.representations.large), "https://worst.horse");
			// let imageRequest: Stream.Readable = await Request.stream(searchResultUrl);
			// response.setHeader("Cache-Control", "max-age=0, no-cache");

			// if (requestUrl.searchParams.has("webp")) {
			// 	response.setHeader("Content-Type", "image/webp");
			// 	imageRequest = Gm(imageRequest).setFormat("webp").stream();
			// } else if (requestUrl.searchParams.has("placeholder")) {
			// 	response.setHeader("Content-Type", "image/gif");
			// 	imageRequest = Gm(imageRequest).filter("Gaussian").resize(3, 3).setFormat("gif").stream();
			// } else
			// 	response.setHeader("Content-Type", searchResult.mime_type);
			// imageRequest.pipe(response);
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
				await File.unlink(this.socketFile);
				this.listen();
			}
			else
				throw err;
		}
		return this;
	}
}

const ImageImplementsGenericConstructor: Generic.Constructor = Image;