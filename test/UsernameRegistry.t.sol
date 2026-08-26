// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {UsernameRegistry} from "../contracts/UsernameRegistry.sol";

interface Vm { function prank(address) external; function expectRevert(bytes4) external; }

contract UsernameRegistryTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    UsernameRegistry private registry;
    address private alice = address(0xA11CE);
    address private bob = address(0xB0B);

    function setUp() public { registry = new UsernameRegistry(); }

    function testRegisterAndResolveNormalisedUsername() public {
        vm.prank(alice); registry.registerUsername("@Alice_01");
        assert(registry.resolveUsername("alice_01") == alice);
        assert(keccak256(bytes(registry.getUsername(alice))) == keccak256(bytes("alice_01")));
    }

    function testDuplicateUsernameFails() public {
        vm.prank(alice); registry.registerUsername("alice");
        vm.expectRevert(UsernameRegistry.UsernameUnavailable.selector);
        vm.prank(bob); registry.registerUsername("ALICE");
    }

    function testInvalidUsernameFails() public {
        vm.expectRevert(UsernameRegistry.InvalidUsername.selector);
        vm.prank(alice); registry.registerUsername("ab");
        vm.expectRevert(UsernameRegistry.InvalidUsername.selector);
        vm.prank(alice); registry.registerUsername("alice!wrong");
    }

    function testUsernameOwnershipCanMove() public {
        vm.prank(alice); registry.registerUsername("alice");
        vm.prank(alice); registry.registerUsername("alice_new");
        assert(registry.resolveUsername("alice") == address(0));
        assert(registry.resolveUsername("alice_new") == alice);
    }
}

