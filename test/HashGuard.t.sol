// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {HashGuard} from "../contracts/HashGuard.sol";
import {MockERC20} from "../contracts/mocks/MockERC20.sol";

interface Vm {
    function prank(address) external;
    function deal(address who, uint256 newBalance) external;
    function warp(uint256) external;
    function expectRevert(bytes4) external;
}

contract HashGuardTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    HashGuard private guard;
    MockERC20 private token;
    address private alice = address(0xA11CE);
    address private bob = address(0xB0B);
    address private charlie = address(0xCA11);

    function setUp() public {
        guard = new HashGuard();
        token = new MockERC20();
        vm.deal(alice, 100 ether);
        token.mint(alice, 1_000_000_000);
    }

    function testCreateAndClaimNativeEscrow() public {
        vm.prank(alice);
        uint256 id = guard.createNativeEscrow{value: 1 ether}(bob, block.timestamp + 7 days);
        HashGuard.Escrow memory escrow = guard.getEscrow(id);
        assert(escrow.sender == alice && escrow.recipient == bob && escrow.amount == 1 ether);
        uint256 beforeBalance = bob.balance;
        vm.prank(bob); guard.claim(id);
        assert(bob.balance == beforeBalance + 1 ether);
        assert(uint256(guard.getEscrow(id).status) == uint256(HashGuard.Status.CLAIMED));
    }

    function testTokenEscrowAndClaim() public {
        vm.prank(alice); token.approve(address(guard), 50_000_000);
        vm.prank(alice); uint256 id = guard.createTokenEscrow(address(token), bob, 50_000_000, block.timestamp + 1 days);
        vm.prank(bob); guard.claim(id);
        assert(token.balanceOf(bob) == 50_000_000);
    }

    function testUnauthorizedClaimFails() public {
        vm.prank(alice); guard.createNativeEscrow{value: 1 ether}(bob, block.timestamp + 1 days);
        vm.expectRevert(HashGuard.NotRecipient.selector);
        vm.prank(charlie); guard.claim(0);
    }

    function testRefundOnlyAfterExpiry() public {
        vm.prank(alice); guard.createNativeEscrow{value: 1 ether}(bob, block.timestamp + 1 days);
        vm.expectRevert(HashGuard.NotExpired.selector);
        vm.prank(alice); guard.refund(0);
        uint256 beforeBalance = alice.balance;
        vm.warp(block.timestamp + 1 days);
        vm.prank(alice); guard.refund(0);
        assert(alice.balance == beforeBalance + 1 ether);
        assert(uint256(guard.getEscrow(0).status) == uint256(HashGuard.Status.REFUNDED));
    }

    function testDoubleClaimAndClaimAfterRefundFail() public {
        vm.prank(alice); guard.createNativeEscrow{value: 1 ether}(bob, block.timestamp + 1 days);
        vm.prank(bob); guard.claim(0);
        vm.expectRevert(HashGuard.EscrowNotPending.selector);
        vm.prank(bob); guard.claim(0);
        vm.prank(alice); guard.createNativeEscrow{value: 1 ether}(bob, block.timestamp + 1 days);
        vm.warp(block.timestamp + 1 days);
        vm.prank(alice); guard.refund(1);
        vm.expectRevert(HashGuard.EscrowNotPending.selector);
        vm.prank(bob); guard.claim(1);
    }

    function testInvalidEscrowInputsFail() public {
        vm.prank(alice); vm.expectRevert(HashGuard.InvalidRecipient.selector);
        guard.createNativeEscrow{value: 1 ether}(address(0), block.timestamp + 1);
        vm.prank(alice); vm.expectRevert(HashGuard.InvalidAmount.selector);
        guard.createNativeEscrow{value: 0}(bob, block.timestamp + 1);
        vm.prank(alice); vm.expectRevert(HashGuard.InvalidExpiry.selector);
        guard.createNativeEscrow{value: 1 ether}(bob, block.timestamp);
    }

    function testNativeBatchPayment() public {
        address[] memory recipients = new address[](2); recipients[0] = bob; recipients[1] = charlie;
        uint256[] memory amounts = new uint256[](2); amounts[0] = 1 ether; amounts[1] = 2 ether;
        vm.prank(alice); guard.batchNativePayment{value: 3 ether}(recipients, amounts);
        assert(bob.balance == 1 ether && charlie.balance == 2 ether);
    }

    function testTokenBatchPaymentAndInvalidBatch() public {
        address[] memory recipients = new address[](2); recipients[0] = bob; recipients[1] = charlie;
        uint256[] memory amounts = new uint256[](2); amounts[0] = 4_000_000; amounts[1] = 6_000_000;
        vm.prank(alice); token.approve(address(guard), 10_000_000);
        vm.prank(alice); guard.batchTokenPayment(address(token), recipients, amounts);
        assert(token.balanceOf(bob) == 4_000_000 && token.balanceOf(charlie) == 6_000_000);
        uint256[] memory shortAmounts = new uint256[](1);
        vm.expectRevert(HashGuard.InvalidBatch.selector);
        vm.prank(alice); guard.batchNativePayment{value: 0}(recipients, shortAmounts);
    }
}

