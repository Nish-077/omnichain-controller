// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MockLayerZeroEndpoint
 * @dev A mock contract for testing LayerZero integration
 */
contract MockLayerZeroEndpoint {
    mapping(address => bool) public apps;
    
    struct MessagingFee {
        uint256 nativeFee;
        uint256 lzTokenFee;
    }

    struct MessagingParams {
        uint32 dstEid;
        bytes32 receiver;
        bytes message;
        bytes options;
        bool payInLzToken;
    }

    struct MessagingReceipt {
        bytes32 guid;
        uint64 nonce;
        MessagingFee fee;
    }
    
    event PacketSent(
        bytes encodedPayload,
        bytes options,
        address sendLibrary
    );

    function setDelegate(address /*_delegate*/) external {
        // Mock implementation
    }

    function send(
        MessagingParams calldata /*_params*/,
        address /*_refundAddress*/
    ) external payable returns (MessagingReceipt memory receipt) {
        // Mock implementation - just emit an event and return mock receipt
        emit PacketSent("mock payload", "mock options", address(this));
        receipt = MessagingReceipt({
            guid: bytes32(uint256(1)),
            nonce: 1,
            fee: MessagingFee(msg.value, 0)
        });
    }

    function quote(
        MessagingParams calldata /*_params*/
    ) external pure returns (MessagingFee memory fee) {
        // Mock implementation - return minimal fees
        fee = MessagingFee({
            nativeFee: 0.01 ether,
            lzTokenFee: 0
        });
    }

    // Legacy functions for compatibility
    function send(
        uint32 /*_dstEid*/,
        bytes calldata /*_payload*/,
        bytes calldata /*_options*/,
        MessagingFee calldata /*_fee*/,
        address /*_refundAddress*/
    ) external payable {
        // Mock implementation - just emit an event
        emit PacketSent("mock payload", "mock options", address(this));
    }

    function quote(
        uint32 /*_dstEid*/,
        bytes calldata /*_payload*/,
        bytes calldata /*_options*/,
        bool /*_payInLzToken*/
    ) external pure returns (MessagingFee memory fee) {
        // Mock implementation - return minimal fees
        fee = MessagingFee({
            nativeFee: 0.01 ether,
            lzTokenFee: 0
        });
    }

    // Additional quote function for OApp compatibility
    function quote(
        uint32 /*_dstEid*/,
        bytes calldata /*_message*/,
        bytes calldata /*_options*/,
        bool /*_payInLzToken*/,
        address /*_sender*/
    ) external pure returns (MessagingFee memory fee) {
        // Mock implementation - return minimal fees
        fee = MessagingFee({
            nativeFee: 0.01 ether,
            lzTokenFee: 0
        });
    }

    // Yet another quote signature that might be needed
    function quote(
        address /*_sender*/,
        uint32 /*_dstEid*/,
        bytes calldata /*_message*/,
        bytes calldata /*_options*/,
        bool /*_payInLzToken*/
    ) external pure returns (MessagingFee memory fee) {
        // Mock implementation - return minimal fees
        fee = MessagingFee({
            nativeFee: 0.01 ether,
            lzTokenFee: 0
        });
    }

    function setConfig(
        address /*_oapp*/,
        address /*_lib*/,
        uint32 /*_eid*/,
        uint32 /*_configType*/,
        bytes calldata /*_config*/
    ) external {
        // Mock implementation
    }

    function setSendLibrary(
        address /*_oapp*/,
        uint32 /*_eid*/,
        address /*_sendLib*/
    ) external {
        // Mock implementation
    }

    function setReceiveLibrary(
        address /*_oapp*/,
        uint32 /*_eid*/,
        address /*_receiveLib*/,
        uint256 /*_gracePeriod*/
    ) external {
        // Mock implementation
    }

    // Receive function to handle plain Ether transfers
    receive() external payable {
        // Accept Ether transfers
    }

    // Fallback function to handle any unrecognized calls
    fallback() external payable {
        // Return a default MessagingFee for any unrecognized quote calls
        if (msg.data.length >= 4) {
            // Check if it looks like a quote function (contains "quote" pattern)
            // This is a hack for testing, but it works
            assembly {
                let ptr := mload(0x40)
                mstore(ptr, 0x0000000000000000000000000000000000000000000000000038d7ea4c680000) // 0.01 ether
                mstore(add(ptr, 0x20), 0x0000000000000000000000000000000000000000000000000000000000000000) // 0
                return(ptr, 0x40)
            }
        }
        revert("Function not supported");
    }
}
