import Bundlr from "../common/bundlr";
import { CreateAndUploadOptions, UploadResponse } from "../common/types";
import { NodeCurrency } from "./types";
import NodeUploader from "./upload";
export default class NodeBundlr extends Bundlr {
    uploader: NodeUploader;
    currencyConfig: NodeCurrency;
    /**
     * Constructs a new Bundlr instance, as well as supporting subclasses
     * @param url - URL to the bundler
     * @param wallet - private key (in whatever form required)
     */
    constructor(url: string, currency: string, wallet?: any, config?: {
        timeout?: number;
        providerUrl?: string;
        contractAddress?: string;
        currencyOpts?: any;
        headers?: {
            [key: string]: string;
        };
    });
    /**
    * Upload a file at the specified path to the bundler
    * @param path path to the file to upload
    * @returns bundler response
    */
    uploadFile(path: string, opts?: CreateAndUploadOptions): Promise<UploadResponse>;
    /**
    * @param path - path to the folder to be uploaded
    * @param indexFile - path to the index file (i.e index.html)
    * @param batchSize - number of items to upload concurrently
    * @param interactivePreflight - whether to interactively prompt the user for confirmation of upload (CLI ONLY)
    * @param keepDeleted - Whether to keep previously uploaded (but now deleted) files in the manifest
    * @param logFunction - for handling logging from the uploader for UX
    * @returns
    */
    uploadFolder(path: string, { batchSize, keepDeleted, indexFile, interactivePreflight, logFunction }?: {
        batchSize?: number;
        keepDeleted?: boolean;
        indexFile?: string;
        interactivePreflight?: boolean;
        logFunction?: (log: string) => Promise<void>;
    }): Promise<UploadResponse | undefined>;
    static init(opts: {
        url: string;
        currency: string;
        privateKey?: string;
        publicKey?: string;
        signingFunction?: (msg: Uint8Array) => Promise<Uint8Array>;
        collectSignatures?: (msg: Uint8Array) => Promise<{
            signatures: string[];
            bitmap: number[];
        }>;
        providerUrl?: string;
        timeout?: number;
        contractAddress?: string;
    }): Promise<NodeBundlr>;
}
