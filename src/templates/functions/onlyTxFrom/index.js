'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var require$$0 = require('ethers');

var onlyTxFrom = {};

Object.defineProperty(onlyTxFrom, "__esModule", { value: true });
exports.handler = onlyTxFrom.handler = void 0;
const ethers_1 = require$$0;
async function handler(event) {
    const request = event?.request?.body;
    const retval = { matches: [] };
    for (const _evt of request.events) {
        const evt = _evt;
        const txFromChecksum = ethers_1.ethers.utils.getAddress(evt.transaction.from);
        console.log('Looking for a matches with:', txFromChecksum);
        if (evt.sentinel.addresses.includes(txFromChecksum)) {
            console.log('Matched: ', evt.transaction.from);
            retval.matches.push({
                hash: evt.hash,
                metadata: {
                    title: 'Priviledged account activity',
                    description: 'Transaction sent by account',
                    account: txFromChecksum,
                },
            });
        }
    }
    return retval;
}
exports.handler = onlyTxFrom.handler = handler;

exports.default = onlyTxFrom;
