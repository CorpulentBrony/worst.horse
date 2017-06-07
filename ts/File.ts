/// <reference path="./Promisify.d.ts" />
import * as Buffer from "buffer";
import * as Fs from "fs";
import * as Path from "path";
import * as Util from "util";

type NodeEncoding = "ascii" | "base64" | "binary" | "hex" | "latin1" | "ucs2" | "utf16le" | "utf8";
type RecursiveStringValue = string | RecursiveStringArray;
interface RecursiveStringArray extends Array<RecursiveStringValue> {};

export async function exists(file: string | Buffer): Promise<boolean> {
	try { await stat(file); }
	catch (err) {
		if (err.code === "ENOENT")
			return false;
		throw err;
	}
	return true;
}

export async function readDir(path: string | Buffer, options: "buffer" | { encoding: "buffer" }): Promise<Array<Buffer>>;
export async function readDir(path: string | Buffer, options?: NodeEncoding | { encoding: NodeEncoding }): Promise<Array<string>>;
export async function readDir(path: string | Buffer, options: NodeEncoding | "buffer" | { encoding: NodeEncoding | "buffer" } = "utf8"): Promise<Array<string> | Array<Buffer>> {
	// private listenAsync: ListenFunction = <any>Util.promisify((path: string, listeningListener?: ListeningListenerFunction): Net.Server => this.server.listen(path, listeningListener));
	// return Util.promisify((path: string | Buffer, options: NodeEncoding | "buffer" | { encoding: NodeEncoding | "buffer" }, callback: (err: NodeJS.ErrnoException, files: string[]) => void): void => Fs.readdir(path, options, callback))(readDir, options);
	return Util.promisify(Fs.readdir)(path, options);
}

export const stat: (path: string | Buffer) => Promise<Fs.Stats> = <any>Util.promisify(Fs.stat);
export const unlink: (file: string | Buffer) => Promise<void> = <any>Util.promisify(Fs.unlink);

export async function unlinkDirFiles(directory: string | Buffer, depth: number = 0): Promise<RecursiveStringArray> {
	const dir: string = (typeof directory !== "string") ? directory.toString("utf8") : directory;
	const files: Array<string> = await readDir(directory);
	return Promise.all<RecursiveStringValue>(await files.reduce<Promise<Array<Promise<RecursiveStringValue>>>>(async (result: Promise<Array<Promise<RecursiveStringValue>>>, fileName: string): Promise<Array<Promise<RecursiveStringValue>>> => {
		const files: Array<Promise<RecursiveStringValue>> = await result;
		const filePath: string = Path.join(dir, fileName);
		const stats: Fs.Stats = await stat(filePath);

		if (!stats.isDirectory())
			files.push(unlink(filePath).catch(console.error).then<string>((): string => fileName));
		else if (depth > 0)
			files.push(unlinkDirFiles(filePath, depth - 1));
		return files;
	}, Promise.resolve(new Array<Promise<RecursiveStringValue>>())));
}