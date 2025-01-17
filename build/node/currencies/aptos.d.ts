/// <reference types="node" />
import { AptosAccount, AptosClient } from "aptos";
import { AptosSigner, Signer } from "arbundles/src/signing";
import BigNumber from "bignumber.js";
import { CurrencyConfig, Tx } from "../../common/types";
import BaseNodeCurrency from "../currency";
export default class AptosConfig extends BaseNodeCurrency {
    protected providerInstance?: AptosClient;
    protected accountInstance: AptosAccount;
    protected signerInstance: AptosSigner;
    protected signingFn: (msg: Uint8Array) => Promise<Uint8Array>;
    opts: any;
    constructor(config: CurrencyConfig);
    getProvider(): Promise<AptosClient>;
    getTx(txId: string): Promise<Tx>;
    ownerToAddress(owner: any): string;
    sign(data: Uint8Array): Promise<Uint8Array>;
    getSigner(): Signer;
    verify(pub: any, data: Uint8Array, signature: Uint8Array): Promise<boolean>;
    getCurrentHeight(): Promise<BigNumber>;
    getFee(amount: BigNumber.Value, to?: string): Promise<{
        gasUnitPrice: number;
        maxGasAmount: number;
    }>;
    sendTx(data: any): Promise<string | undefined>;
    createTx(amount: BigNumber.Value, to: string, fee?: {
        gasUnitPrice: number;
        maxGasAmount: number;
    }): Promise<{
        txId: string | undefined;
        tx: any;
    }>;
    getPublicKey(): string | Buffer;
    ready(): Promise<void>;
}
