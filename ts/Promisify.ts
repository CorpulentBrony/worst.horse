/// <reference path="./Promisify.d.ts" />
import * as Util from "util";

// to-do

type NodeCallback<T> = (err?: Error, value?: T) => void;
type NodeCallbackParameter<T> = (callback: NodeCallback<T>) => void;

export function promisify<T>(f: (...args: Array<any>) => void): (...args: Array<any>) => Promise<T> {
	
}