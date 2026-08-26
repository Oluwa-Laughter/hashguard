// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "./interfaces/IERC20.sol";
import {SafeERC20} from "./utils/SafeERC20.sol";
import {ReentrancyGuard} from "./utils/ReentrancyGuard.sol";

/// @title HashGuard
/// @notice Non-custodial protected-payment escrow for native HSK and ERC-20s.
contract HashGuard is ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant MAX_BATCH_RECIPIENTS = 100;

    enum Status { PENDING, CLAIMED, REFUNDED }

    struct Escrow {
        address sender;
        address recipient;
        address token; // address(0) represents native HSK
        uint256 amount;
        uint256 expiry;
        Status status;
    }

    uint256 public nextEscrowId;
    mapping(uint256 => Escrow) private _escrows;

    event EscrowCreated(
        uint256 indexed escrowId,
        address indexed sender,
        address indexed recipient,
        address token,
        uint256 amount,
        uint256 expiry
    );
    event EscrowClaimed(uint256 indexed escrowId, address indexed recipient);
    event EscrowRefunded(uint256 indexed escrowId, address indexed sender);
    event BatchPayment(address indexed sender, address indexed token, uint256 recipientCount, uint256 totalAmount);

    error InvalidRecipient();
    error InvalidAmount();
    error InvalidExpiry();
    error EscrowNotFound();
    error EscrowNotPending();
    error NotRecipient();
    error NotSender();
    error NotExpired();
    error InvalidBatch();
    error NativeTransferFailed();

    function createNativeEscrow(address recipient, uint256 expiry) external payable nonReentrant returns (uint256 escrowId) {
        _validateEscrow(recipient, msg.value, expiry);
        escrowId = _createEscrow(recipient, address(0), msg.value, expiry);
    }

    function createTokenEscrow(address token, address recipient, uint256 amount, uint256 expiry)
        external nonReentrant returns (uint256 escrowId)
    {
        if (token == address(0)) revert InvalidRecipient();
        _validateEscrow(recipient, amount, expiry);
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        escrowId = _createEscrow(recipient, token, amount, expiry);
    }

    function claim(uint256 escrowId) external nonReentrant {
        Escrow storage escrow = _pendingEscrow(escrowId);
        if (msg.sender != escrow.recipient) revert NotRecipient();
        escrow.status = Status.CLAIMED;
        _payout(escrow.token, escrow.recipient, escrow.amount);
        emit EscrowClaimed(escrowId, msg.sender);
    }

    function refund(uint256 escrowId) external nonReentrant {
        Escrow storage escrow = _pendingEscrow(escrowId);
        if (msg.sender != escrow.sender) revert NotSender();
        if (block.timestamp < escrow.expiry) revert NotExpired();
        escrow.status = Status.REFUNDED;
        _payout(escrow.token, escrow.sender, escrow.amount);
        emit EscrowRefunded(escrowId, msg.sender);
    }

    function batchNativePayment(address[] calldata recipients, uint256[] calldata amounts) external payable nonReentrant {
        uint256 total = _validateBatch(recipients, amounts);
        if (msg.value != total) revert InvalidAmount();
        for (uint256 i; i < recipients.length; ++i) {
            (bool sent,) = recipients[i].call{value: amounts[i]}("");
            if (!sent) revert NativeTransferFailed();
        }
        emit BatchPayment(msg.sender, address(0), recipients.length, total);
    }

    function batchTokenPayment(address token, address[] calldata recipients, uint256[] calldata amounts) external nonReentrant {
        if (token == address(0)) revert InvalidRecipient();
        uint256 total = _validateBatch(recipients, amounts);
        IERC20(token).safeTransferFrom(msg.sender, address(this), total);
        for (uint256 i; i < recipients.length; ++i) IERC20(token).safeTransfer(recipients[i], amounts[i]);
        emit BatchPayment(msg.sender, token, recipients.length, total);
    }

    function getEscrow(uint256 escrowId) external view returns (Escrow memory) {
        if (escrowId >= nextEscrowId) revert EscrowNotFound();
        return _escrows[escrowId];
    }

    function _createEscrow(address recipient, address token, uint256 amount, uint256 expiry) private returns (uint256 escrowId) {
        escrowId = nextEscrowId++;
        _escrows[escrowId] = Escrow(msg.sender, recipient, token, amount, expiry, Status.PENDING);
        emit EscrowCreated(escrowId, msg.sender, recipient, token, amount, expiry);
    }

    function _pendingEscrow(uint256 escrowId) private view returns (Escrow storage escrow) {
        if (escrowId >= nextEscrowId) revert EscrowNotFound();
        escrow = _escrows[escrowId];
        if (escrow.status != Status.PENDING) revert EscrowNotPending();
    }

    function _validateEscrow(address recipient, uint256 amount, uint256 expiry) private view {
        if (recipient == address(0)) revert InvalidRecipient();
        if (amount == 0) revert InvalidAmount();
        if (expiry <= block.timestamp) revert InvalidExpiry();
    }

    function _validateBatch(address[] calldata recipients, uint256[] calldata amounts) private pure returns (uint256 total) {
        if (recipients.length == 0 || recipients.length != amounts.length || recipients.length > MAX_BATCH_RECIPIENTS) revert InvalidBatch();
        for (uint256 i; i < recipients.length; ++i) {
            if (recipients[i] == address(0)) revert InvalidRecipient();
            if (amounts[i] == 0) revert InvalidAmount();
            total += amounts[i];
        }
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

