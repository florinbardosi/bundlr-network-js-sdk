/// <reference types="node" />
import { AptosClient } from "aptos";
import { InjectedAptosSigner, Signer } from "arbundles/src/signing";
import BigNumber from "bignumber.js";
import { CurrencyConfig, Tx } from "../../common/types";
import { TransactionPayload, PendingTransaction } from "aptos/src/generated";
import BaseWebCurrency from "../currency";
export interface SignMessagePayload {
    address?: boolean;
    application?: boolean;
    chainId?: boolean;
    message: string;
    nonce: string;
}
export interface SignMessageResponse {
    address: string;
    application: string;
    chainId: number;
    fullMessage: string;
    message: string;
    nonce: string;
    prefix: string;
    signature: string;
}
export interface AptosWallet {
    account: () => Promise<{
        address: string;
        publicKey: string;
    }>;
    connect: () => Promise<{
        address: string;
        publicKey: string;
    }>;
    disconnect: () => Promise<void>;
    isConnected: () => Promise<boolean>;
    network: () => Promise<"Testnet" | "Mainnet">;
    signAndSubmitTransaction: (transaction: TransactionPayload) => Promise<PendingTransaction>;
    signMessage: (payload: SignMessagePayload) => Promise<SignMessageResponse>;
    signTransaction: (transaction: TransactionPayload) => Promise<Uint8Array>;
}
export default class AptosConfig extends BaseWebCurrency {
    protected providerInstance?: AptosClient;
    protected signerInstance: InjectedAptosSigner;
    protected wallet: AptosWallet;
    protected _publicKey: Buffer;
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
    createTx(amount: BigNumber.Value, to: string, _fee?: string): Promise<{
        txId: string | undefined;
        tx: any;
    }>;
    getPublicKey(): Promise<string | Buffer>;
    ready(): Promise<void>;
}
