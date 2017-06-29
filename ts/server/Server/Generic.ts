export interface Constructor {
	readonly prototype: Interface;

	new (socketFile: string): Interface;
	start(socketFile: string): Promise<Interface>;
}

export interface Interface {
	readonly socketFile: string;

	startServer(): Promise<this>;
}