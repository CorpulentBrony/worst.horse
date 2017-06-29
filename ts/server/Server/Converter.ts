import * as File from "../File";
import * as Generic from "./Generic";
import * as Gm from "gm";
import * as Http from "http";
import * as Path from "path";
import * as Process from "process";
import * as Url from "url";

export class Converter implements Generic.Interface {
	private server: Http.Server;
	public readonly socketFile: string;

	public static async start(socketFile: string): Promise<Converter> {
		Process.stdout.write("Starting worst.horse converter server ... ");
		let server: Converter;

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
		[this.server, this.socketFile] = [Http.createServer(this.requestHandler), socketFile];

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
			let pathname: string;

			if (request.url === undefined || !(pathname = Path.resolve(request.url)).startsWith("/derpicdn.net/")) {
				response.setHeader("Content-Type", "text/plain; charset=utf-8");
				response.writeHead(404, "Not Found");
				response.write("404 Not Found");
				response.end();
				return;
			}

			response.end(request.url);
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

const ConverterImplementsGenericConstructor: Generic.Constructor = Converter;