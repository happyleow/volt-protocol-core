// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.0;

import {Vm} from "./../unit/utils/Vm.sol";
import {Core} from "../../core/Core.sol";
import {ICore} from "../../core/ICore.sol";
import {DSTest} from "../unit/utils/DSTest.sol";
import {StdLib} from "../unit/utils/StdLib.sol";
import {IERC20, MockERC20} from "../../mock/MockERC20.sol";
import {IVolt, Volt} from "../../volt/Volt.sol";
import {OraclePassThrough} from "../../oracle/OraclePassThrough.sol";
import {ScalingPriceOracle} from "../../oracle/ScalingPriceOracle.sol";
import {MockScalingPriceOracle} from "../../mock/MockScalingPriceOracle.sol";
import {WithdrawOnlyPCVDeposit} from "./../../pcv/WithdrawOnlyPCVDeposit.sol";
import {ERC20CompoundPCVDeposit} from "../../pcv/compound/ERC20CompoundPCVDeposit.sol";
import {getCore, getAddresses, FeiTestAddresses} from "./../unit/utils/Fixtures.sol";
import {NonCustodialPSM, GlobalRateLimitedMinter} from "./../../peg/NonCustodialPSM.sol";

// Create WithdrawOnlyPCVDeposit and ScalingPriceOracle
// Wire them both into current system

contract IntegrationTestWithdrawOnlyPCVDeposit is DSTest, StdLib {
    GlobalRateLimitedMinter private rateLimitedMinter;
    NonCustodialPSM private psm =
        NonCustodialPSM(0x18f251FC3CE0Cb690F13f62213aba343657d0E72);
    Core private immutable core =
        Core(0xEC7AD284f7Ad256b64c6E69b84Eb0F48f42e8196);
    ICore private feiCore = ICore(0x8d5ED43dCa8C2F7dFB20CF7b53CC7E593635d7b9);
    IVolt private volt;
    IVolt private fei = IVolt(0x956F47F50A910163D8BF957Cf5846D573E7f87CA);

    address private constant multisig =
        0xcBB83206698E8788F85EFbEeeCAd17e53366EBDf;

    /// ------------ Minting and RateLimited System Params ------------

    uint256 public constant mintAmount = 10_000_000e18;
    uint256 public constant bufferCap = 10_000_000e18;
    uint256 public constant individualMaxBufferCap = 5_000_000e18;
    uint256 public constant rps = 10_000e18;

    /// ------------ Oracle System Params ------------

    /// @notice prices during test will increase 1% monthly
    int256 public constant monthlyChangeRateBasisPoints = 100;
    uint256 public constant maxDeviationThresholdBasisPoints = 1_000;

    /// @notice chainlink job id on mainnet
    bytes32 public immutable jobId =
        0x3666376662346162636564623438356162323765623762623339636166383237;
    /// @notice chainlink oracle address on mainnet
    address public immutable oracleAddress =
        0x049Bd8C3adC3fE7d3Fc2a44541d955A537c2A484;

    address public immutable feiAddress =
        0x956F47F50A910163D8BF957Cf5846D573E7f87CA;

    /// @notice live FEI PCV Deposit
    ERC20CompoundPCVDeposit public immutable rariFEIPCVDeposit =
        ERC20CompoundPCVDeposit(0x81DCB06eA4db474D1506Ca6275Ff7D870bA3A1Be);

    WithdrawOnlyPCVDeposit public feiDeposit;

    /// @notice fei DAO timelock address
    address public immutable feiDAOTimelock =
        0xd51dbA7a94e1adEa403553A8235C302cEbF41a3c;

    /// @notice Oracle Pass Through contract
    OraclePassThrough public oracle;

    Vm public constant vm = Vm(HEVM_ADDRESS);
    FeiTestAddresses public addresses = getAddresses();

    function setUp() public {
        volt = core.volt();
        MockScalingPriceOracle mockScalingPriceOracle = new MockScalingPriceOracle(
                oracleAddress,
                jobId,
                10e18,
                101,
                100
            );

        feiDeposit = new WithdrawOnlyPCVDeposit(
            address(core),
            IERC20(address(fei))
        );

        oracle = new OraclePassThrough(
            ScalingPriceOracle(address(mockScalingPriceOracle))
        );

        vm.startPrank(feiDAOTimelock);
        feiCore.grantPCVController(address(psm));
        fei.mint(address(this), mintAmount);
        vm.stopPrank();

        vm.prank(multisig); /// give governor address governor in live system
        core.grantGovernor(addresses.governorAddress);

        vm.startPrank(addresses.governorAddress);
        psm.setPCVDeposit(feiDeposit);

        /// grant the PSM the PCV Controller role
        core.grantMinter(addresses.governorAddress);
        core.grantMinter(address(rateLimitedMinter));
        core.grantPCVController(address(psm));
        core.grantPCVController(addresses.governorAddress);
        rateLimitedMinter.addAddress(
            address(this),
            uint112(rps),
            uint112(bufferCap)
        );
        rateLimitedMinter.addAddress(
            address(psm),
            uint112(rps),
            uint112(bufferCap)
        );

        /// mint VOLT to the user
        volt.mint(address(this), mintAmount);

        vm.stopPrank();
    }

    /// @notice PSM is set up correctly and view functions are working
    function testPSMIsPCVController() public {
        assertTrue(core.isPCVController(address(psm)));
    }

    /// @notice PSM is set up correctly and view functions are working
    function testPCVDepositPSM() public {
        assertEq(address(psm.pcvDeposit()), address(feiDeposit));
    }

    /// @notice PCV Deposit is set up correctly and underlying token is Fei
    function testUnderlyingTokenMatch() public {
        assertEq(address(psm.underlyingToken()), address(fei));
    }

    /// this test uses FEI as the underlying asset and hooks into a FEI PCV Deposit
    /// this deposit does not accept the deposit function getting called and reverts
    function testMintFails() public {
        rariFEIPCVDeposit.deposit(); // get env cleaned up and ready for testing

        fei.approve(address(psm), mintAmount);
        vm.expectRevert("WithdrawOnlyPCVDeposit: deposit not allowed");
        psm.mint(address(this), mintAmount, mintAmount);
    }

    /// this test uses FEI as the underlying asset and hooks into a FEI PCV Deposit
    function testRedeemAfterPriceIncreaseWithdrawOnlyPCVDeposit() public {
        uint256 amountVoltIn = 100_000;
        uint256 amountFeiOut = 101_000;

        rariFEIPCVDeposit.deposit(); // get env cleaned up and ready for testing
        vm.prank(feiDAOTimelock);
        fei.mint(address(feiDeposit), amountFeiOut);

        vm.warp(28 days + block.timestamp);

        uint256 startingUserVoltBalance = volt.balanceOf(address(this));
        uint256 startingPCVDepositFeiBalance = rariFEIPCVDeposit.balance();

        volt.approve(address(psm), amountVoltIn);
        psm.redeem(address(this), amountVoltIn, amountFeiOut);

        uint256 endingUserVoltBalance = volt.balanceOf(address(this));
        uint256 endingPCVDepositFeiBalance = rariFEIPCVDeposit.balance();

        assertEq(startingUserVoltBalance - endingUserVoltBalance, amountVoltIn);
        assertEq(
            startingPCVDepositFeiBalance - endingPCVDepositFeiBalance,
            amountFeiOut
        );
    }
}
