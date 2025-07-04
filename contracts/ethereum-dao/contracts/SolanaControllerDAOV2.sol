// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OApp.sol";
import "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/libs/OptionsBuilder.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title SolanaControllerDAOV2
 * @dev Enhanced DAO contract with standardized cross-chain messaging for LayerZero V2
 */
contract SolanaControllerDAOV2 is OApp, ReentrancyGuard, Pausable {
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
    
    // Enhanced LayerZero configuration (removed peers as it's inherited)
    mapping(uint32 => bytes) public enforcedOptions; // eid => enforced options
    mapping(address => bool) public delegates; // delegate management
    
    // Rate limiting
    mapping(uint32 => uint256) public lastSentTime; // eid => timestamp
    mapping(uint32 => uint256) public sendCount; // eid => count
    uint256 public constant RATE_LIMIT_WINDOW = 1 hours;
    uint256 public constant MAX_SENDS_PER_HOUR = 10;
    
    // Message replay protection
    mapping(uint64 => bool) public processedNonces;
    
    // Enhanced security
    bool public emergencyPaused;
    address public emergencyAdmin;

    // Events
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support);
    event ProposalExecuted(uint256 indexed proposalId, bool success);
    event MemberAdded(address indexed member);
    event MemberRemoved(address indexed member);
    event CrossChainCommandSent(uint256 indexed proposalId, uint8 command, uint64 nonce);
    
    // Enhanced LayerZero events (removed PeerSet as it's inherited)
    event EnforcedOptionsSet(uint32 indexed eid, bytes options);
    event DelegateSet(address indexed delegate, bool status);
    event EmergencyPauseToggled(bool paused);
    event EmergencyAdminChanged(address indexed oldAdmin, address indexed newAdmin);
    event MessageReceived(uint32 indexed srcEid, bytes32 indexed sender, bytes message);
    event BatchMessageSent(uint32 indexed dstEid, uint256 messageCount);
    event RateLimitExceeded(uint32 indexed eid, uint256 attempts);

    modifier onlyMember() {
        require(members[msg.sender], "Not a DAO member");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == owner(), "Not admin");
        _;
    }
    
    modifier onlyDelegate() {
        require(delegates[msg.sender] || msg.sender == owner(), "Not authorized delegate");
        _;
    }
    
    modifier onlyEmergencyAdmin() {
        require(msg.sender == emergencyAdmin || msg.sender == owner(), "Not emergency admin");
        _;
    }
    
    modifier notEmergencyPaused() {
        require(!emergencyPaused, "Emergency paused");
        _;
    }
    
    modifier rateLimited(uint32 _eid) {
        require(_checkRateLimit(_eid), "Rate limit exceeded");
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
        
        // Enhanced initialization
        emergencyAdmin = _owner;
        delegates[_owner] = true;
        
        // Set initial peer configuration for Solana using inherited setPeer
        bytes32 solanaControllerBytes32 = bytes32(uint256(uint160(_solanaController)));
        _setPeer(_solanaEid, solanaControllerBytes32);
        
        emit DelegateSet(_owner, true);
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
    function executeProposal(uint256 _proposalId) external payable 
        whenNotPaused 
        notEmergencyPaused 
        nonReentrant 
        rateLimited(SOLANA_EID) 
    {
        Proposal storage proposal = proposals[_proposalId];
        require(block.timestamp > proposal.deadline, "Voting still active");
        require(!proposal.executed, "Already executed");
        require(_proposalPassed(_proposalId), "Proposal did not pass");
        require(_validateNonce(proposal.message.nonce), "Invalid or duplicate nonce");

        proposal.executed = true;

        // Encode the cross-chain message for LayerZero
        bytes memory encodedMessage = abi.encode(
            proposal.message.command,
            proposal.message.nonce,
            proposal.message.timestamp,
            proposal.message.version,
            proposal.message.payload
        );

        // Validate message
        require(_validateMessage(encodedMessage), "Invalid message format");

        // Send command to Solana via LayerZero with enhanced options
        bytes memory options = _combineOptions(
            SOLANA_EID,
            OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0)
        );
        
        _lzSend(
            SOLANA_EID,
            encodedMessage,
            options,
            MessagingFee(msg.value, 0),
            payable(msg.sender)
        );

        _updateRateLimit(SOLANA_EID);

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
    function emergencyUpdate(uint8 _command, bytes calldata _payload) external payable 
        onlyEmergencyAdmin 
        nonReentrant 
        rateLimited(SOLANA_EID) 
    {
        require(_payload.length > 0 && _payload.length <= 65535, "Invalid payload format");
        
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

        bytes memory options = _combineOptions(
            SOLANA_EID,
            OptionsBuilder.newOptions().addExecutorLzReceiveOption(200000, 0)
        );
        
        _lzSend(
            SOLANA_EID,
            encodedMessage,
            options,
            MessagingFee(msg.value, 0),
            payable(msg.sender)
        );

        _updateRateLimit(SOLANA_EID);
        
        emit CrossChainCommandSent(0, message.command, message.nonce); // proposalId = 0 for emergency
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

    /**
     * @dev Standard LayerZero peer configuration functions (use inherited setPeer)
     */
    function setPeer(uint32 _eid, bytes32 _peer) public override onlyOwner {
        super.setPeer(_eid, _peer);
    }
    
    function getPeer(uint32 _eid) external view returns (bytes32) {
        return peers[_eid];
    }
    
    /**
     * @dev Set enforced options for a specific endpoint
     */
    function setEnforcedOptions(uint32 _eid, bytes calldata _options) external onlyOwner {
        enforcedOptions[_eid] = _options;
        emit EnforcedOptionsSet(_eid, _options);
    }
    
    /**
     * @dev Get enforced options for a specific endpoint
     */
    function getEnforcedOptions(uint32 _eid) external view returns (bytes memory) {
        return enforcedOptions[_eid];
    }
    
    /**
     * @dev General purpose message sending with enhanced options
     */
    function quoteSendMessage(
        uint32 _dstEid,
        bytes calldata _message,
        bytes calldata _options
    ) external view returns (MessagingFee memory fee) {
        bytes memory options = _combineOptions(_dstEid, _options);
        return _quote(_dstEid, _message, options, false);
    }
    
    /**
     * @dev Quote batch message sending
     */
    function quoteBatchSend(
        uint32[] calldata _dstEids,
        bytes[] calldata _messages,
        bytes calldata _options
    ) external view returns (MessagingFee memory totalFee) {
        require(_dstEids.length == _messages.length, "Array length mismatch");
        
        MessagingFee memory tempFee;
        for (uint256 i = 0; i < _dstEids.length; i++) {
            bytes memory options = _combineOptions(_dstEids[i], _options);
            tempFee = _quote(_dstEids[i], _messages[i], options, false);
            totalFee.nativeFee += tempFee.nativeFee;
            totalFee.lzTokenFee += tempFee.lzTokenFee;
        }
    }
    
    /**
     * @dev Send batch messages
     */
    function sendBatchMessages(
        uint32[] calldata _dstEids,
        bytes[] calldata _messages,
        bytes calldata _options
    ) external payable onlyDelegate whenNotPaused notEmergencyPaused nonReentrant {
        require(_dstEids.length == _messages.length, "Array length mismatch");
        require(_dstEids.length > 0, "Empty batch");
        
        uint256 totalNativeFee = 0;
        uint256 totalLzTokenFee = 0;
        
        // Calculate total fees
        for (uint256 i = 0; i < _dstEids.length; i++) {
            require(_checkRateLimit(_dstEids[i]), "Rate limit exceeded");
            bytes memory options = _combineOptions(_dstEids[i], _options);
            MessagingFee memory fee = _quote(_dstEids[i], _messages[i], options, false);
            totalNativeFee += fee.nativeFee;
            totalLzTokenFee += fee.lzTokenFee;
        }
        
        require(msg.value >= totalNativeFee, "Insufficient native fee");
        
        // Send messages
        for (uint256 i = 0; i < _dstEids.length; i++) {
            bytes memory options = _combineOptions(_dstEids[i], _options);
            MessagingFee memory fee = _quote(_dstEids[i], _messages[i], options, false);
            
            _lzSend(
                _dstEids[i],
                _messages[i],
                options,
                fee,
                payable(msg.sender)
            );
            
            _updateRateLimit(_dstEids[i]);
        }
        
        emit BatchMessageSent(_dstEids[0], _dstEids.length);
    }
    
    /**
     * @dev Delegate management functions
     */
    function setDelegate(address _delegate, bool _status) external onlyOwner {
        delegates[_delegate] = _status;
        emit DelegateSet(_delegate, _status);
    }
    
    /**
     * @dev Emergency controls
     */
    function setEmergencyPause(bool _paused) external onlyEmergencyAdmin {
        emergencyPaused = _paused;
        emit EmergencyPauseToggled(_paused);
    }
    
    function setEmergencyAdmin(address _newAdmin) external onlyOwner {
        address oldAdmin = emergencyAdmin;
        emergencyAdmin = _newAdmin;
        emit EmergencyAdminChanged(oldAdmin, _newAdmin);
    }

    // Override required by LayerZero
    function _lzReceive(
        Origin calldata _origin,
        bytes32 /*_guid*/,
        bytes calldata _message,
        address /*_executor*/,
        bytes calldata /*_extraData*/
    ) internal override {
        // Enhanced message receiving with basic validation
        require(_message.length > 0, "Empty message");
        require(peers[_origin.srcEid] != bytes32(0), "Unknown peer");
        require(peers[_origin.srcEid] == _origin.sender, "Invalid sender");
        
        // Emit event for message reception
        emit MessageReceived(_origin.srcEid, _origin.sender, _message);
        
        // This DAO primarily sends messages, but can log received confirmations
        // In a full implementation, you might decode and process acknowledgments here
    }

    /**
     * @dev Internal function to combine enforced options with provided options
     */
    function _combineOptions(uint32 _eid, bytes memory _options) internal view returns (bytes memory) {
        bytes memory enforced = enforcedOptions[_eid];
        if (enforced.length == 0) {
            return _options;
        }
        if (_options.length == 0) {
            return enforced;
        }
        // Combine options (enforced options take precedence)
        return bytes.concat(enforced, _options);
    }
    
    /**
     * @dev Rate limiting functions
     */
    function _checkRateLimit(uint32 _eid) internal view returns (bool) {
        uint256 windowStart = block.timestamp - RATE_LIMIT_WINDOW;
        if (lastSentTime[_eid] < windowStart) {
            return true; // Reset window
        }
        return sendCount[_eid] < MAX_SENDS_PER_HOUR;
    }
    
    function _updateRateLimit(uint32 _eid) internal {
        uint256 windowStart = block.timestamp - RATE_LIMIT_WINDOW;
        if (lastSentTime[_eid] < windowStart) {
            sendCount[_eid] = 1;
            lastSentTime[_eid] = block.timestamp;
        } else {
            sendCount[_eid]++;
            if (sendCount[_eid] > MAX_SENDS_PER_HOUR) {
                emit RateLimitExceeded(_eid, sendCount[_eid]);
            }
        }
    }
    
    /**
     * @dev Enhanced message validation
     */
    function _validateMessage(bytes memory _message) internal pure returns (bool) {
        // Basic validation - ensure message is not empty and not too large
        return _message.length > 0 && _message.length <= 65535;
    }
    
    /**
     * @dev Nonce management for replay protection
     */
    function _validateNonce(uint64 _nonce) internal returns (bool) {
        if (processedNonces[_nonce]) {
            return false; // Already processed
        }
        processedNonces[_nonce] = true;
        return true;
    }
}
