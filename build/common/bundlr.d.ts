/// <reference types="node" />
/// <reference types="node" />
import Utils from "./utils";
import Uploader from "./upload";
import Fund from "./fund";
import { DataItemCreateOptions } from "arbundles";
import BundlrTransaction from "./transaction";
import Api from "./api";
import BigNumber from "bignumber.js";
import { CreateAndUploadOptions, Currency, FundResponse, UploadResponse, WithdrawalResponse } from "./types";
import { Signer } from "arbundles/src/signing";
import { Readable } from "stream";
export default abstract class Bundlr {
    api: Api;
    utils: Utils;
    uploader: Uploader;
    funder: Fund;
    address: any;
    currency: any;
    currencyConfig: Currency;
    protected _readyPromise: Promise<void>;
    url: URL;
    constructor(url: any);
    get signer(): Signer;
    withdrawBalance(amount: BigNumber.Value): Promise<WithdrawalResponse>;
    /**
     * Gets the balance for the loaded wallet
     * @returns balance (in winston)
     */
    getLoadedBalance(): Promise<BigNumber>;
    /**
     * Gets the balance for the specified address
     * @param address address to query for
     * @returns the balance (in winston)
     */
    getBalance(address: string): Promise<BigNumber>;
    /**
     * Sends amount atomic units to the specified bundler
     * @param amount amount to send in atomic units
     * @returns details about the fund transaction
     */
    fund(amount: BigNumber.Value, multiplier?: number): Promise<FundResponse>;
    /**
     * Calculates the price for [bytes] bytes for the loaded currency and Bundlr node.
     * @param bytes
     * @returns
     */
    getPrice(bytes: number): Promise<BigNumber>;
    verifyReceipt(receipt: Required<UploadResponse>): Promise<boolean>;
    /**
     * Create a new BundlrTransactions (flex currency arbundles dataItem)
     * @param data
     * @param opts - dataItemCreateOptions
     * @returns - a new BundlrTransaction instance
     */
    createTransaction(data: string | Buffer, opts?: DataItemCreateOptions): BundlrTransaction;
    /**
     * Returns the signer for the loaded currency
     */
    getSigner(): Signer;
    upload(data: string | Buffer | Readable, opts?: CreateAndUploadOptions): Promise<UploadResponse>;
    ready(): Promise<void>;
    get transaction(): {
        fromRaw(rawTransaction: Uint8Array): BundlrTransaction;
    };
}
