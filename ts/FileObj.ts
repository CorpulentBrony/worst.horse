import { Buffer } from "buffer";
import * as File from "./File";
import * as Fs from "fs";
import * as Path from "path";
import * as Stream from "stream";

// TODO: create method or getter that will save piped in stream to the file, a la https://stackoverflow.com/questions/19553837/node-js-piping-the-same-readable-stream-into-multiple-writable-targets
class SaveThroughStream extends Stream.Transform {
	private buffers: Array<Buffer>;
	private file: FileObj;
	private length: number;

	constructor(file: FileObj, options?: Stream.TransformOptions) {
		super(options);
		[this.buffers, this.file, this.length] = [new Array<Buffer>(), file, 0];
	}

	public _flush(callback: () => void): void {
		this.file.writeBuffer(Buffer.concat(this.buffers, this.length)).catch(console.error);
		callback();
	}

	public _transform(chunk: Buffer, encoding: "buffer", callback: () => void): void {
		this.buffers.push(chunk);
		this.length += chunk.length;
		this.push(chunk);
		callback();
	}
}

export class FileObj {
	private _pathFormatted: string | undefined;
	public readonly path: Path.ParsedPath;

	constructor(path: string);
	constructor(path: Path.ParsedPath);
	constructor(path: string | Path.ParsedPath) {
		this.path = (typeof path === "string") ? Path.parse(Path.normalize(path)) : path;
	}

	public get pathFormatted(): string { return (this._pathFormatted === undefined) ? this._pathFormatted = Path.format(this.path) : this._pathFormatted; }
	public get saveThroughStream(): SaveThroughStream { return new SaveThroughStream(this); }

	public async exists(): Promise<boolean> { return File.exists(this.pathFormatted); }

	public async read(as: "buffer"): Promise<Buffer>;
	public async read<T>(as: "json"): Promise<T>;
	public async read(as: "stream"): Promise<Fs.ReadStream>;
	public async read(as: "string"): Promise<string>;
	public async read(): Promise<Buffer>;
	public async read<T = never>(as: "buffer" | "json" | "stream" | "string" = "buffer"): Promise<Buffer | Fs.ReadStream | string | T> {
		switch (as) {
			case "buffer": return this.readBuffer();
			case "json": return this.readJson<T>();
			case "stream": return this.readStream();
			case "string": return this.readString();
		}
	}

	public async readBuffer(): Promise<Buffer> { return File.Read.buffer(this.pathFormatted); }
	public async readJson<T>(): Promise<T> { return File.Read.json<T>(this.pathFormatted); }
	public async readStream(): Promise<Fs.ReadStream> { return File.Read.stream(this.pathFormatted); }
	public async readString(): Promise<string> { return File.Read.string(this.pathFormatted); }

	public async write(contents: string): Promise<void>;
	public async write(readStream: Stream.Readable): Promise<void>;
	public async write(contents: Buffer): Promise<void>;
	public async write<T>(contents: T): Promise<void>;
	public async write<T = never>(contentsOrReadStream: string | Buffer | Stream.Readable | T): Promise<void> {
		if (typeof contentsOrReadStream === "string")
			this.writeString(contentsOrReadStream);
		else if (contentsOrReadStream instanceof Stream.Readable)
			this.writeStream(contentsOrReadStream);
		else if (Buffer.isBuffer(contentsOrReadStream))
			this.writeBuffer(contentsOrReadStream);
		else
			this.writeJson<T>(contentsOrReadStream);
	}

	public async writeBuffer(contents: Buffer): Promise<void> { File.Write.buffer(this.pathFormatted, contents).catch(console.error); }
	public async writeJson<T>(contents: T): Promise<void> { File.Write.json<T>(this.pathFormatted, contents).catch(console.error); }
	public async writeStream(readStream: Stream.Readable): Promise<void> { File.Write.stream(this.pathFormatted, readStream).catch(console.error); }
	public async writeString(contents: string): Promise<void> { File.Write.string(this.pathFormatted, contents).catch(console.error); }
	public async unlink(): Promise<void> { File.unlink(this.pathFormatted).catch(console.error); }
}