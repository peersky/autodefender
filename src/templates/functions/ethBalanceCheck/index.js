'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var require$$0 = require('defender-relay-client/lib/ethers');
var require$$1 = require('ethers');

var ethBalanceCheck = {};

var scopedSecrets = {};

Object.defineProperty(scopedSecrets, "__esModule", { value: true });
scopedSecrets.ScopedSecretsProvider = void 0;
// used to get the most specific value available for the provided secret name
// Autotask specific: Service_Stage_Task_Secret
// Stage specific: Service_Stage_Secret
// Service specific: Service_Secret
// Global: Secret
const ScopedSecretsProvider = function (event) {
    const STACK_DELIM = '_';
    const namespace = event.autotaskName;
    const key = function* (name) {
        const arr = namespace.split(STACK_DELIM).concat(name);
        do
            yield arr.join(STACK_DELIM);
        while (arr.splice(-2, 2, name).length > 1);
    };
    const find = (name, target) => {
        for (const i of key(name))
            if (i in target)
                return target[i];
    };
    //eslint-disable-next-line
    return new Proxy(event.secrets, { get: (target, name) => find(name, target) });
};
scopedSecrets.ScopedSecretsProvider = ScopedSecretsProvider;

Object.defineProperty(ethBalanceCheck, "__esModule", { value: true });
exports.SecretRequires = ethBalanceCheck.SecretRequires = exports.handler = ethBalanceCheck.handler = void 0;
const ethers_1 = require$$0;
const ethers_2 = require$$1;
const scopedSecrets_1 = scopedSecrets;
async function handler(event) {
    const match = event?.request?.body;
    if (!event.credentials) {
        throw new Error('Account balance checker action must have relay connected');
    }
    const provider = new ethers_1.DefenderRelayProvider(event); //This must be addressed in typescript package
    const scopedSecrets = (0, scopedSecrets_1.ScopedSecretsProvider)(event);
    const _threshold = scopedSecrets[`LOW_ETH_TRESHOLD`];
    if (!_threshold)
        throw new Error('Eth threshold not set');
    const retval = { matches: [] };
    for (const evt of match.events) {
        console.log('scanning tx of hash: ', evt.hash);
        for (const address of evt.matchedAddresses) {
            console.log('checking balance of ', address);
            const balance = await provider.getBalance(address);
            const threshold = ethers_2.ethers.utils.parseEther(_threshold);
            console.log('balance:', ethers_2.ethers.utils.formatEther(balance));
            console.log('threshold:', ethers_2.ethers.utils.formatEther(threshold));
            console.log('threshold.gt(balance)', threshold > balance);
            if (threshold.gt(balance)) {
                retval.matches.push({
                    hash: evt.hash,
                    metadata: {
                        address: address,
                        balance: balance,
                        threshold: ethers_2.ethers.utils.formatEther(threshold),
                    },
                });
            }
        }
    }
    return retval;
}
exports.handler = ethBalanceCheck.handler = handler;
exports.SecretRequires = ethBalanceCheck.SecretRequires = { LOW_ETH_THRESHOLD: '0' };

exports.default = ethBalanceCheck;
