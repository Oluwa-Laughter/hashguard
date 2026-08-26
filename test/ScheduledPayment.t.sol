// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ScheduledPayment} from "../contracts/ScheduledPayment.sol";
import {MockERC20} from "../contracts/mocks/MockERC20.sol";

interface Vm {
    function prank(address) external;
    function deal(address who, uint256 newBalance) external;
    function warp(uint256) external;
    function expectRevert(bytes4) external;
}

contract ScheduledPaymentTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    ScheduledPayment private scheduler;
    MockERC20 private token;
    
    address private alice = address(0xA11CE);
    address private bob = address(0xB0B);
    address private charlie = address(0xCA11);

    function setUp() public {
        scheduler = new ScheduledPayment();
        token = new MockERC20();
        vm.deal(alice, 100 ether);
        token.mint(alice, 1_000_000_000);
    }

    // 1. Schedule can be created (Native)
    function testCreateScheduleNative() public {
        vm.prank(alice);
        uint256 id = scheduler.createSchedule{value: 10 ether}(
            bob,
            address(0),
            1 ether,
            1 days,
            10
        );

        ScheduledPayment.PaymentSchedule memory schedule = scheduler.getSchedule(id);
        assert(schedule.sender == alice);
        assert(schedule.recipient == bob);
        assert(schedule.token == address(0));
        assert(schedule.amountPerPeriod == 1 ether);
        assert(schedule.interval == 1 days);
        assert(schedule.totalPeriods == 10);
        assert(schedule.periodsPaid == 0);
        assert(schedule.status == ScheduledPayment.ScheduleStatus.ACTIVE);
    }

    // 2. Schedule can be created (ERC20)
    function testCreateScheduleToken() public {
        vm.prank(alice);
        token.approve(address(scheduler), 600);

        vm.prank(alice);
        uint256 id = scheduler.createSchedule(
            bob,
            address(token),
            100,
            30 days,
            6
        );

        ScheduledPayment.PaymentSchedule memory schedule = scheduler.getSchedule(id);
        assert(schedule.sender == alice);
        assert(schedule.recipient == bob);
        assert(schedule.token == address(token));
        assert(schedule.amountPerPeriod == 100);
        assert(schedule.totalPeriods == 6);
        assert(token.balanceOf(address(scheduler)) == 600);
    }

    // 6-10. Validations (Rejects zero recipient, zero amount, zero interval, zero periods)
    function testValidationRejections() public {
        vm.prank(alice);
        vm.expectRevert(ScheduledPayment.InvalidRecipient.selector);
        scheduler.createSchedule{value: 10 ether}(address(0), address(0), 1 ether, 1 days, 10);

        vm.prank(alice);
        vm.expectRevert(ScheduledPayment.InvalidAmount.selector);
        scheduler.createSchedule{value: 10 ether}(bob, address(0), 0, 1 days, 10);

        vm.prank(alice);
        vm.expectRevert(ScheduledPayment.InvalidInterval.selector);
        scheduler.createSchedule{value: 10 ether}(bob, address(0), 1 ether, 0, 10);

        vm.prank(alice);
        vm.expectRevert(ScheduledPayment.InvalidPeriods.selector);
        scheduler.createSchedule{value: 10 ether}(bob, address(0), 1 ether, 1 days, 0);

        vm.prank(alice);
        vm.expectRevert(ScheduledPayment.InsufficientFunding.selector);
        scheduler.createSchedule{value: 5 ether}(bob, address(0), 1 ether, 1 days, 10);
    }

    // 11. Cannot execute before due time
    function testCannotExecuteBeforeDue() public {
        vm.prank(alice);
        uint256 id = scheduler.createSchedule{value: 6 ether}(bob, address(0), 1 ether, 30 days, 6);

        vm.expectRevert(ScheduledPayment.PaymentNotDue.selector);
        scheduler.executePayment(id);
    }

    // 12-15. Can execute after due time, recipient receives funds, period increments, next time advances
    function testExecutePaymentSuccess() public {
        vm.prank(alice);
        uint256 id = scheduler.createSchedule{value: 6 ether}(bob, address(0), 1 ether, 30 days, 6);

        uint256 initialBobBalance = bob.balance;

        // Warp to next payment time
        vm.warp(block.timestamp + 30 days);
        scheduler.executePayment(id);

        assert(bob.balance == initialBobBalance + 1 ether);
        ScheduledPayment.PaymentSchedule memory schedule = scheduler.getSchedule(id);
        assert(schedule.periodsPaid == 1);
        assert(schedule.nextPaymentTime == block.timestamp + 30 days); // Next is due at T + 60 days
    }

    // 16. Same period cannot be executed twice
    function testCannotDoubleExecutePeriod() public {
        vm.prank(alice);
        uint256 id = scheduler.createSchedule{value: 6 ether}(bob, address(0), 1 ether, 30 days, 6);

        vm.warp(block.timestamp + 30 days);
        scheduler.executePayment(id);

        // Try executing again immediately
        vm.expectRevert(ScheduledPayment.PaymentNotDue.selector);
        scheduler.executePayment(id);
    }

    // 19. Non-sender cannot cancel
    function testNonSenderCannotCancel() public {
        vm.prank(alice);
        uint256 id = scheduler.createSchedule{value: 6 ether}(bob, address(0), 1 ether, 30 days, 6);

        vm.expectRevert(ScheduledPayment.NotSender.selector);
        vm.prank(charlie);
        scheduler.cancelSchedule(id);
    }

    // 20-23. Sender can cancel active schedule, unspent balance refunded, future execution stopped
    function testCancelScheduleAndRefund() public {
        vm.prank(alice);
        uint256 id = scheduler.createSchedule{value: 6 ether}(bob, address(0), 1 ether, 30 days, 6);

        // Pay 1 period
        vm.warp(block.timestamp + 30 days);
        scheduler.executePayment(id);

        uint256 beforeAliceBalance = alice.balance;

        // Cancel schedule (5 periods remain => 5 ether refund)
        vm.prank(alice);
        scheduler.cancelSchedule(id);

        assert(alice.balance == beforeAliceBalance + 5 ether);
        ScheduledPayment.PaymentSchedule memory schedule = scheduler.getSchedule(id);
        assert(schedule.status == ScheduledPayment.ScheduleStatus.CANCELLED);

        // Ensure execution reverts
        vm.warp(block.timestamp + 30 days);
        vm.expectRevert(ScheduledPayment.ScheduleNotActive.selector);
        scheduler.executePayment(id);
    }

    // 24-26. Isolation, accounting, A cannot refund B's funds
    function testSchedulesAreIsolated() public {
        vm.prank(alice);
        uint256 idA = scheduler.createSchedule{value: 10 ether}(bob, address(0), 1 ether, 30 days, 10);
        
        vm.deal(charlie, 50 ether);
        vm.prank(charlie);
        uint256 idB = scheduler.createSchedule{value: 5 ether}(bob, address(0), 1 ether, 30 days, 5);

        // Cancel idB
        uint256 beforeCharlieBalance = charlie.balance;
        vm.prank(charlie);
        scheduler.cancelSchedule(idB);
        
        assert(charlie.balance == beforeCharlieBalance + 5 ether);
        
        // Ensure idA is still fully funded and active
        ScheduledPayment.PaymentSchedule memory scheduleA = scheduler.getSchedule(idA);
        assert(scheduleA.status == ScheduledPayment.ScheduleStatus.ACTIVE);
        assert(scheduler.getRemainingAmount(idA) == 10 ether);
    }

    // 28. delayed execution does not shift schedule path
    function testWarpExecutionSchedulePreserved() public {
        uint256 startTime = block.timestamp;
        vm.prank(alice);
        uint256 id = scheduler.createSchedule{value: 6 ether}(bob, address(0), 1 ether, 30 days, 6);

        // Warp 35 days (5 days late for first payment)
        vm.warp(startTime + 35 days);
        scheduler.executePayment(id);

        ScheduledPayment.PaymentSchedule memory schedule = scheduler.getSchedule(id);
        // nextPaymentTime should still be startTime + 60 days
        assert(schedule.nextPaymentTime == startTime + 60 days);
    }

    // 29-30. Completed schedule status and zero remaining funds
    function testScheduleCompletion() public {
        vm.prank(alice);
        uint256 id = scheduler.createSchedule{value: 3 ether}(bob, address(0), 1 ether, 1 days, 3);

        vm.warp(block.timestamp + 1 days);
        scheduler.executePayment(id);
        vm.warp(block.timestamp + 1 days);
        scheduler.executePayment(id);
        vm.warp(block.timestamp + 1 days);
        scheduler.executePayment(id);

        ScheduledPayment.PaymentSchedule memory schedule = scheduler.getSchedule(id);
        assert(schedule.status == ScheduledPayment.ScheduleStatus.COMPLETED);
        assert(scheduler.getRemainingAmount(id) == 0);
    }
}
