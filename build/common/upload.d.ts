/// <reference types="node" />
/// <reference types="node" />
import { DataItem } from "arbundles";
import { AxiosResponse } from "axios";
import Utils from "./utils";
import Api from "./api";
import { CreateAndUploadOptions, Currency, Manifest, UploadOptions, UploadResponse } from "./types";
import { ChunkingUploader } from "./chunkingUploader";
import { Readable } from "stream";
export declare const sleep: (ms: number) => Promise<void>;
export declare const CHUNKING_THRESHOLD = 50000000;
export default class Uploader {
    protected readonly api: Api;
    protected currency: string;
    protected currencyConfig: Currency;
    protected utils: Utils;
    protected contentTypeOverride: string;
    protected forceUseChunking: boolean;
    constructor(api: Api, utils: Utils, currency: string, currencyConfig: Currency);
    /**
     * Uploads a given transaction to the bundler
     * @param transaction
     */
    uploadTransaction(transaction: DataItem | Readable | Buffer, opts?: UploadOptions): Promise<AxiosResponse<UploadResponse>>;
    uploadData(data: string | Buffer | Readable, opts?: CreateAndUploadOptions): Promise<UploadResponse>;
    concurrentUploader(data: (DataItem | Buffer | Readable)[], concurrency?: number, resultProcessor?: (res: any) => Promise<any>, logFunction?: (log: string) => Promise<any>): Promise<{
        errors: Array<any>;
        results: Array<any>;
    }>;
    protected processItem(data: string | Buffer | Readable | DataItem, opts?: CreateAndUploadOptions): Promise<any>;
    /**
     * geneates a manifest JSON object
     * @param config.items mapping of logical paths to item IDs
     * @param config.indexFile optional logical path of the index file for the manifest
     * @returns
     */
    generateManifest(config: {
        items: Map<string, string>;
        indexFile?: string;
    }): Promise<Manifest>;
    get chunkedUploader(): ChunkingUploader;
    set useChunking(state: boolean);
    set contentType(type: string);
}
