"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bignumber_js_1 = __importDefault(require("bignumber.js"));
const arweave_1 = __importDefault(require("./arweave"));
const erc20_1 = __importDefault(require("./erc20"));
const ethereum_1 = __importDefault(require("./ethereum"));
const near_1 = __importDefault(require("./near"));
const solana_1 = __importDefault(require("./solana"));
const algorand_1 = __importDefault(require("./algorand"));
const axios_1 = __importDefault(require("axios"));
const utils_1 = __importDefault(require("../../common/utils"));
const aptos_1 = __importDefault(require("./aptos"));
const multiAptos_1 = __importDefault(require("./multiAptos"));
function getCurrency(currency, wallet, url, providerUrl, contractAddress, opts) {
    switch (currency) {
        case "arweave":
            return new arweave_1.default({ name: "arweave", ticker: "AR", minConfirm: 10, providerUrl: providerUrl !== null && providerUrl !== void 0 ? providerUrl : "https://arweave.net", wallet, isSlow: true, opts });
        case "ethereum":
            return new ethereum_1.default({ name: "ethereum", ticker: "ETH", providerUrl: providerUrl !== null && providerUrl !== void 0 ? providerUrl : "https://cloudflare-eth.com/", wallet, opts });
        case "matic":
            return new ethereum_1.default({ name: "matic", ticker: "MATIC", minConfirm: 1, providerUrl: providerUrl !== null && providerUrl !== void 0 ? providerUrl : "https://polygon-rpc.com/", wallet, opts });
        case "bnb":
            return new ethereum_1.default({ name: "bnb", ticker: "BNB", providerUrl: providerUrl !== null && providerUrl !== void 0 ? providerUrl : "https://bsc-dataseed.binance.org/", wallet, opts });
        case "fantom":
            return new ethereum_1.default({ name: "fantom", ticker: "FTM", providerUrl: providerUrl !== null && providerUrl !== void 0 ? providerUrl : "https://rpc.ftm.tools/", wallet, opts });
        case "solana":
            return new solana_1.default({ name: "solana", ticker: "SOL", providerUrl: providerUrl !== null && providerUrl !== void 0 ? providerUrl : "https://api.mainnet-beta.solana.com/", wallet, opts });
        case "avalanche":
            return new ethereum_1.default({ name: "avalanche", ticker: "AVAX", providerUrl: providerUrl !== null && providerUrl !== void 0 ? providerUrl : "https://api.avax-test.network/ext/bc/C/rpc/", wallet, opts });
        case "boba-eth":
            return new ethereum_1.default({ name: "boba-eth", ticker: "ETH", providerUrl: providerUrl !== null && providerUrl !== void 0 ? providerUrl : "https://mainnet.boba.network/", minConfirm: 1, wallet, opts });
        case "boba": {
            const k = new erc20_1.default({ name: "boba", ticker: "BOBA", providerUrl: providerUrl !== null && providerUrl !== void 0 ? providerUrl : "https://mainnet.boba.network/", contractAddress: contractAddress !== null && contractAddress !== void 0 ? contractAddress : "0xa18bF3994C0Cc6E3b63ac420308E5383f53120D7", minConfirm: 1, wallet, opts });
            // for L1 mainnet: "https://main-light.eth.linkpool.io/" and "0x42bbfa2e77757c645eeaad1655e0911a7553efbc"
            k.price = async () => {
                var _a;
                const res = await axios_1.default.post("https://api.livecoinwatch.com/coins/single", JSON.stringify({ "currency": "USD", "code": `${k.ticker}` }), { headers: { "x-api-key": "75a7a824-6577-45e6-ad86-511d590c7cc8", "content-type": "application/json" } });
                await utils_1.default.checkAndThrow(res, "Getting price data");
                if (!((_a = res === null || res === void 0 ? void 0 : res.data) === null || _a === void 0 ? void 0 : _a.rate)) {
                    throw new Error(`unable to get price for ${k.name}`);
                }
                return +res.data.rate;
            };
            return k;
        }
        case "arbitrum":
            return new ethereum_1.default({ name: "arbitrum", ticker: "ETH", providerUrl: providerUrl !== null && providerUrl !== void 0 ? providerUrl : "https://arb1.arbitrum.io/rpc/", wallet, opts });
        case "chainlink":
            return new erc20_1.default({ name: "chainlink", ticker: "LINK", providerUrl: providerUrl !== null && providerUrl !== void 0 ? providerUrl : "https://main-light.eth.linkpool.io/", contractAddress: contractAddress !== null && contractAddress !== void 0 ? contractAddress : "0x514910771AF9Ca656af840dff83E8264EcF986CA", wallet, opts });
        case "kyve": {
            const k = new erc20_1.default({ name: "kyve", ticker: "KYVE", minConfirm: 0, providerUrl: providerUrl !== null && providerUrl !== void 0 ? providerUrl : "https://moonbeam-alpha.api.onfinality.io/public", contractAddress: contractAddress !== null && contractAddress !== void 0 ? contractAddress : "0x3cf97096ccdb7c3a1d741973e351cb97a2ede2c1", isSlow: true, wallet, opts });
            k.price = async () => { return 100; }; // TODO: replace for mainnet
            k.getGas = async () => { return [new bignumber_js_1.default(100), 1e18]; };
            return k; // TODO: ensure units above are right
        }
        case "near": {
            return new near_1.default({ name: "near", ticker: "NEAR", providerUrl: providerUrl !== null && providerUrl !== void 0 ? providerUrl : "https://rpc.mainnet.near.org", wallet, bundlrUrl: url, opts });
        }
        case "algorand": {
            return new algorand_1.default({ name: "algorand", ticker: "ALGO", providerUrl: providerUrl !== null && providerUrl !== void 0 ? providerUrl : "https://algoexplorerapi.io", wallet, opts });
        }
        case "aptos": {
            return new aptos_1.default({ name: "aptos", ticker: "APTOS", providerUrl: providerUrl !== null && providerUrl !== void 0 ? providerUrl : "https://fullnode.mainnet.aptoslabs.com", wallet, opts });
        }
        case "multiaptos": {
            return new multiAptos_1.default({ name: "aptos", ticker: "APTOS", providerUrl: providerUrl !== null && providerUrl !== void 0 ? providerUrl : "https://fullnode.mainnet.aptoslabs.com/v1", wallet, opts });
        }
        default:
            throw new Error(`Unknown/Unsupported currency ${currency}`);
    }
}
exports.default = getCurrency;
//# sourceMappingURL=index.js.map