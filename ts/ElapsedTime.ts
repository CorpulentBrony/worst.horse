import * as Process from "process";
import * as Timers from "timers";

declare namespace NodeJS {
	export interface Timer {
		ref(): void;
		unref(): void;
	}
}

export class ElapsedTime {
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