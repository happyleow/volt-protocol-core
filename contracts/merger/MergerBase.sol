//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../dao/Timelock.sol";

/// @title Base contract for merger logic
/// @author elee
contract MergerBase {   
    event Accept(address indexed dao);
    event Enabled(); 

    uint256 public constant scalar = 1e9;

    address public constant rgtTimelock =
        0x8ace03Fc45139fDDba944c6A4082b604041d19FC; // rgt timelock
    address public constant tribeTimelock =
        0xd51dbA7a94e1adEa403553A8235C302cEbF41a3c; // tribe timelock

    bool public rgtAccepted; // rgt timelock accepted
    bool public tribeAccepted; // tribe timelock accepted

    IERC20 public constant rgt =
        IERC20(0xD291E7a03283640FDc51b121aC401383A46cC623); // rgt
    IERC20 public constant tribe =
        IERC20(0xc7283b66Eb1EB5FB86327f08e1B5816b0720212B); // tribe

    address public immutable tribeRariDAO;
    
    /// @notice tells whether or not both parties have accepted the deal
    bool public isEnabled;

    constructor(address _tribeRariDAO) {
        tribeRariDAO = _tribeRariDAO;
    }

    /// @notice function for the rari timelock to accept the deal
    function rgtAccept() public {
        require(
            msg.sender == rgtTimelock,
            "Only the timelock for party 0 may call this function"
        );
        rgtAccepted = true;
        emit Accept(rgtTimelock);
    }

    /// @notice function for the tribe timelock to accept the deal
    function tribeAccept() public {
        require(
            msg.sender == tribeTimelock,
            "Only the timelock for party 1 may call this function"
        );
        tribeAccepted = true;
        emit Accept(tribeTimelock);
    }

    /// @notice make sure Tribe rari timelock is active
    function setTribeRariDAOActive() public {
        require(!isEnabled, "already set");
        require(Timelock(payable(rgtTimelock)).admin() == tribeRariDAO, "admin not accepted");    
        require(tribeAccepted, "tribe accept");
        require(rgtAccepted, "rari accept");
        isEnabled = true;
        emit Enabled();
    }
}   