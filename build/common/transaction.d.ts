/// <reference types="node" />
import { DataItem, DataItemCreateOptions } from "arbundles";
import Bundlr from "./bundlr";
import { UploadOptions, UploadResponse } from "./types";
/**
 * Extended DataItem that allows for seamless bundlr operations, such as signing and uploading.
 * Takes the same parameters as a regular DataItem.
 */
export default class BundlrTransaction extends DataItem {
    private bundlr;
    private signer;
    constructor(data: string | Uint8Array, bundlr: Bundlr, opts?: DataItemCreateOptions & {
        dataIsRawTransaction?: boolean;
    });
    sign(): Promise<Buffer>;
    get size(): number;
    upload(opts?: UploadOptions): Promise<UploadResponse>;
    static fromRaw(rawTransaction: Buffer, bundlrInstance: Bundlr): BundlrTransaction;
}
