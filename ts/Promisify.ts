// to-do
export const promisify = <T, E = Error | null>(fn: (...args: Array<any>) => void): { (...args: Array<any>): Promise<T> } => {
	return (...args: Array<any>): Promise<T> => new Promise<T>((resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void): void => {
		fn(...args, (err: E, reply: T): void => {
			if (err)
				reject(err);
			else
				resolve(reply);
		});
	});
}

export const promisifyAsync = <T, E = Error | null>(fn: (...args: Array<any>) => void): { (...args: Array<any>): Promise<T> } => {
	return (...args: Array<any>): Promise<T> => new Promise<T>(async (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void): Promise<void> => {
		fn(...(await Promise.all(args.map<Promise<any>>((arg: any): Promise<any> => Promise.resolve(arg)))), (err: E, reply: T): void => {
			if (err)
				reject(err);
			else
				resolve(reply);
		});
	});
}


//export const readDir: { (path: string | Buffer, options: "buffer" | { encoding: "buffer" }): Promise<Array<Buffer>>; (path: string | Buffer, options?: NodeEncoding | { encoding: NodeEncoding }): Promise<Array<string>> } = <any>Util.promisify(Fs.readdir);
