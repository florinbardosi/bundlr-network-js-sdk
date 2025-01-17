"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const aptos_1 = require("aptos");
const signing_1 = require("arbundles/src/signing");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const currency_1 = __importDefault(require("../currency"));
const SHA3 = __importStar(require("js-sha3"));
class AptosConfig extends currency_1.default {
    constructor(config) {
        var _a, _b;
        if (typeof config.wallet === "string" && config.wallet.length === 66)
            config.wallet = Buffer.from(config.wallet.slice(2), "hex");
        if (!((_a = config === null || config === void 0 ? void 0 : config.opts) === null || _a === void 0 ? void 0 : _a.signingFunction) && Buffer.isBuffer(config === null || config === void 0 ? void 0 : config.wallet)) {
            // @ts-ignore
            config.accountInstance = new aptos_1.AptosAccount(config.wallet);
        }
        super(config);
        this.signingFn = (_b = config === null || config === void 0 ? void 0 : config.opts) === null || _b === void 0 ? void 0 : _b.signingFunction;
        this.needsFee = true;
        this.base = ["aptom", 1e8];
    }
    async getProvider() {
        var _a;
        return (_a = this.providerInstance) !== null && _a !== void 0 ? _a : (this.providerInstance = new aptos_1.AptosClient(this.providerUrl));
    }
    async getTx(txId) {
        var _a;
        const client = await this.getProvider();
        const tx = await client.waitForTransactionWithResult(txId /* , { checkSuccess: true } */);
        const payload = tx === null || tx === void 0 ? void 0 : tx.payload;
        if (!tx.success) {
            throw new Error((_a = tx === null || tx === void 0 ? void 0 : tx.vm_status) !== null && _a !== void 0 ? _a : "Unknown Aptos error");
        }
        if (!((payload === null || payload === void 0 ? void 0 : payload.function) === "0x1::coin::transfer" &&
            (payload === null || payload === void 0 ? void 0 : payload.type_arguments[0]) === "0x1::aptos_coin::AptosCoin" &&
            (tx === null || tx === void 0 ? void 0 : tx.vm_status) === "Executed successfully")) {
            throw new Error(`Aptos tx ${txId} failed validation`);
        }
        const isPending = tx.type === "pending_transaction";
        return {
            to: payload.arguments[0],
            from: tx.sender,
            amount: new bignumber_js_1.default(payload.arguments[1]),
            pending: isPending,
            confirmed: !isPending,
        };
    }
    ownerToAddress(owner) {
        const hash = SHA3.sha3_256.create();
        hash.update(Buffer.from(owner));
        hash.update("\x00");
        return `0x${(hash.hex())}`;
    }
    async sign(data) {
        return await this.getSigner().sign(data);
    }
    getSigner() {
        if (this.signerInstance)
            return this.signerInstance;
        if (this.signingFn) {
            const signer = new signing_1.AptosSigner("", "0x" + this.getPublicKey().toString("hex"));
            signer.sign = this.signingFn; //override signer fn
            return this.signerInstance = signer;
        }
        else {
            return this.signerInstance = new signing_1.AptosSigner(this.accountInstance.toPrivateKeyObject().privateKeyHex, this.accountInstance.toPrivateKeyObject().publicKeyHex);
        }
    }
    async verify(pub, data, signature) {
        return await signing_1.AptosSigner.verify(pub, data, signature);
    }
    async getCurrentHeight() {
        return new bignumber_js_1.default((await (await this.getProvider()).client.blocks.httpRequest.request({ method: "GET", url: "/" })).block_height);
    }
    async getFee(amount, to) {
        if (!this.address)
            throw new Error("Address is undefined - you might be missing a wallet, or have not run bundlr.ready()");
        const client = await this.getProvider();
        const payload = new aptos_1.CoinClient(client).transactionBuilder.buildTransactionPayload("0x1::coin::transfer", ["0x1::aptos_coin::AptosCoin"], [to !== null && to !== void 0 ? to : "0x149f7dc9c8e43c14ab46d3a6b62cfe84d67668f764277411f98732bf6718acf9", new bignumber_js_1.default(amount).toNumber()]);
        const rawTransaction = await client.generateRawTransaction(new aptos_1.HexString(this.address), payload);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const txnBuilder = new aptos_1.TransactionBuilderEd25519((_signingMessage) => {
            // @ts-ignore
            const invalidSigBytes = new Uint8Array(64);
            return new aptos_1.TxnBuilderTypes.Ed25519Signature(invalidSigBytes);
        }, this.getPublicKey());
        const signedSimulation = txnBuilder.sign(rawTransaction);
        const queryParams = {
            estimate_gas_unit_price: true,
            estimate_max_gas_amount: true,
        };
        const simulationResult = await client.client.request.request({
            url: "/transactions/simulate",
            query: queryParams,
            method: "POST",
            body: signedSimulation,
            mediaType: "application/x.aptos.signed_transaction+bcs",
        });
        return { gasUnitPrice: +simulationResult[0].gas_unit_price, maxGasAmount: +simulationResult[0].max_gas_amount };
        //const simulationResult = await client.simulateTransaction(this.accountInstance, rawTransaction, { estimateGasUnitPrice: true, estimateMaxGasAmount: true });
        // return new BigNumber(simulationResult?.[0].gas_unit_price).multipliedBy(simulationResult?.[0].gas_used);
        // const est = await provider.client.transactions.estimateGasPrice();
        // return new BigNumber(est.gas_estimate/* (await (await this.getProvider()).client.transactions.estimateGasPrice()).gas_estimate */); // * by gas limit (for upper limit)
    }
    async sendTx(data) {
        return (await (await (this.getProvider())).submitSignedBCSTransaction(data)).hash;
    }
    async createTx(amount, to, fee) {
        var _a, _b;
        if (!this.address)
            throw new Error("Address is undefined - you might be missing a wallet, or have not run bundlr.ready()");
        const client = await this.getProvider();
        const payload = new aptos_1.CoinClient(client).transactionBuilder.buildTransactionPayload("0x1::coin::transfer", ["0x1::aptos_coin::AptosCoin"], [to, new bignumber_js_1.default(amount).toNumber()]);
        const rawTransaction = await client.generateRawTransaction(new aptos_1.HexString(this.address), payload, { gasUnitPrice: BigInt((_a = fee === null || fee === void 0 ? void 0 : fee.gasUnitPrice) !== null && _a !== void 0 ? _a : 100), maxGasAmount: BigInt((_b = fee === null || fee === void 0 ? void 0 : fee.maxGasAmount) !== null && _b !== void 0 ? _b : 100000) });
        // const bcsTxn = AptosClient.generateBCSTransaction(this.accountInstance, rawTransaction);
        const signingMessage = aptos_1.TransactionBuilder.getSigningMessage(rawTransaction);
        const sig = await this.sign(signingMessage);
        const txnBuilder = new aptos_1.TransactionBuilderEd25519((_) => {
            // @ts-ignore
            return new aptos_1.TxnBuilderTypes.Ed25519Signature(sig);
        }, this.getPublicKey());
        const bcsTxn = txnBuilder.sign(rawTransaction);
        return { txId: undefined, tx: bcsTxn };
    }
    getPublicKey() {
        var _a;
        if ((_a = this.opts) === null || _a === void 0 ? void 0 : _a.signingFunction)
            return this.wallet;
        return Buffer.from(this.accountInstance.pubKey().toString().slice(2), "hex");
    }
    async ready() {
        var _a, _b;
        const client = await this.getProvider();
        this._address = await client.lookupOriginalAddress((_a = this.address) !== null && _a !== void 0 ? _a : "")
            .then(hs => hs.toString())
            .catch(_ => this._address); // fallback to original
        if (((_b = this._address) === null || _b === void 0 ? void 0 : _b.length) == 66 && this._address.charAt(2) === '0') {
            this._address = this._address.slice(0, 2) + this._address.slice(3);
        }
    }
}
exports.default = AptosConfig;
;
//# sourceMappingURL=aptos.js.map