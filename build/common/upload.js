"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHUNKING_THRESHOLD = exports.sleep = void 0;
const arbundles_1 = require("arbundles");
const utils_1 = __importDefault(require("./utils"));
const dist_1 = __importDefault(require("@supercharge/promise-pool/dist"));
const async_retry_1 = __importDefault(require("async-retry"));
const chunkingUploader_1 = require("./chunkingUploader");
const crypto_1 = __importDefault(require("crypto"));
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
exports.sleep = sleep;
exports.CHUNKING_THRESHOLD = 50000000;
// eslint-disable-next-line @typescript-eslint/naming-convention
class Uploader {
    constructor(api, utils, currency, currencyConfig) {
        this.api = api;
        this.currency = currency;
        this.currencyConfig = currencyConfig;
        this.utils = utils;
    }
    /**
     * Uploads a given transaction to the bundler
     * @param transaction
     */
    async uploadTransaction(transaction, opts) {
        let res;
        const isDataItem = arbundles_1.DataItem.isDataItem(transaction);
        if (this.forceUseChunking || (isDataItem && transaction.getRaw().length >= exports.CHUNKING_THRESHOLD) || !isDataItem) {
            res = await this.chunkedUploader.uploadTransaction(isDataItem ? transaction.getRaw() : transaction, opts);
        }
        else {
            const { protocol, host, port, timeout, headers: confHeaders } = this.api.getConfig();
            const headers = { "Content-Type": "application/octet-stream", ...confHeaders };
            if ((opts === null || opts === void 0 ? void 0 : opts.getReceiptSignature) === true)
                headers["x-proof-type"] = "receipt";
            res = await this.api.post(`${protocol}://${host}:${port}/tx/${this.currency}`, transaction.getRaw(), {
                headers: headers,
                timeout,
                maxBodyLength: Infinity
            });
            if (res.status == 201) {
                if ((opts === null || opts === void 0 ? void 0 : opts.getReceiptSignature) === true) {
                    throw new Error(res.data);
                }
                res.data = { id: transaction.id };
            }
        }
        switch (res.status) {
            case 402:
                throw new Error("Not enough funds to send data");
            default:
                if (res.status >= 400) {
                    throw new Error(`whilst uploading Bundlr transaction: ${res.status} ${res.statusText}`);
                }
        }
        if (opts === null || opts === void 0 ? void 0 : opts.getReceiptSignature) {
            res.data.verify = utils_1.default.verifyReceipt.bind({}, res.data);
        }
        return res;
    }
    async uploadData(data, opts) {
        var _a;
        if (typeof data === "string") {
            data = Buffer.from(data);
        }
        if (Buffer.isBuffer(data)) {
            if (data.length <= exports.CHUNKING_THRESHOLD) {
                const dataItem = (0, arbundles_1.createData)(data, this.currencyConfig.getSigner(), { ...opts, anchor: (_a = opts === null || opts === void 0 ? void 0 : opts.anchor) !== null && _a !== void 0 ? _a : crypto_1.default.randomBytes(32).toString("base64").slice(0, 32) });
                await dataItem.sign(this.currencyConfig.getSigner());
                return (await this.uploadTransaction(dataItem, { ...opts === null || opts === void 0 ? void 0 : opts.upload })).data;
            }
        }
        return (await this.chunkedUploader.uploadData(data, opts)).data;
    }
    // concurrently uploads transactions
    async concurrentUploader(data, concurrency = 5, resultProcessor, logFunction) {
        const errors = [];
        let logFn = logFunction ? logFunction : async (_) => { return; };
        const results = await dist_1.default
            .for(data)
            .withConcurrency(concurrency >= 1 ? concurrency : 5)
            .handleError(async (error, _) => {
            errors.push(error);
            if (error.message === "Not enough funds to send data") {
                throw error;
            }
        })
            .process(async (item, i, _) => {
            await (0, async_retry_1.default)(async (bail) => {
                try {
                    const res = await this.processItem(item);
                    if (i % concurrency == 0) {
                        await logFn(`Processed ${i} Items`);
                    }
                    if (resultProcessor) {
                        return await resultProcessor({ item, res, i });
                    }
                    else {
                        return { item, res, i };
                    }
                }
                catch (e) {
                    if (e.message === "Not enough funds to send data") {
                        bail(e);
                    }
                    throw e;
                }
            }, { retries: 3, minTimeout: 1000, maxTimeout: 10000 });
        });
        return { errors, results: results.results };
    }
    async processItem(data, opts) {
        if (arbundles_1.DataItem.isDataItem(data)) {
            return this.uploadTransaction(data, { ...opts === null || opts === void 0 ? void 0 : opts.upload });
        }
        return this.uploadData(data, opts);
    }
    /**
     * geneates a manifest JSON object
     * @param config.items mapping of logical paths to item IDs
     * @param config.indexFile optional logical path of the index file for the manifest
     * @returns
     */
    async generateManifest(config) {
        const { items, indexFile } = config;
        const manifest = {
            manifest: "arweave/paths",
            version: "0.1.0",
            paths: {}
        };
        if (indexFile) {
            if (!items.has(indexFile)) {
                throw new Error(`Unable to access item: ${indexFile}`);
            }
            manifest["index"] = { path: indexFile };
        }
        for (const [k, v] of items.entries()) {
            manifest.paths[k] = { id: v };
        }
        return manifest;
    }
    ;
    get chunkedUploader() {
        return new chunkingUploader_1.ChunkingUploader(this.currencyConfig, this.api);
    }
    set useChunking(state) {
        if (typeof state === "boolean") {
            this.forceUseChunking = state;
        }
    }
    set contentType(type) {
        // const fullType = mime.contentType(type)
        // if(!fullType){
        //     throw new Error("Invali")
        // }
        this.contentTypeOverride = type;
    }
}
exports.default = Uploader;
//# sourceMappingURL=upload.js.map