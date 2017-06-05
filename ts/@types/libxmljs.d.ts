declare module "libxmljs" {
	export const libxml_parser_version: string;
	export const libxml_version: string;
	export const version: string;

	export function memoryUsage(): number;
	export function nodeCount(): number;
	export function parseHtmlFragment(string: string, options?: ParserOptions): Document;
	export function parseHtmlString(string: string, options?: ParserOptions): Document;
	export function parseXmlString(string: string, options?: ParserOptions): Document;

	export interface DocumentFormattingOptions extends NodeFormattingOptions {
		emptyTags?: boolean;
		xhtml?: boolean;
	}

	export interface Namespace {
		href(): string;
		prefix(): string;
	}

	export interface NodeFormattingOptions {
		declarations?: boolean;
		format?: boolean;
		selfCloseEmpty?: boolean;
		type?: "html" | "xhtml" | "xml";
		whitespace?: boolean;
	}

	export interface ParserOptions {
		basefix?: boolean;
		big_lines?: boolean;
		blanks?: boolean;
		cdata?: boolean;
		compact?: boolean;
		dict?: boolean;
		doctype?: boolean;
		dtdattr?: boolean;
		dtdload?: boolean;
		dtdvalid?: boolean;
		errors?: boolean;
		huge?: boolean;
		ignore_enc?: boolean;
		implied?: boolean;
		net?: boolean;
		nobasefix?: boolean;
		noblanks?: boolean;
		nocdata?: boolean;
		nodict?: boolean;
		noent?: boolean;
		noerror?: boolean;
		nonet?: boolean;
		nowarning?: boolean;
		noxincode?: boolean;
		nsclean?: boolean;
		old?: boolean;
		oldsax?: boolean;
		pedantic?: boolean;
		recover?: boolean;
		sax1?: boolean;
		warnings?: boolean;
		xinclude?: boolean;
	}

	export class Attribute extends Node {
		name(): string;
		value(content: string): this;
		value(): string;
	}

	export class Comment extends Node {
		constructor(doc: Document, content: string);

		text(content: string): this;
		text(): string;
	}

	export class Document {
		constructor(version?: string, encoding?: string);

		child(idx: number): Element | null;
		childNodes(): Array<Element>;
		encoding(enc: string): this;
		encoding(): string;
		errors(): Array<SyntaxError>;
		find(xpath: string): Array<Element>;
		get(xpath: string): Element | null;
		node<T extends Node>(name: string, content?: string): T;
		root(node: Node): Node;
		root(): Element | null;
		setDtd(name: string, ext: string, sys: string): void;
		toString(formatting?: boolean | DocumentFormattingOptions): string;
		type(): "document";
		version(): string;
	}

	export class Element extends Node {
		constructor(doc: Document, name: string, content?: string);

		addChild(child: Element): this;
		addNextSibling<T extends Node>(siblingNode: T): T;
		addPrevSibling<T extends Node>(siblingNode: T): T;
		attr(attrObject: { [name: string]: string }): this;
		attr(name: string): Attribute | null;
		attrs(): Array<Attribute>;
		child(idx: number): Node | null;
		childNodes(): Array<Node>;
		defineNamespace(prefix: string, href: string): Namespace;
		defineNamespace(href: string): Namespace;
		find(xpath: string, namespaces: { [name: string]: string }): Array<Node>;
		find(xpath: string, ns_uri?: string): Array<Node>;
		get(xpath: string, ns_uri: { [name: string]: string }): Element | null;
		get(xpath: string, ns_uri?: string): Node | null;
		name(): string;
		name(new_name: string): this;
		nextElement(): Element | null;
		node(name: string, content?: string): Element;
		parent<T extends Document | Element = Element>(): T;
		path(): string;
		prevElement(): Element | null;
		replace<T extends Element | string>(replacement: T): T;
		text(new_text: string): this;
		text(): string;
	}

	export abstract class Node {
		clone(): Node;
		doc(): Document;
		line(): number;
		namespace(prefix: string, href: string): Namespace;
		namespace(ns: Namespace): this;
		namespace(href: string): Namespace;
		namespace(): Namespace | null;
		namespaces(local?: boolean): Array<Namespace>;
		nextSibling(): Node | null;
		parent(): Document | Node | null;
		prevSibling(): Node | null;
		remove(): this;
		toString(options?: boolean | NodeFormattingOptions): string;
		type(): "attribute" | "comment" | "element" | "text";
	}

	export class SyntaxError {
		code: number | null;
		column: number;
		domain: number | null;
		file: string | null;
		int1: number | null;
		level: number | null;
		line: number | null;
		message: string | null;
		str1: string | null;
		str2: string | null;
		str3: string | null;
	}
}