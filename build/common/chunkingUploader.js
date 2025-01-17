"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChunkingUploader = void 0;
const arbundles_1 = require("arbundles");
const stream_1 = require("stream");
const events_1 = require("events");
const utils_1 = __importDefault(require("./utils"));
const crypto_1 = __importDefault(require("crypto"));
const utils_2 = require("arweave/web/lib/utils");
const async_retry_1 = __importDefault(require("async-retry"));
const s2ai_1 = __importDefault(require("./s2ai"));
class ChunkingUploader extends events_1.EventEmitter {
    constructor(currencyConfig, api) {
        super({ captureRejections: true });
        this.paused = false;
        this.isResume = false;
        this.currencyConfig = currencyConfig;
        this.api = api;
        this.currency = this.currencyConfig.name;
        this.chunkSize = 25000000;
        this.batchSize = 5;
        this.uploadID = "";
    }
    setResumeData(uploadID) {
        if (uploadID) {
            this.uploadID = uploadID;
            this.isResume = true;
        }
        return this;
    }
    /**
     * Note: Will return undefined unless an upload has been started.
     * @returns
     */
    getResumeData() {
        return this.uploadID;
    }
    setChunkSize(size) {
        if (size < 1) {
            throw new Error("Invalid chunk size (must be >=1)");
        }
        this.chunkSize = size;
        return this;
    }
    setBatchSize(size) {
        if (size < 1) {
            throw new Error("Invalid batch size (must be >=1)");
        }
        this.batchSize = size;
        return this;
    }
    pause() {
        this.emit("pause");
        this.paused = true;
    }
    resume() {
        this.paused = false;
        this.emit("resume");
    }
    async uploadTransaction(data, opts) {
        this.uploadOptions = opts;
        if (arbundles_1.DataItem.isDataItem(data)) {
            return this.runUpload(data.getRaw());
        }
        else {
            return this.runUpload(data);
        }
    }
    async uploadData(dataStream, options) {
        this.uploadOptions = options === null || options === void 0 ? void 0 : options.upload;
        return this.runUpload(dataStream, { ...options });
    }
    async runUpload(dataStream, transactionOpts) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        let id = this.uploadID;
        const isTransaction = (transactionOpts === undefined);
        const headers = { "x-chunking-version": "2" };
        let getres;
        if (!id) {
            getres = await this.api.get(`/chunks/${this.currency}/-1/-1`, { headers });
            utils_1.default.checkAndThrow(getres, "Getting upload token");
            this.uploadID = id = getres.data.id;
        }
        else {
            getres = await this.api.get(`/chunks/${this.currency}/${id}/-1`, { headers });
            if (getres.status === 404)
                throw new Error(`Upload ID not found - your upload has probably expired.`);
            utils_1.default.checkAndThrow(getres, "Getting upload info");
            if (this.chunkSize != +getres.data.size) {
                throw new Error(`Chunk size not equal to that of a previous upload (${+getres.data.size}).`);
            }
        }
        const { max, min } = getres.data;
        if (this.chunkSize < +min || this.chunkSize > +max) {
            throw new Error(`Chunk size out of allowed range: ${min} - ${max}`);
        }
        let totalUploaded = 0;
        const promiseFactory = (d, o, c) => {
            return new Promise((r) => {
                (0, async_retry_1.default)(async (bail) => {
                    await this.api.post(`/chunks/${this.currency}/${id}/${o}`, d, {
                        headers: { "Content-Type": "application/octet-stream", ...headers },
                        maxBodyLength: Infinity,
                        maxContentLength: Infinity,
                    }).then(re => {
                        if ((re === null || re === void 0 ? void 0 : re.status) >= 300) {
                            const e = { res: re, id: c, offset: o, size: d.length };
                            this.emit("chunkError", e);
                            if ((re === null || re === void 0 ? void 0 : re.status) === 402)
                                bail(new Error("Not enough funds to send data"));
                            throw e;
                        }
                        this.emit("chunkUpload", { id: c, offset: o, size: d.length, totalUploaded: (totalUploaded += d.length) });
                        r({ o, d: re });
                    });
                }),
                    { retries: 3, minTimeout: 1000, maxTimeout: 10000 };
            });
        };
        const present = (_a = getres.data.chunks) !== null && _a !== void 0 ? _a : [];
        const stream = new stream_1.PassThrough();
        let cache = Buffer.alloc(0);
        let ended = false;
        let hasData = true;
        stream.on("end", () => ended = true);
        stream.on("error", (e) => { throw new Error(`Error processing readable: ${e}`); });
        // custom as we need to read any number of bytes.
        const readBytes = async (size) => {
            while (!ended) {
                if (cache.length >= size) {
                    data = Buffer.from(cache.slice(0, size)); //force a copy
                    cache = cache.slice(size);
                    return data;
                }
                var data = stream.read(size);
                if (data === null) {
                    // wait for stream refill (perferred over setImmeadiate due to multi env support)
                    await new Promise((r) => setTimeout((r) => r(true), 0, r));
                    continue;
                }
                if (data.length === size)
                    return data;
                cache = Buffer.concat([cache, data]);
            }
            // flush
            while (cache.length >= size) {
                data = Buffer.from(cache.slice(0, size)); //force a copy
                cache = cache.slice(size);
                return data;
            }
            hasData = false;
            return cache;
        };
        let tx;
        // doesn't matter if we randomise ID (anchor) between resumes, as the tx header/signing info is always uploaded last.
        if (!isTransaction) {
            tx = (0, arbundles_1.createData)("", this.currencyConfig.getSigner(), {
                ...transactionOpts,
                anchor: (_b = transactionOpts === null || transactionOpts === void 0 ? void 0 : transactionOpts.anchor) !== null && _b !== void 0 ? _b : crypto_1.default.randomBytes(32).toString("base64").slice(0, 32)
            });
            stream.write(tx.getRaw());
            totalUploaded -= tx.getRaw().length;
        }
        if (Buffer.isBuffer(dataStream)) {
            stream.write(dataStream);
            stream.end();
        }
        else {
            dataStream.pipe(stream);
        }
        let offset = 0;
        let processing = [];
        let chunkID = 0;
        let heldChunk;
        let teeStream;
        let deephash;
        if (!isTransaction) {
            teeStream = new stream_1.PassThrough();
            const txLength = tx.getRaw().length;
            heldChunk = await readBytes(this.chunkSize);
            chunkID++;
            offset += heldChunk.length;
            teeStream.write(heldChunk.slice(txLength));
            const sigComponents = [
                (0, utils_2.stringToBuffer)("dataitem"),
                (0, utils_2.stringToBuffer)("1"),
                (0, utils_2.stringToBuffer)(tx.signatureType.toString()),
                tx.rawOwner,
                tx.rawTarget,
                tx.rawAnchor,
                tx.rawTags,
                new s2ai_1.default(teeStream)
            ];
            // do *not* await, this needs to process in parallel to the upload process.
            deephash = (0, arbundles_1.deepHash)(sigComponents);
        }
        let nextPresent = present.pop();
        // Consume data while there's data to read.
        while (hasData) {
            if (this.paused) {
                await new Promise(r => this.on("resume", () => r(undefined)));
            }
            // do not upload data that's already present
            if (nextPresent) {
                const delta = +nextPresent[0] - offset;
                if (delta <= this.chunkSize) {
                    const bytesToSkip = nextPresent[1];
                    const data = await readBytes(bytesToSkip);
                    if (!isTransaction)
                        teeStream.write(data);
                    offset += bytesToSkip;
                    nextPresent = present.pop();
                    chunkID++;
                    totalUploaded += bytesToSkip;
                    continue;
                }
            }
            const chunk = await readBytes(this.chunkSize);
            if (!isTransaction)
                teeStream.write(chunk);
            if (processing.length == this.batchSize) {
                await Promise.all(processing);
                processing = [];
            }
            processing.push(promiseFactory(chunk, offset, ++chunkID));
            offset += chunk.length;
        }
        if (teeStream)
            teeStream.end();
        await Promise.all(processing);
        if (!isTransaction) {
            const hash = await deephash;
            const sigBytes = Buffer.from(await this.currencyConfig.getSigner().sign(hash));
            heldChunk.set(sigBytes, 2); // tx will be the first part of the held chunk.
            await promiseFactory(heldChunk, 0, 0);
        }
        if (((_c = this === null || this === void 0 ? void 0 : this.uploadOptions) === null || _c === void 0 ? void 0 : _c.getReceiptSignature) === true)
            headers["x-proof-type"] = "receipt";
        const finishUpload = await this.api.post(`/chunks/${this.currency}/${id}/-1`, null, {
            headers: { "Content-Type": "application/octet-stream", ...headers },
            timeout: (_e = (_d = this.api.config) === null || _d === void 0 ? void 0 : _d.timeout) !== null && _e !== void 0 ? _e : 40000 * 10 // server side reconstruction can take a while
        });
        if (finishUpload.status === 402) {
            throw new Error("Not enough funds to send data");
        }
        // this will throw if the dataItem reconstruction fails
        utils_1.default.checkAndThrow(finishUpload, "Finalising upload", [201]);
        // Recover ID
        if (finishUpload.status === 201) {
            if (((_f = this === null || this === void 0 ? void 0 : this.uploadOptions) === null || _f === void 0 ? void 0 : _f.getReceiptSignature) === true) {
                throw new Error(finishUpload.data);
            }
            finishUpload.data = { id: (_g = finishUpload.statusText.split(" ")) === null || _g === void 0 ? void 0 : _g[1] };
        }
        if ((_h = this === null || this === void 0 ? void 0 : this.uploadOptions) === null || _h === void 0 ? void 0 : _h.getReceiptSignature) {
            finishUpload.data.verify = utils_1.default.verifyReceipt.bind({}, finishUpload.data.data);
        }
        this.emit("done", finishUpload);
        return finishUpload;
    }
    get completionPromise() {
        return new Promise(r => this.on("done", r));
    }
}
exports.ChunkingUploader = ChunkingUploader;
//# sourceMappingURL=chunkingUploader.js.map