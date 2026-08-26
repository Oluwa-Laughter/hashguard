// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title UsernameRegistry
/// @notice On-chain, lowercase username to wallet mapping for HashGuard.
contract UsernameRegistry {
    uint256 public constant MIN_USERNAME_LENGTH = 3;
    uint256 public constant MAX_USERNAME_LENGTH = 32;

    mapping(bytes32 => address) private _ownerByHash;
    mapping(address => string) private _usernameByOwner;

    event UsernameRegistered(address indexed user, bytes32 indexed usernameHash, string username);

    error UsernameUnavailable();
    error InvalidUsername();
    error UsernameAlreadyAssigned();

    function registerUsername(string calldata username) external {
        string memory existing = _usernameByOwner[msg.sender];
        if (bytes(existing).length != 0) revert UsernameAlreadyAssigned();

        bytes memory normalized = _normalise(username);
        bytes32 usernameHash = keccak256(normalized);
        address currentOwner = _ownerByHash[usernameHash];
        if (currentOwner != address(0)) revert UsernameUnavailable();

        _ownerByHash[usernameHash] = msg.sender;
        _usernameByOwner[msg.sender] = string(normalized);
        emit UsernameRegistered(msg.sender, usernameHash, string(normalized));
    }

    function resolveUsername(string calldata username) external view returns (address) {
        return _ownerByHash[keccak256(_normalise(username))];
    }

    function isUsernameAvailable(string calldata username) external view returns (bool) {
        return _ownerByHash[keccak256(_normalise(username))] == address(0);
    }

    function getUsername(address user) external view returns (string memory) {
        return _usernameByOwner[user];
    }

    function _normalise(string calldata username) private pure returns (bytes memory result) {
        bytes calldata raw = bytes(username);
        uint256 start = raw.length > 0 && raw[0] == "@" ? 1 : 0;
        if (raw.length - start < MIN_USERNAME_LENGTH || raw.length - start > MAX_USERNAME_LENGTH) revert InvalidUsername();
        result = new bytes(raw.length - start);
        for (uint256 i; i < result.length; ++i) {
            bytes1 char = raw[i + start];
            if (char >= 0x41 && char <= 0x5A) char = bytes1(uint8(char) + 32);
            bool allowed = (char >= 0x61 && char <= 0x7A) || (char >= 0x30 && char <= 0x39) || char == 0x5f;
            if (!allowed) revert InvalidUsername();
            result[i] = char;
        }
    }
}

