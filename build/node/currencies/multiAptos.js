"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const aptos_1 = require("aptos");
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const aptos_2 = __importDefault(require("./aptos"));
const signing_1 = require("arbundles/src/signing");
class MultiSignatureAptos extends aptos_2.default {
    constructor(config) {
        var _a;
        super(config);
        this.collectSignatures = (_a = this === null || this === void 0 ? void 0 : this.opts) === null || _a === void 0 ? void 0 : _a.collectSignatures;
        this.needsFee = true;
    }
    /**
     * @param owner compound MultiEd25519PublicKey .toBytes()
     */
    ownerToAddress(pubKey) {
        // deserialise key
        const multiSigPublicKey = this.deserialisePubKey(pubKey);
        // derive address
        const authKey2 = aptos_1.TxnBuilderTypes.AuthenticationKey.fromMultiEd25519PublicKey(multiSigPublicKey);
        return authKey2.derivedAddress().toString();
    }
    deserialisePubKey(pubKey) {
        const threshold = +pubKey.slice(32 * 32).toString();
        const keys = [];
        const nullBuf = Buffer.alloc(32, 0);
        for (let i = 0; i < 32; i++) {
            let key = pubKey.subarray(i * 32, (i + 1) * 32);
            if (!key.equals(nullBuf))
                keys.push(new aptos_1.TxnBuilderTypes.Ed25519PublicKey(key));
        }
        // reconstruct key
        return new aptos_1.TxnBuilderTypes.MultiEd25519PublicKey(keys, threshold);
    }
    getPublicKey() {
        const { participants, threshold } = this.wallet;
        const pkey = Buffer.alloc(32 * 32 + 1);
        participants.forEach((k, i) => {
            pkey.set(k, i * 32);
        });
        pkey.set(Buffer.from(threshold.toString()), 1024);
        return pkey;
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
        }, new Uint8Array(32));
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
    }
    async createTx(amount, to, fee) {
        var _a, _b;
        const client = await this.getProvider();
        const { participants, threshold } = this.wallet;
        const multiSigPublicKey = new aptos_1.TxnBuilderTypes.MultiEd25519PublicKey(participants.map(v => new aptos_1.TxnBuilderTypes.Ed25519PublicKey(v)), threshold);
        const authKey = aptos_1.TxnBuilderTypes.AuthenticationKey.fromMultiEd25519PublicKey(multiSigPublicKey);
        const mutisigAccountAddress = authKey.derivedAddress();
        const token = new aptos_1.TxnBuilderTypes.TypeTagStruct(aptos_1.TxnBuilderTypes.StructTag.fromString("0x1::aptos_coin::AptosCoin"));
        const entryFunctionPayload = new aptos_1.TxnBuilderTypes.TransactionPayloadEntryFunction(aptos_1.TxnBuilderTypes.EntryFunction.natural(
        // Fully qualified module name, `AccountAddress::ModuleName`
        "0x1::coin", 
        // Module function
        "transfer", 
        // The coin type to transfer
        [token], 
        // Arguments for function `transfer`: receiver account address and amount to transfer
        [
            aptos_1.BCS.bcsToBytes(aptos_1.TxnBuilderTypes.AccountAddress.fromHex(to)),
            aptos_1.BCS.bcsSerializeUint64(new bignumber_js_1.default(amount).toNumber())
        ]));
        const [{ sequence_number: sequenceNumber }, chainId] = await Promise.all([
            client.getAccount(mutisigAccountAddress),
            client.getChainId(),
        ]);
        const rawTx = new aptos_1.TxnBuilderTypes.RawTransaction(
        // Transaction sender account address
        aptos_1.TxnBuilderTypes.AccountAddress.fromHex(mutisigAccountAddress), BigInt(sequenceNumber), entryFunctionPayload, 
        // Max gas unit to spend
        BigInt((_a = fee === null || fee === void 0 ? void 0 : fee.maxGasAmount) !== null && _a !== void 0 ? _a : 10000), 
        // Gas price per unit
        BigInt((_b = fee === null || fee === void 0 ? void 0 : fee.gasUnitPrice) !== null && _b !== void 0 ? _b : 100), 
        // Expiration timestamp. Transaction is discarded if it is not executed within 1000 seconds (16.6 minutes) from now.
        BigInt(Math.floor(Date.now() / 1000) + 1000), new aptos_1.TxnBuilderTypes.ChainId(chainId));
        return { tx: rawTx, txId: undefined };
    }
    async sendTx(data) {
        const client = await this.getProvider();
        const signingMessage = aptos_1.TransactionBuilder.getSigningMessage(data);
        const { signatures, bitmap } = await this.collectSignatures(signingMessage);
        const txnBuilder = new aptos_1.TransactionBuilderMultiEd25519((_) => {
            // Bitmap masks which public key has signed transaction.
            // See https://aptos-labs.github.io/ts-sdk-doc/classes/TxnBuilderTypes.MultiEd25519Signature.html#createBitmap
            const encodedBitmap = aptos_1.TxnBuilderTypes.MultiEd25519Signature.createBitmap(bitmap);
            // See https://aptos-labs.github.io/ts-sdk-doc/classes/TxnBuilderTypes.MultiEd25519Signature.html#constructor
            const muliEd25519Sig = new aptos_1.TxnBuilderTypes.MultiEd25519Signature(signatures.map((s) => new aptos_1.TxnBuilderTypes.Ed25519Signature(s)), encodedBitmap);
            return muliEd25519Sig;
            //@ts-ignore
        }, this.deserialisePubKey(this.getPublicKey()));
        //@ts-ignore
        const bcsTxn = txnBuilder.sign(data);
        const txRes = await client.submitSignedBCSTransaction(bcsTxn);
        return txRes.hash;
    }
    getSigner() {
        var _a;
        if (this.signerInstance)
            return this.signerInstance;
        const pkey = Buffer.alloc(1025);
        const deserKey = this.deserialisePubKey(this.getPublicKey());
        deserKey.public_keys.forEach((k, i) => {
            pkey.set(k.value, i * 32);
        });
        pkey.set(Buffer.from(deserKey.threshold.toString()), 1024);
        return (_a = this.signerInstance) !== null && _a !== void 0 ? _a : (this.signerInstance = new signing_1.MultiSignatureAptosSigner(pkey, this.collectSignatures));
    }
    async ready() {
        await super.ready();
        this.accountInstance = new aptos_1.AptosAccount(undefined, this.address);
    }
    async verify(pub, data, signature) {
        return await signing_1.MultiSignatureAptosSigner.verify(pub, data, signature);
    }
}
exports.default = MultiSignatureAptos;
//# sourceMappingURL=multiAptos.js.map