/// <reference types="node" />
import { TxnBuilderTypes } from "aptos";
import BigNumber from "bignumber.js";
import { CurrencyConfig } from "../../common/types";
import Aptos from "./aptos";
import { Signer, MultiSignatureAptosSigner } from "arbundles/src/signing";
export type HexString = string;
export default class MultiSignatureAptos extends Aptos {
    wallet: {
        participants: Buffer[];
        threshold: number;
    };
    protected signerInstance: MultiSignatureAptosSigner;
    protected collectSignatures: (message: Uint8Array) => Promise<{
        signatures: Buffer[];
        bitmap: number[];
    }>;
    constructor(config: CurrencyConfig & {
        opts: {
            collectSignatures: any;
        };
    });
    /**
     * @param owner compound MultiEd25519PublicKey .toBytes()
     */
    ownerToAddress(pubKey: Buffer): string;
    protected deserialisePubKey(pubKey: Buffer): TxnBuilderTypes.MultiEd25519PublicKey;
    getPublicKey(): string | Buffer;
    getFee(amount: BigNumber.Value, to?: string): Promise<{
        gasUnitPrice: number;
        maxGasAmount: number;
    }>;
    createTx(amount: BigNumber.Value, to: string, fee?: {
        gasUnitPrice: number;
        maxGasAmount: number;
    }): Promise<{
        txId: string | undefined;
        tx: any;
    }>;
    sendTx(data: any): Promise<string>;
    getSigner(): Signer;
    ready(): Promise<void>;
    verify(pub: any, data: Uint8Array, signature: Uint8Array): Promise<boolean>;
}
