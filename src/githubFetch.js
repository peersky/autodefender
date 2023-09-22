const {ethers} = require('ethers');

const path = require('path');
const {matches} = require('./utils');
const fetchGH = async (path) => {
  return fetch(path).then(
    (response) => response.json(),
    (r) => {
      console.error(r);
    }
  );
};
const getDeployments = async (config) => {
  console.log('getDeployments...');
  const deploymentRecords = [];
  const pathes = await fetchGH(config.path);
  for (const deploymentPath of pathes) {
    const nKey = Object.keys(config.networks).find(
      (_nkey) =>
        _nkey === deploymentPath.name ||
        (config.networks[_nkey].directoryName &&
          deploymentPath.name === config.networks[_nkey].directoryName)
    );
    if (nKey) {
      console.log('Fetching network directory for ', nKey, '...');
      const nwDirPath = config.path + '/' + deploymentPath.name;
      console.log('fetching..', nwDirPath);
      const networkDir = await fetchGH(nwDirPath);
      for (const contractFileDescr of networkDir) {
        if (
          !matches(contractFileDescr.name, config.excludeDeployments) &&
          contractFileDescr.type == 'file' &&
          contractFileDescr.name !== '.chainId'
        ) {
          const filePath = nwDirPath + contractFileDescr.name;
          console.log('fetching..', filePath);
          const rec = await fetchGH(contractFileDescr.download_url);

          if (rec.address && rec.abi) {
            if (rec.abi.length == 1) {
              const transform = ethers.Interface.from(rec.abi).format('full');
              rec.abi = transform;
            }
            deploymentRecords.push({
              ...rec,
              name: path.parse(contractFileDescr.name).name,
              network: nKey,
            });
          }
        }
      }
    }
  }
  return deploymentRecords;
};
exports.getDeployments = getDeployments;
