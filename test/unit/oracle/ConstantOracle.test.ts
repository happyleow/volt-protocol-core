import { getCore, getAddresses } from '../../helpers';
import { expect } from 'chai'
import hre, { ethers, artifacts } from 'hardhat'

const ConstantOracle = artifacts.readArtifactSync('ConstantOracle');

describe('ConstantOracle', function () {
  let governorAddress: string

  beforeEach(async function () {
    ({ governorAddress } = await getAddresses());  
    this.core = await getCore();

    const constantOracleFactory = await ethers.getContractFactory(ConstantOracle.abi, ConstantOracle.bytecode)
    this.oracle = await constantOracleFactory.deploy(this.core.address, '200100');
  });

  it('isOutdated() false', async function() {
    expect(await this.oracle.isOutdated()).to.be.equal(false);
  });

  it('update() does nothing, returns false', async function() {
    expect(await this.oracle.isOutdated()).to.be.equal(false);
    await this.oracle.update();
    expect(await this.oracle.isOutdated()).to.be.equal(false);
  });
  it('read() is valid', async function() {
    const read = await this.oracle.read();
    expect(read[1]).to.be.equal(true); // valid
  });
  it('read() is invalid if paused', async function() {
    await hre.network.provider.request({
      'method': 'harhat_impersonateAccount',
      'params': [governorAddress]
    })
    const governorSigner = await ethers.getSigner(governorAddress)
    await this.oracle.connect(governorSigner).pause();
    const read = await this.oracle.read();
    expect(read[1]).to.be.equal(false); // invalid
    await hre.network.provider.request({
      'method':'hardhat_stopImpersonatingAccount',
      'params': [governorAddress]
    })
  });
  it('read() is always a Decimal (with 18 decimals)', async function() {
    expect((await this.oracle.read())[0] / 1e18).to.be.equal(20.01);
  });
});
