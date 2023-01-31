/// <reference types="node" />
import { FileDataItem } from "arbundles/file";
import { Signer } from "arbundles/src/signing";
import BigNumber from "bignumber.js";
import { Tx, CurrencyConfig } from "../common/types";
import { NodeCurrency } from "./types";
import Utils from "../common/utils";
export default abstract class BaseNodeCurrency implements NodeCurrency {
    base: [string, number];
    protected wallet: any;
    protected _address: string | undefined;
    protected providerUrl: any;
    protected providerInstance?: any;
    ticker: string;
    name: string;
    protected minConfirm: number;
    isSlow: boolean;
    needsFee: boolean;
    protected opts?: any;
    protected utils: Utils;
    constructor(config: CurrencyConfig);
    get address(): string | undefined;
    getId(item: FileDataItem): Promise<string>;
    price(): Promise<number>;
    abstract getTx(_txId: string): Promise<Tx>;
    abstract ownerToAddress(_owner: any): string;
    abstract sign(_data: Uint8Array): Promise<Uint8Array>;
    abstract getSigner(): Signer;
    abstract verify(_pub: any, _data: Uint8Array, _signature: Uint8Array): Promise<boolean>;
    abstract getCurrentHeight(): Promise<BigNumber>;
    abstract getFee(_amount: BigNumber.Value, _to?: string): Promise<BigNumber | object>;
    abstract sendTx(_data: any): Promise<string | undefined>;
    abstract createTx(_amount: BigNumber.Value, _to: string, _fee?: string | object): Promise<{
        txId: string | undefined;
        tx: any;
    }>;
    abstract getPublicKey(): string | Buffer;
}
export declare function getRedstonePrice(currency: string): Promise<number>;