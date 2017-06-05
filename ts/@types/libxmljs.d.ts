declare module "libxmljs" {
	export const libxml_parser_version: string;
	export const libxml_version: string;
	export const version: string;

	export function memoryUsage(): number;
	export function nodeCount(): number;
	export function parseHtmlFragment(string: string, options?: ParserOptions): Document;
	export function parseHtmlString(string: string, options?: ParserOptions): Document;
	export function parseXmlString(string: string, options?: ParserOptions): Document;

	export interface FormattingOptions {
		declarations?: boolean;
		emptyTags?: boolean;
		format?: boolean;
		selfCloseEmpty?: boolean;
		type?: "html" | "xhtml" | "xml";
		whitespace?: boolean;
		xhtml?: boolean;
	}

	// https://github.com/libxmljs/libxmljs/wiki/Libxmljs
	export interface ParserOptions {
		doctype: boolean;
		dtdattr: boolean;
		dtdload: boolean;
		dtdvalid: boolean;
		noent: boolean;
		recover: boolean;
	}

	export class Document {
		constructor(version?: string, encoding?: string);

		child(idx: number): Element | null;
		childNodes(): Array<Element>;
		encoding(): string;
		encoding(enc: string): this;
		errors(): Array<SyntaxError>;
		find(xpath: string): Array<Element>;
		get(xpath: string): Element | null;
		node(name: string, content?: string): Node;
		root(): Element | null;
		root(node: Node): Node;
		setDtd(name: string, ext: string, sys: string): void;
		toString(formatting?: boolean | FormattingOptions): string;
		type(): "document";
		version(): string;
	}

	export class Element extends Node {

	}

	export class Node {

	}

	export class SyntaxError {

	}
}