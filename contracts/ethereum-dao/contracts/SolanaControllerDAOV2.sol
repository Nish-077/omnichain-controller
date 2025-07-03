// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OApp.sol";
import "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/libs/OptionsBuilder.sol";

/**
 * @title SolanaControllerDAOV2
 * @dev Enhanced DAO contract with standardized cross-chain messaging for LayerZero V2
 */
contract SolanaControllerDAOV2 is OApp {
    using OptionsBuilder for bytes;

    // Message format constants (matching SDK)
    uint8 public constant COMMAND_UPDATE_COLLECTION_METADATA = 0;
    uint8 public constant COMMAND_BATCH_UPDATE_CNFTS = 1;
    uint8 public constant COMMAND_TRANSFER_AUTHORITY = 2;
    uint8 public constant COMMAND_EMERGENCY_PAUSE = 3;
    uint8 public constant COMMAND_EMERGENCY_UNPAUSE = 4;
    uint8 public constant MESSAGE_VERSION = 1;

    // Cross-chain message structure
    struct CrossChainMessage {
        uint8 command;
        uint64 nonce;
        int64 timestamp;
        uint8 version;
        bytes payload;
    }

    // Governance state (same as before)
    struct Proposal {
        uint256 id;
        string description;
        CrossChainMessage message; // Enhanced message format
        uint256 forVotes;
        uint256 againstVotes;
        uint256 deadline;
        bool executed;
        address proposer;
        mapping(address => bool) hasVoted;
        mapping(address => bool) voteChoice;
    }

    // State variables
    mapping(uint256 => Proposal) public proposals;
    mapping(address => bool) public members;
    mapping(address => uint256) public memberJoinTime;
    
    uint256 public proposalCount;
    uint64 public messageNonce; // For cross-chain message sequencing
    uint256 public constant VOTING_PERIOD = 3 days;
    uint256 public memberCount;
    uint256 public quorum = 51; // 51% quorum
    
    // LayerZero configuration
    uint32 public immutable SOLANA_EID;
    address public immutable SOLANA_CONTROLLER;
    
    // Events
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support);
    event ProposalExecuted(uint256 indexed proposalId, bool success);
    event MemberAdded(address indexed member);
    event MemberRemoved(address indexed member);
    event CrossChainCommandSent(uint256 indexed proposalId, uint8 command, uint64 nonce);

    modifier onlyMember() {
        require(members[msg.sender], "Not a DAO member");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == owner(), "Not admin");
        _;
    }

    constructor(
        address _endpoint,
        address _owner,
        uint32 _solanaEid,
        address _solanaController
    ) OApp(_endpoint, _owner) {
        SOLANA_EID = _solanaEid;
        SOLANA_CONTROLLER = _solanaController;
        
        // Add deployer as first member
        members[_owner] = true;
        memberJoinTime[_owner] = block.timestamp;
        memberCount = 1;
        messageNonce = 1; // Start from 1
    }

    /**
     * @dev Create a proposal with standardized cross-chain message
     */
    function createUpdateMetadataProposal(
        string calldata _description,
        string calldata _newUri,
        string calldata _newName,
        string calldata _newSymbol
    ) external onlyMember returns (uint256) {
        // Encode payload for UPDATE_COLLECTION_METADATA command
        bytes memory payload = abi.encode(_newUri, _newName, _newSymbol);
        
        CrossChainMessage memory message = CrossChainMessage({
            command: COMMAND_UPDATE_COLLECTION_METADATA,
            nonce: messageNonce++,
            timestamp: int64(uint64(block.timestamp)),
            version: MESSAGE_VERSION,
            payload: payload
        });

        return _createProposal(_description, message);
    }

    /**
     * @dev Create an emergency pause proposal
     */
    function createEmergencyPauseProposal(
        string calldata _description
    ) external onlyMember returns (uint256) {
        CrossChainMessage memory message = CrossChainMessage({
            command: COMMAND_EMERGENCY_PAUSE,
            nonce: messageNonce++,
            timestamp: int64(uint64(block.timestamp)),
            version: MESSAGE_VERSION,
            payload: ""
        });

        return _createProposal(_description, message);
    }

    /**
     * @dev Internal function to create proposals
     */
    function _createProposal(
        string memory _description,
        CrossChainMessage memory _message
    ) internal returns (uint256) {
        uint256 proposalId = proposalCount++;
        
        Proposal storage proposal = proposals[proposalId];
        proposal.id = proposalId;
        proposal.description = _description;
        proposal.message = _message;
        proposal.deadline = block.timestamp + VOTING_PERIOD;
        proposal.proposer = msg.sender;
        proposal.executed = false;

        emit ProposalCreated(proposalId, msg.sender, _description);
        return proposalId;
    }

    /**
     * @dev Vote on a proposal (same as before)
     */
    function vote(uint256 _proposalId, bool _support) external onlyMember {
        Proposal storage proposal = proposals[_proposalId];
        require(block.timestamp <= proposal.deadline, "Voting period ended");
        require(!proposal.hasVoted[msg.sender], "Already voted");

        proposal.hasVoted[msg.sender] = true;
        proposal.voteChoice[msg.sender] = _support;

        if (_support) {
            proposal.forVotes++;
        } else {
            proposal.againstVotes++;
        }

        emit VoteCast(_proposalId, msg.sender, _support);
    }

    /**
     * @dev Execute a passed proposal with enhanced message format
     */
    function executeProposal(uint256 _proposalId) external payable {
        Proposal storage proposal = proposals[_proposalId];
        require(block.timestamp > proposal.deadline, "Voting still active");
        require(!proposal.executed, "Already executed");
        require(_proposalPassed(_proposalId), "Proposal did not pass");

        proposal.executed = true;

        // Encode the cross-chain message for LayerZero
        bytes memory encodedMessage = abi.encode(
            proposal.message.command,
            proposal.message.nonce,
            proposal.message.timestamp,
            proposal.message.version,
            proposal.message.payload
        );

        // Send command to Solana via LayerZero
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0);
        
        _lzSend(
            SOLANA_EID,
            encodedMessage,
            options,
            MessagingFee(msg.value, 0),
            payable(msg.sender)
        );

        emit ProposalExecuted(_proposalId, true);
        emit CrossChainCommandSent(_proposalId, proposal.message.command, proposal.message.nonce);
    }

    /**
     * @dev Check if a proposal passed (same as before)
     */
    function _proposalPassed(uint256 _proposalId) internal view returns (bool) {
        Proposal storage proposal = proposals[_proposalId];
        uint256 totalVotes = proposal.forVotes + proposal.againstVotes;
        uint256 requiredQuorum = (memberCount * quorum) / 100;
        
        return totalVotes >= requiredQuorum && proposal.forVotes > proposal.againstVotes;
    }

    /**
     * @dev Quote fee for a specific command type
     */
    function quoteCommand(uint8 _command, bytes calldata _payload) external view returns (MessagingFee memory fee) {
        bytes memory encodedMessage = abi.encode(
            _command,
            messageNonce, // Use current nonce for estimation
            int64(uint64(block.timestamp)),
            MESSAGE_VERSION,
            _payload
        );
        
        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0);
        return _quote(SOLANA_EID, encodedMessage, options, false);
    }

    /**
     * @dev Emergency function with standardized message format
     */
    function emergencyUpdate(uint8 _command, bytes calldata _payload) external payable onlyAdmin {
        CrossChainMessage memory message = CrossChainMessage({
            command: _command,
            nonce: messageNonce++,
            timestamp: int64(uint64(block.timestamp)),
            version: MESSAGE_VERSION,
            payload: _payload
        });

        bytes memory encodedMessage = abi.encode(
            message.command,
            message.nonce,
            message.timestamp,
            message.version,
            message.payload
        );

        bytes memory options = OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0);
        
        _lzSend(
            SOLANA_EID,
            encodedMessage,
            options,
            MessagingFee(msg.value, 0),
            payable(msg.sender)
        );
    }

    // Member management functions (same as before)
    function addMember(address _member) external onlyAdmin {
        require(_member != address(0), "Cannot add zero address");
        require(!members[_member], "Already a member");
        members[_member] = true;
        memberJoinTime[_member] = block.timestamp;
        memberCount++;
        emit MemberAdded(_member);
    }

    function removeMember(address _member) external onlyAdmin {
        require(_member != owner(), "Cannot remove owner");
        require(members[_member], "Not a member");
        members[_member] = false;
        memberCount--;
        emit MemberRemoved(_member);
    }

    /**
     * @dev Get proposal details
     */
    function getProposal(uint256 _proposalId) external view returns (
        uint256 id,
        string memory description,
        uint256 forVotes,
        uint256 againstVotes,
        uint256 deadline,
        bool executed,
        address proposer,
        uint8 command,
        uint64 nonce
    ) {
        Proposal storage proposal = proposals[_proposalId];
        return (
            proposal.id,
            proposal.description,
            proposal.forVotes,
            proposal.againstVotes,
            proposal.deadline,
            proposal.executed,
            proposal.proposer,
            proposal.message.command,
            proposal.message.nonce
        );
    }

    // Override required by LayerZero
    function _lzReceive(
        Origin calldata /*_origin*/,
        bytes32 /*_guid*/,
        bytes calldata /*_message*/,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) internal pure override {
        // This DAO only sends messages, doesn't receive them
        revert("DAO does not receive messages");
    }
}
