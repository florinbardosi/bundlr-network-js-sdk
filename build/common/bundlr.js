"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = __importDefault(require("./utils"));
const withdrawal_1 = require("./withdrawal");
const transaction_1 = __importDefault(require("./transaction"));
class Bundlr {
    constructor(url) { this.url = url; }
    get signer() {
        return this.currencyConfig.getSigner();
    }
    async withdrawBalance(amount) {
        return (0, withdrawal_1.withdrawBalance)(this.utils, this.api, amount);
    }
    /**
     * Gets the balance for the loaded wallet
     * @returns balance (in winston)
     */
    async getLoadedBalance() {
        return this.utils.getBalance(this.address);
    }
    /**
     * Gets the balance for the specified address
     * @param address address to query for
     * @returns the balance (in winston)
     */
    async getBalance(address) {
        return this.utils.getBalance(address);
    }
    /**
     * Sends amount atomic units to the specified bundler
     * @param amount amount to send in atomic units
     * @returns details about the fund transaction
     */
    async fund(amount, multiplier) {
        return this.funder.fund(amount, multiplier);
    }
    /**
     * Calculates the price for [bytes] bytes for the loaded currency and Bundlr node.
     * @param bytes
     * @returns
     */
    async getPrice(bytes) {
        return this.utils.getPrice(this.currency, bytes);
    }
    async verifyReceipt(receipt) {
        return utils_1.default.verifyReceipt(receipt);
    }
    /**
     * Create a new BundlrTransactions (flex currency arbundles dataItem)
     * @param data
     * @param opts - dataItemCreateOptions
     * @returns - a new BundlrTransaction instance
     */
    createTransaction(data, opts) {
        return new transaction_1.default(data, this, opts);
    }
    /**
     * Returns the signer for the loaded currency
     */
    getSigner() {
        return this.currencyConfig.getSigner();
    }
    async upload(data, opts) {
        return this.uploader.uploadData(data, opts);
    }
    async ready() {
        this.currencyConfig.ready ? await this.currencyConfig.ready() : true;
        this.address = this.currencyConfig.address;
    }
    get transaction() {
        const oThis = this;
        return {
            fromRaw(rawTransaction) {
                return new transaction_1.default(rawTransaction, oThis, { dataIsRawTransaction: true });
            }
        };
    }
}
exports.default = Bundlr;
//# sourceMappingURL=bundlr.js.map