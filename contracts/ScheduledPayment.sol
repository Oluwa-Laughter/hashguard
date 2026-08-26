// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "./interfaces/IERC20.sol";
import {SafeERC20} from "./utils/SafeERC20.sol";
import {ReentrancyGuard} from "./utils/ReentrancyGuard.sol";

/// @title ScheduledPayment
/// @notice Non-custodial pre-funded time-locked scheduled payments.
contract ScheduledPayment is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum ScheduleStatus {
        ACTIVE,
        CANCELLED,
        COMPLETED
    }

    struct PaymentSchedule {
        address sender;
        address recipient;
        address token; // address(0) represents native HSK
        uint256 amountPerPeriod;
        uint256 interval; // seconds between execution windows
        uint256 totalPeriods;
        uint256 periodsPaid;
        uint256 nextPaymentTime;
        ScheduleStatus status;
    }

    uint256 public nextScheduleId;
    mapping(uint256 => PaymentSchedule) private _schedules;

    // Track schedule IDs created by a sender
    mapping(address => uint256[]) private _senderSchedules;

    event ScheduleCreated(
        uint256 indexed scheduleId,
        address indexed sender,
        address indexed recipient,
        address token,
        uint256 amountPerPeriod,
        uint256 totalPeriods,
        uint256 totalAmount,
        uint256 nextPaymentTime
    );

    event PaymentExecuted(
        uint256 indexed scheduleId,
        uint256 indexed periodNumber,
        address indexed recipient,
        uint256 amount
    );

    event ScheduleCancelled(
        uint256 indexed scheduleId,
        address indexed sender,
        uint256 refundedAmount
    );

    event ScheduleCompleted(uint256 indexed scheduleId);

    error InvalidRecipient();
    error InvalidAmount();
    error InvalidInterval();
    error InvalidPeriods();
    error ScheduleNotFound();
    error ScheduleNotActive();
    error NotSender();
    error PaymentNotDue();
    error AllPeriodsPaid();
    error NativeTransferFailed();
    error InsufficientFunding();

    function createSchedule(
        address recipient,
        address token,
        uint256 amountPerPeriod,
        uint256 interval,
        uint256 totalPeriods
    ) external payable nonReentrant returns (uint256 scheduleId) {
        if (recipient == address(0)) revert InvalidRecipient();
        if (amountPerPeriod == 0) revert InvalidAmount();
        if (interval == 0) revert InvalidInterval();
        if (totalPeriods == 0) revert InvalidPeriods();

        uint256 totalAmount = amountPerPeriod * totalPeriods;

        if (token == address(0)) {
            if (msg.value != totalAmount) revert InsufficientFunding();
        } else {
            if (msg.value > 0) revert InsufficientFunding();
            IERC20(token).safeTransferFrom(msg.sender, address(this), totalAmount);
        }

        scheduleId = nextScheduleId++;
        uint256 firstPaymentTime = block.timestamp + interval;

        _schedules[scheduleId] = PaymentSchedule({
            sender: msg.sender,
            recipient: recipient,
            token: token,
            amountPerPeriod: amountPerPeriod,
            interval: interval,
            totalPeriods: totalPeriods,
            periodsPaid: 0,
            nextPaymentTime: firstPaymentTime,
            status: ScheduleStatus.ACTIVE
        });

        _senderSchedules[msg.sender].push(scheduleId);

        emit ScheduleCreated(
            scheduleId,
            msg.sender,
            recipient,
            token,
            amountPerPeriod,
            totalPeriods,
            totalAmount,
            firstPaymentTime
        );
    }

    function executePayment(uint256 scheduleId) external nonReentrant {
        if (scheduleId >= nextScheduleId) revert ScheduleNotFound();
        PaymentSchedule storage schedule = _schedules[scheduleId];

        if (schedule.status != ScheduleStatus.ACTIVE) revert ScheduleNotActive();
        if (block.timestamp < schedule.nextPaymentTime) revert PaymentNotDue();
        if (schedule.periodsPaid >= schedule.totalPeriods) revert AllPeriodsPaid();

        uint256 currentPeriod = schedule.periodsPaid + 1;
        schedule.periodsPaid = currentPeriod;
        
        // Advance schedule time relative to original target schedule to prevent drift
        schedule.nextPaymentTime += schedule.interval;

        if (currentPeriod == schedule.totalPeriods) {
            schedule.status = ScheduleStatus.COMPLETED;
            emit ScheduleCompleted(scheduleId);
        }

        _payout(schedule.token, schedule.recipient, schedule.amountPerPeriod);
        emit PaymentExecuted(scheduleId, currentPeriod, schedule.recipient, schedule.amountPerPeriod);
    }

    function cancelSchedule(uint256 scheduleId) external nonReentrant {
        if (scheduleId >= nextScheduleId) revert ScheduleNotFound();
        PaymentSchedule storage schedule = _schedules[scheduleId];

        if (msg.sender != schedule.sender) revert NotSender();
        if (schedule.status != ScheduleStatus.ACTIVE) revert ScheduleNotActive();

        uint256 remainingPeriods = schedule.totalPeriods - schedule.periodsPaid;
        uint256 refundAmount = remainingPeriods * schedule.amountPerPeriod;

        schedule.status = ScheduleStatus.CANCELLED;

        if (refundAmount > 0) {
            _payout(schedule.token, schedule.sender, refundAmount);
        }

        emit ScheduleCancelled(scheduleId, msg.sender, refundAmount);
    }

    function getSchedule(uint256 scheduleId) external view returns (PaymentSchedule memory) {
        if (scheduleId >= nextScheduleId) revert ScheduleNotFound();
        return _schedules[scheduleId];
    }

    function getRemainingAmount(uint256 scheduleId) external view returns (uint256) {
        if (scheduleId >= nextScheduleId) revert ScheduleNotFound();
        PaymentSchedule memory schedule = _schedules[scheduleId];
        if (schedule.status != ScheduleStatus.ACTIVE) return 0;
        return (schedule.totalPeriods - schedule.periodsPaid) * schedule.amountPerPeriod;
    }

    function isPaymentDue(uint256 scheduleId) external view returns (bool) {
        if (scheduleId >= nextScheduleId) revert ScheduleNotFound();
        PaymentSchedule memory schedule = _schedules[scheduleId];
        return (schedule.status == ScheduleStatus.ACTIVE &&
                block.timestamp >= schedule.nextPaymentTime &&
                schedule.periodsPaid < schedule.totalPeriods);
    }

    function getScheduleCount() external view returns (uint256) {
        return nextScheduleId;
    }

    function getSchedulesBySender(address sender) external view returns (uint256[] memory) {
        return _senderSchedules[sender];
    }

    function _payout(address token, address recipient, uint256 amount) private {
        if (token == address(0)) {
            (bool sent,) = recipient.call{value: amount}("");
            if (!sent) revert NativeTransferFailed();
        } else {
            IERC20(token).safeTransfer(recipient, amount);
        }
    }
}
