import { expectRevert, balance, getAddresses, getCore } from '../../helpers';
import { expect } from 'chai'
import hre, { ethers, artifacts } from 'hardhat'

const RatioPCVController = artifacts.readArtifactSync('RatioPCVController');
const MockERC20 = artifacts.readArtifactSync('MockERC20');
const MockPCVDeposit = artifacts.readArtifactSync('MockEthUniswapPCVDeposit');

describe('RatioPCVController', function () {
  let userAddress: string
  let governorAddress: string
  let pcvControllerAddress: string
  beforeEach(async function () {
    ({
      userAddress,
      governorAddress,
      pcvControllerAddress,
    } = await getAddresses());
    this.core = await getCore();
    this.token = await MockERC20.new();

    this.pcvController = await RatioPCVController.new(this.core.address);

    this.pcvDeposit = await MockPCVDeposit.new(userAddress);
    await this.pcvDeposit.setBeneficiary(this.pcvDeposit.address);

    this.pcvAmount = toBN('10000000000');
    await web3.eth.sendTransaction({from: userAddress, to: this.pcvDeposit.address, value: this.pcvAmount});
  });
  
  describe('Withdraw', function() {
    describe('from pcvController', function() {
      it('100%', async function() {
        const userBalanceBefore = await balance.current(userAddress);
        await this.pcvController.withdrawRatio(this.pcvDeposit.address, userAddress, '10000', {from: pcvControllerAddress});
        const userBalanceAfter = await balance.current(userAddress);
        const reserveBalanceAfter = await balance.current(this.pcvDeposit.address);

        expect(reserveBalanceAfter).to.be.equal(toBN('0'));
        expect(userBalanceAfter.sub(userBalanceBefore)).to.be.equal(this.pcvAmount);
      });

      it('50%', async function() {
        const userBalanceBefore = await balance.current(userAddress);
        const reserveBalanceBefore = await balance.current(this.pcvDeposit.address);
        await this.pcvController.withdrawRatio(this.pcvDeposit.address, userAddress, '5000', {from: pcvControllerAddress});
        const userBalanceAfter = await balance.current(userAddress);
        const reserveBalanceAfter = await balance.current(this.pcvDeposit.address);

        expect(reserveBalanceBefore.sub(reserveBalanceAfter)).to.be.equal(this.pcvAmount.div(toBN('2')));
        expect(userBalanceAfter.sub(userBalanceBefore)).to.be.equal(this.pcvAmount.div(toBN('2')));
      });

      it('200% reverts', async function() {
        await expectRevert(this.pcvController.withdrawRatio(this.pcvDeposit.address, userAddress, '20000', {from: pcvControllerAddress}), 'RatioPCVController: basisPoints too high');
      });

      it('0 value reverts', async function() {                
        await this.pcvController.withdrawRatio(this.pcvDeposit.address, userAddress, '10000', {from: pcvControllerAddress}); // withdraw all

        await expectRevert(this.pcvController.withdrawRatio(this.pcvDeposit.address, userAddress, '10000', {from: pcvControllerAddress}), 'RatioPCVController: no value to withdraw');
      });
    });

    describe('not from pcvController', function() {
      it('reverts', async function() {
        await expectRevert(this.pcvController.withdrawRatio(this.pcvDeposit.address, userAddress, '10000', {from: userAddress}), 'CoreRef: Caller is not a PCV controller');
      });
    });

    describe('paused', function() {
      it('reverts', async function() {
        await this.pcvController.pause({from: governorAddress});
        await expectRevert(this.pcvController.withdrawRatio(this.pcvDeposit.address, userAddress, '10000', {from: pcvControllerAddress}), 'Pausable: paused');
      });
    });
  });

  describe('WithdrawERC20', function() {
    beforeEach(async function() {
      await this.token.mint(this.pcvDeposit.address, this.pcvAmount);
    });
    describe('from pcvController', function() {
      it('100%', async function() {
        const userBalanceBefore = await this.token.balanceOf(userAddress);
        await this.pcvController.withdrawRatioERC20(this.pcvDeposit.address, this.token.address, userAddress, '10000', {from: pcvControllerAddress});
        const userBalanceAfter = await this.token.balanceOf(userAddress);
        const reserveBalanceAfter = await this.token.balanceOf(this.pcvDeposit.address);

        expect(reserveBalanceAfter).to.be.equal(toBN('0'));
        expect(userBalanceAfter.sub(userBalanceBefore)).to.be.equal(this.pcvAmount);
      });

      it('50%', async function() {
        const userBalanceBefore = await this.token.balanceOf(userAddress);
        const reserveBalanceBefore = await this.token.balanceOf(this.pcvDeposit.address);
        await this.pcvController.withdrawRatioERC20(this.pcvDeposit.address, this.token.address, userAddress, '5000', {from: pcvControllerAddress});
        const userBalanceAfter = await this.token.balanceOf(userAddress);
        const reserveBalanceAfter = await this.token.balanceOf(this.pcvDeposit.address);

        expect(reserveBalanceBefore.sub(reserveBalanceAfter)).to.be.equal(this.pcvAmount.div(toBN('2')));
        expect(userBalanceAfter.sub(userBalanceBefore)).to.be.equal(this.pcvAmount.div(toBN('2')));
      });

      it('200% reverts', async function() {
        await expectRevert(this.pcvController.withdrawRatioERC20(this.pcvDeposit.address, this.token.address, userAddress, '20000', {from: pcvControllerAddress}), 'RatioPCVController: basisPoints too high');
      });

      it('0 value reverts', async function() {                
        await this.pcvController.withdrawRatioERC20(this.pcvDeposit.address, this.token.address, userAddress, '10000', {from: pcvControllerAddress}); // withdraw all

        await expectRevert(this.pcvController.withdrawRatioERC20(this.pcvDeposit.address, this.token.address, userAddress, '10000', {from: pcvControllerAddress}), 'RatioPCVController: no value to withdraw');
      });
    });

    describe('not from pcvController', function() {
      it('reverts', async function() {
        await expectRevert(this.pcvController.withdrawRatioERC20(this.pcvDeposit.address, this.token.address, userAddress, '10000', {from: userAddress}), 'CoreRef: Caller is not a PCV controller');
      });
    });

    describe('paused', function() {
      it('reverts', async function() {
        await this.pcvController.pause({from: governorAddress});
        await expectRevert(this.pcvController.withdrawRatioERC20(this.pcvDeposit.address, this.token.address, userAddress, '10000', {from: pcvControllerAddress}), 'Pausable: paused');
      });
    });
  });
});
