/// <reference path="./@types/libxmljs.d.ts" />
/// <reference path="./Promisify.d.ts" />
import { Derpibooru } from "./Derpibooru";
import { ElapsedTime } from "./ElapsedTime";
import * as File from "./File";
import * as Gm from "gm";
import * as Http from "http";
import * as Libxmljs from "libxmljs";
import * as Net from "net";
import * as Process from "process";
import * as Request from "./Request";
import * as Stream from "stream";
import * as Url from "url";
import * as Util from "util";

const BUFFER_SECONDS: number = 30;
const SEARCH_FILTER: string = "41048";
const SEARCH_TERMS: string = "applejack,solo,sad,-twilight sparkle,-fluttershy,-pinkie pie,-rainbow dash,-rarity";
const SOCKET_FILE: string = "/var/www/html/worst.horse/image";

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
	}

	private listenAsync: ListenFunction = <any>Util.promisify((path: string, listeningListener?: ListeningListenerFunction): Net.Server => this.server.listen(path, listeningListener));

	private requestHandler = async function requestHandler(request: Http.IncomingMessage, response: Http.ServerResponse): Promise<void> {
		try {
			let requestUrl: Url.URL;

			if (request.url === undefined || (requestUrl = new Url.URL(request.url, "https://image")).pathname !== "/") {
				response.setHeader("Content-Type", "text/html; charset=utf-8");
				response.writeHead(404, "Not Found");
				response.write("404 Not Found");
				response.end();
				return;
			}
			const derpibooru = new Derpibooru({ filter_id: SEARCH_FILTER, q: SEARCH_TERMS });
			const searchResult: Derpibooru.Image = await derpibooru.random();
			if (requestUrl.searchParams.has("html")) {
				response.setHeader("Content-Type", "text/html; charset=utf-8");
				const doc = new Libxmljs.Document();
				const picture: Libxmljs.Element = doc.node<Libxmljs.Element>("html").attr({ lang: "en" })
					.node("head")
						.node("link").attr({ href: "https://derpicdn.net", rel: "preconnect" }).parent()
						.node("meta").attr({ charset: "utf8" }).parent()
						.node("title", "Worst Horse Image").parent().parent()
					.node("body")
						.node("template").attr({ id: "image" })
							.node("picture");
				for (const size in searchResult.representations)
				response.write(`<!DOCTYPE html>\n${doc.toString({ type: "html", format: true }).replace("<meta http-equiv=\"Content-Type\" content=\"text/html; charset=UTF-8\">", "") }`);
				response.end();
				return;
		// <template id="image">
		// 	<picture>
		// 		<source media="(max-width: 50px)" srcset="" type="">
		// 		<source media="(max-width: 150px)" srcset="" type="">
		// 		<source media="(max-width: 250px)" srcset="" type="">
		// 		<source media="(max-height: 240px)" srcset="" type="">
		// 		<source media="(max-height: 600px)" srcset="" type="">
		// 		<source media="(max-height: 1024px)" srcset="" type="">
		// 		<source media="(max-width: 1024px)" srcset="" type="">
		// 		<img class="image" src="/image" alt="Applejack is worst horse">
		// 	</picture>
		// </template>
			}

			const searchResultUrl = new Url.URL("https:" + searchResult.representations.large);
			let imageRequest: Stream.Transform = await Request.stream(searchResultUrl);
			console.log(`getting image: ${searchResultUrl.toString()}`);
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
		if (await File.exists(SOCKET_FILE)) {
			await File.unlink(SOCKET_FILE);
		}
		await this.listenAsync(SOCKET_FILE);
		return this;
	}
}