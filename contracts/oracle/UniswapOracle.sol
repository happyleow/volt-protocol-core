
pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

// Referencing Uniswap Example Simple Oracle
// https://github.com/Uniswap/uniswap-v2-periphery/blob/master/contracts/examples/ExampleOracleSimple.sol

import "./IOracle.sol";
import "../external/Decimal.sol";
import "../refs/CoreRef.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-periphery/contracts/libraries/UniswapV2OracleLibrary.sol";

contract UniswapOracle is IOracle, CoreRef {
	using Decimal for Decimal.D256;

	IUniswapV2Pair public pair;
	Decimal.D256 private twap = Decimal.zero();
	uint256 public priorCumulative; 
	uint32 public priorTimestamp;
	uint32 public duration;
	bool public killSwitch;
	bool private isPrice0;

	event KillSwitchUpdate(bool _killSwitch);
	event DurationUpdate(uint32 _duration);
	event Update(uint256 _twap);

	constructor(address _core, address _pair, uint32 _duration, bool _isPrice0) public
		CoreRef(_core)
	{
		pair = IUniswapV2Pair(_pair);
		duration = _duration;
		// Relative to USD/ETH price
		isPrice0 = _isPrice0;
		init();
	}

	function update() external override returns (bool) {
		(uint price0Cumulative, uint price1Cumulative, uint32 currentTimestamp) =
            UniswapV2OracleLibrary.currentCumulativePrices(address(pair));
		uint32 deltaTimestamp = currentTimestamp - priorTimestamp;
		if(currentTimestamp <= priorTimestamp || deltaTimestamp < duration) {
			return false;
		}

		uint currentCumulative = getCumulative(price0Cumulative, price1Cumulative);
		uint deltaCumulative = (currentCumulative - priorCumulative) / 1e12;

		Decimal.D256 memory _twap = Decimal.ratio(2**112, deltaCumulative / deltaTimestamp);
		twap = _twap;

		priorTimestamp = currentTimestamp;
		priorCumulative = currentCumulative;
		emit Update(_twap.asUint256());
		return true;
	}

    function read() external view override returns (Decimal.D256 memory, bool) {
    	bool valid = !(killSwitch || twap.isZero());
    	return (twap, valid);
    }
 
	function setKillSwitch(bool _killSwitch) public onlyGovernor {
		killSwitch = _killSwitch;
		emit KillSwitchUpdate(_killSwitch);
	}

	function setDuration(uint32 _duration) public onlyGovernor {
		duration = _duration;
		emit DurationUpdate(_duration);
	}

	function init() internal {
        uint price0Cumulative = pair.price0CumulativeLast();
        uint price1Cumulative = pair.price1CumulativeLast();
        (,, uint32 currentTimestamp) = pair.getReserves();
        priorTimestamp = currentTimestamp;
		priorCumulative = getCumulative(price0Cumulative, price1Cumulative);
	}

    function getCumulative(uint price0Cumulative, uint price1Cumulative) internal view returns (uint256) {
		return isPrice0 ? price0Cumulative : price1Cumulative;
	}
}