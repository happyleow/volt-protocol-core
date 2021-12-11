import { ethers } from 'hardhat';
import chai, { expect } from 'chai';
import CBN from 'chai-bn';
import {
  DeployUpgradeFunc,
  NamedContracts,
  SetupUpgradeFunc,
  TeardownUpgradeFunc,
  ValidateUpgradeFunc
} from '@custom-types/types';

chai.use(CBN(ethers.BigNumber));

const toBN = ethers.BigNumber.from;

/*
Moar DAI

DEPLOY ACTIONS:

DAO ACTIONS:
1. setCore on Fei to restrictedPermissions

*/

export const deploy: DeployUpgradeFunc = async (deployAddress, addresses, logging = false) => {
  return {} as NamedContracts;
};

export const setup: SetupUpgradeFunc = async (addresses, oldContracts, contracts, logging) => {
  logging && console.log('No setup');
};

export const teardown: TeardownUpgradeFunc = async (addresses, oldContracts, contracts, logging) => {
  logging && console.log('No teardown');
};

export const validate: ValidateUpgradeFunc = async (addresses, oldContracts, contracts) => {
  const { daiBondingCurve } = contracts;

  expect(await daiBondingCurve.scale()).to.be.bignumber.equal(toBN('150000000000000000000000000'));
  expect(await daiBondingCurve.mintCap()).to.be.bignumber.equal(toBN('160000000000000000000000000'));
  expect(await daiBondingCurve.buffer()).to.be.bignumber.equal(toBN('20'));
};
