"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const async_retry_1 = __importDefault(require("async-retry"));
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const utils_1 = __importDefault(require("./utils"));
class Fund {
    constructor(utils) {
        this.utils = utils;
    }
    /**
     * Function to Fund (send funds to) a Bundlr node - inherits instance currency and node
     * @param amount - amount in base units to send
     * @param multiplier - network tx fee multiplier - only works for specific currencies
     * @returns  - funding receipt
     */
    async fund(amount, multiplier = 1.0) {
        var _a, _b;
        const _amount = new bignumber_js_1.default(amount);
        if (!_amount.isInteger()) {
            throw new Error("must use an integer for funding amount");
        }
        const c = this.utils.currencyConfig;
        const to = await this.utils.getBundlerAddress(this.utils.currency);
        let fee;
        if (c.needsFee) {
            // winston's fee is actually for amount of data, not funds, so we have to 0 this.
            const baseFee = await c.getFee(c.base[0] === "winston" ? 0 : _amount, to);
            fee = bignumber_js_1.default.isBigNumber(baseFee) ? baseFee.multipliedBy(multiplier).integerValue(bignumber_js_1.default.ROUND_CEIL) : baseFee;
        }
        const tx = await c.createTx(_amount, to, fee);
        let nres;
        // eslint-disable-next-line no-useless-catch
        try {
            nres = await c.sendTx(tx.tx);
        }
        catch (e) {
            throw e;
        }
        (_a = tx.txId) !== null && _a !== void 0 ? _a : (tx.txId = nres);
        if (!tx.txId) {
            throw new Error(`Undefined transaction ID`);
        }
        utils_1.default.checkAndThrow(nres, `Sending transaction to the ${this.utils.currency} network`);
        let confirmError = await this.utils.confirmationPoll(tx.txId);
        const bres = await (0, async_retry_1.default)(async () => {
            const bres = await this.utils.api.post(`/account/balance/${this.utils.currency}`, { tx_id: tx.txId });
            utils_1.default.checkAndThrow(bres, `Posting transaction ${tx.txId} information to the bundler`, [202]);
            return bres;
        }, {
            retries: 5,
            maxTimeout: 1000,
            minTimeout: 100,
            randomize: true
        }).catch(e => { confirmError = e; return undefined; });
        if (!bres) {
            throw new Error(`failed to post funding tx - ${tx.txId} - keep this id! \n ${confirmError ? ` - ${(_b = confirmError === null || confirmError === void 0 ? void 0 : confirmError.message) !== null && _b !== void 0 ? _b : confirmError}` : ""}`);
        }
        return { reward: bignumber_js_1.default.isBigNumber(fee) ? fee.toString() : JSON.stringify(fee), target: to, quantity: _amount.toString(), id: tx.txId };
    }
}
exports.default = Fund;
//# sourceMappingURL=fund.js.map