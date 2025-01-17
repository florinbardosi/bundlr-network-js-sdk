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
const SHA3 = __importStar(require("js-sha3"));
const currency_1 = __importDefault(require("../currency"));
class AptosConfig extends currency_1.default {
    constructor(config) {
        // if (typeof config.wallet === "string" && config.wallet.length === 66) config.wallet = Buffer.from(config.wallet.slice(2), "hex");
        // // @ts-ignore
        // config.accountInstance = new AptosAccount(config.wallet);
        super(config);
        this.base = ["aptom", 1e8];
    }
    async getProvider() {
        var _a;
        return (_a = this.providerInstance) !== null && _a !== void 0 ? _a : (this.providerInstance = new aptos_1.AptosClient(this.providerUrl));
    }
    async getTx(txId) {
        var _a;
        const client = await this.getProvider();
        const tx = await client.waitForTransactionWithResult(txId, /* { checkSuccess: true } */ { timeoutSecs: 1, checkSuccess: true });
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
        var _a;
        return (_a = this.signerInstance) !== null && _a !== void 0 ? _a : (this.signerInstance = new signing_1.InjectedAptosSigner(this.wallet, this._publicKey));
    }
    async verify(pub, data, signature) {
        return await signing_1.InjectedAptosSigner.verify(pub, data, signature);
    }
    async getCurrentHeight() {
        return new bignumber_js_1.default((await (await this.getProvider()).client.blocks.httpRequest.request({ method: "GET", url: "/" })).block_height);
    }
    async getFee(amount, to) {
        const client = await this.getProvider();
        const payload = new aptos_1.CoinClient(client).transactionBuilder.buildTransactionPayload("0x1::coin::transfer", ["0x1::aptos_coin::AptosCoin"], [to !== null && to !== void 0 ? to : "0x149f7dc9c8e43c14ab46d3a6b62cfe84d67668f764277411f98732bf6718acf9", new bignumber_js_1.default(amount).toNumber()]);
        if (!this.address)
            throw new Error("Address is undefined - you might be missing a wallet, or have not run bundlr.ready()");
        const rawTransaction = await client.generateRawTransaction(new aptos_1.HexString(this.address), payload);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const txnBuilder = new aptos_1.TransactionBuilderEd25519((_signingMessage) => {
            // @ts-ignore
            const invalidSigBytes = new Uint8Array(64);
            return new aptos_1.TxnBuilderTypes.Ed25519Signature(invalidSigBytes);
        }, await this.getPublicKey());
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
        return (await this.wallet.signAndSubmitTransaction(data)).hash;
        // return (await (await (this.getProvider())).submitSignedBCSTransaction(data)).hash;
    }
    async createTx(amount, to, _fee) {
        //const client = await this.getProvider();
        // const payload = new CoinClient(client).transactionBuilder.buildTransactionPayload(
        //     "0x1::coin::transfer",
        //     ["0x1::aptos_coin::AptosCoin"],
        //     [to, new BigNumber(amount).toNumber()],
        // );
        const tx = {
            arguments: [to, new bignumber_js_1.default(amount).toNumber()],
            function: '0x1::coin::transfer',
            type: 'entry_function_payload',
            type_arguments: ['0x1::aptos_coin::AptosCoin'],
        };
        // const rawTransaction = await client.generateRawTransaction(this.accountInstance.address(), payload);
        // const bcsTxn = AptosClient.generateBCSTransaction(this.accountInstance, rawTransaction);
        // const tx = await this.wallet.signTransaction(transaction);
        return { txId: undefined, tx };
    }
    async getPublicKey() {
        var _a;
        return (_a = this._publicKey) !== null && _a !== void 0 ? _a : (this._publicKey = Buffer.from((await this.wallet.account()).publicKey.toString().slice(2), "hex"));
    }
    async ready() {
        var _a, _b;
        this._publicKey = await this.getPublicKey();
        this._address = this.ownerToAddress(this._publicKey);
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