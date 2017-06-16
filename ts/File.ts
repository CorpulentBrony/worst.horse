import { Buffer } from "buffer";
import * as Fs from "fs";
import * as Path from "path";
import * as Process from "process";
import { promisify } from "./Promisify";
import * as Stream from "stream";

type NodeEncoding = "ascii" | "base64" | "binary" | "hex" | "latin1" | "ucs2" | "utf16le" | "utf8";
type RecursiveStringValue = string | RecursiveStringArray;
interface RecursiveStringArray extends Array<RecursiveStringValue> {};

export async function access(file: string, mode: number = Fs.constants.F_OK): Promise<boolean> {
	// return promisify<boolean>(Fs.access)(file, mode);
	return new Promise<boolean>((resolve: (value: boolean | PromiseLike<boolean>) => void): void => Fs.access(file, mode, (err: Error): void => resolve(!Boolean(err))));
}

export async function exists(file: string | Buffer): Promise<boolean> {
	try { await stat(file); }
	catch (err) {
		if (err.code === "ENOENT")
			return false;
		throw err;
	}
	return true;
}

export const readDir: { (path: string | Buffer, options: "buffer" | { encoding: "buffer" }): Promise<Array<Buffer>>; (path: string | Buffer, options?: NodeEncoding | { encoding: NodeEncoding }): Promise<Array<string>> } = <any>promisify(Fs.readdir);
export const stat: (path: string | Buffer) => Promise<Fs.Stats> = promisify<Fs.Stats>(Fs.stat);
export const unlink: (file: string | Buffer) => Promise<void> = promisify<void>(Fs.unlink);
export const unlinkSync: (file: string) => void = Fs.unlinkSync;

export async function unlinkDirFiles(directory: string | Buffer, depth: number = 0): Promise<RecursiveStringArray> {
	const dir: string = (typeof directory !== "string") ? directory.toString(Process.env.npm_package_config_defaultTextEncoding) : directory;
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

export namespace Read {
	export const binary: (file: string) => Promise<Buffer> = buffer;
	export const text: (file: string) => Promise<string> = string;

	export async function buffer(file: string): Promise<Buffer> {
		const readStream: Fs.ReadStream = await stream(file);
		const readBuffers: Array<Buffer> = new Array<Buffer>();
		readStream.on("data", (chunk: Buffer): void => { readBuffers.push(chunk); });
		return new Promise<Buffer>((resolve: (value: Buffer | PromiseLike<Buffer>) => void, reject: (reason?: any) => void): void => { readStream.on("end", (): void => resolve(Buffer.concat(readBuffers, readStream.bytesRead))); });
	}

	export async function json<T>(file: string, minLength: number = 0): Promise<T> {
		const unparsed: string = await string(file);
		let parsed: T;

		if (minLength > 0 && unparsed.length < minLength)
			throw new Error(`File ${file} is not configured properly; expected a file at least ${minLength} characters long but file is actually ${unparsed.length} characters.`);

		try {
			parsed = JSON.parse(unparsed);
		} catch (err) {
			throw new Error(`File ${file} is in unknown format; unable to parse JSON.`);
		}
		return parsed;
	}

	export async function stream(file: string): Promise<Fs.ReadStream> {
		if (!(await access(file, Fs.constants.F_OK | Fs.constants.R_OK)))
			throw new Error(`File ${file} does not exist or is not accessible.`);
		return Fs.createReadStream(file);
	}

	export async function string(file: string): Promise<string> {
		const result: Buffer = await buffer(file);
		return result.toString(Process.env.npm_package_config_defaultTextEncoding);
	}
}

export namespace Write {
	export const binary: (file: string, contents: Buffer) => Promise<void> = buffer;
	export const text: (file: string, contents: string) => Promise<void> = string;

	class WriteBuffer extends Stream.Readable {
		private buffer: Buffer;
		private length: number;
		private offset: number;

		constructor(buffer: Buffer, options?: Stream.ReadableOptions) {
			super(options);

			if (!Buffer.isBuffer(buffer))
				throw new TypeError("Buffer parameter must be a buffer.");
			[this.buffer, this.length, this.offset] = [buffer, buffer.length, 0];
		}

		public _read(size: number): void {
			if (this.offset < this.length) {
				this.push(this.buffer.slice(this.offset, this.offset + size));
				this.offset += size;
			} else if (this.offset >= this.length)
				this.push(null);
		}
	}

	export async function buffer(file: string, contents: Buffer): Promise<void> { stream(file, new WriteBuffer(contents)); }
	export async function json<T>(file: string, contents: T): Promise<void> { string(file, JSON.stringify(contents)); }

	export async function stream(file: string, readStream: Stream.Readable): Promise<void> {
		if (!(await access(file, Fs.constants.F_OK | Fs.constants.W_OK)))
			throw new Error(`File ${file} does not exist or you do not have permissions to write to it.`);
		const writeStream: Fs.WriteStream = Fs.createWriteStream(file, <any>{ defaultEncoding: "binary" });
		return new Promise<void>((resolve: () => void, reject: (reason?: any) => void): void => { readStream.pipe<Fs.WriteStream>(writeStream).on("finish", (): void => resolve()); });
	}

	export async function string(file: string, contents: string): Promise<void> { buffer(file, Buffer.from(contents, Process.env.npm_package_config_defaultTextEncoding)); }
}