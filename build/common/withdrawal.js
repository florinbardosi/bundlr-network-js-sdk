"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withdrawBalance = void 0;
const arbundles_1 = require("arbundles");
const utils_1 = require("arweave/node/lib/utils");
const utils_2 = __importDefault(require("./utils"));
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const base64url_1 = __importDefault(require("base64url"));
/**
 * Create and send a withdrawal request
 * @param utils Instance of Utils
 * @param api Instance of API
 * @param wallet Wallet to use
 * @param amount amount to withdraw in winston
 * @returns the response from the bundler
 */
async function withdrawBalance(utils, api, amount) {
    const c = utils.currencyConfig;
    const pkey = await c.getPublicKey();
    const data = { publicKey: pkey, currency: utils.currency, amount: new bignumber_js_1.default(amount).toString(), nonce: await utils.getNonce(), signature: "", sigType: c.getSigner().signatureType };
    const deephash = await (0, arbundles_1.deepHash)([(0, utils_1.stringToBuffer)(data.currency), (0, utils_1.stringToBuffer)(data.amount.toString()), (0, utils_1.stringToBuffer)(data.nonce.toString())]);
    if (!Buffer.isBuffer(data.publicKey)) {
        data.publicKey = Buffer.from(data.publicKey);
    }
    const signature = await c.sign(deephash);
    const isValid = await c.verify(data.publicKey, deephash, signature);
    data.publicKey = base64url_1.default.encode(data.publicKey);
    data.signature = base64url_1.default.encode(Buffer.from(signature));
    const cpk = base64url_1.default.toBuffer(data.publicKey);
    const csig = base64url_1.default.toBuffer(data.signature);
    // should match opk and csig
    const dh2 = await (0, arbundles_1.deepHash)([(0, utils_1.stringToBuffer)(data.currency), (0, utils_1.stringToBuffer)(data.amount.toString()), (0, utils_1.stringToBuffer)(data.nonce.toString())]);
    const isValid2 = await c.verify(cpk, dh2, csig);
    const isValid3 = c.ownerToAddress(c.name == "arweave" ? base64url_1.default.decode(data.publicKey) : base64url_1.default.toBuffer(data.publicKey)) === c.address;
    if (!(isValid || isValid2 || isValid3)) {
        throw new Error(`Internal withdrawal validation failed - please report this!\nDebug Info:${JSON.stringify(data)}`);
    }
    const res = await api.post("/account/withdraw", data);
    utils_2.default.checkAndThrow(res, "Withdrawing balance");
    return res.data;
}
exports.withdrawBalance = withdrawBalance;
//# sourceMappingURL=withdrawal.js.map