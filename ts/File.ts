/// <reference path="./Promisify.d.ts" />
import * as Buffer from "buffer";
import * as Fs from "fs";
import * as Util from "util";

export async function exists(file: string | Buffer): Promise<boolean> {
	try { await Util.promisify(Fs.stat)(file); }
	catch (err) { return false; }
	return true;
}

export async function unlink(file: string | Buffer): Promise<void> {
	Util.promisify(Fs.unlink)(file);
}