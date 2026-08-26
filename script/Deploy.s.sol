// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {HashGuard} from "../contracts/HashGuard.sol";
import {UsernameRegistry} from "../contracts/UsernameRegistry.sol";
import {ScheduledPayment} from "../contracts/ScheduledPayment.sol";

interface Vm { function startBroadcast() external; function stopBroadcast() external; }

/// @notice Deploy with: forge script script/Deploy.s.sol:Deploy --rpc-url "$HSK_RPC_URL" --broadcast
contract Deploy {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    function run() external returns (HashGuard hashGuard, UsernameRegistry usernameRegistry, ScheduledPayment scheduledPayment) {
        vm.startBroadcast();
        hashGuard = new HashGuard();
        usernameRegistry = new UsernameRegistry();
        scheduledPayment = new ScheduledPayment();
        vm.stopBroadcast();
    }
}
