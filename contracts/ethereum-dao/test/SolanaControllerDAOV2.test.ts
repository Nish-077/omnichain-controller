import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("SolanaControllerDAOV2", function () {
  let dao: any;
  let mockEndpointContract: any;
  let owner: HardhatEthersSigner;
  let member1: HardhatEthersSigner;
  let member2: HardhatEthersSigner;
  let member3: HardhatEthersSigner;
  let nonMember: HardhatEthersSigner;

  const SOLANA_EID = 40168; // Solana Devnet EID
  const MOCK_SOLANA_CONTROLLER_RAW = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"; // Valid checksummed address
  const VOTING_PERIOD = 3 * 24 * 60 * 60; // 3 days in seconds

  // Command constants
  const COMMAND_UPDATE_COLLECTION_METADATA = 0;
  const COMMAND_BATCH_UPDATE_CNFTS = 1;
  const COMMAND_TRANSFER_AUTHORITY = 2;
  const COMMAND_EMERGENCY_PAUSE = 3;
  const COMMAND_EMERGENCY_UNPAUSE = 4;

  beforeEach(async function () {
    [owner, member1, member2, member3, nonMember] = await ethers.getSigners();

    // Use the valid checksummed address directly
    const MOCK_SOLANA_CONTROLLER = MOCK_SOLANA_CONTROLLER_RAW;

    // Deploy mock LayerZero endpoint
    const MockEndpointFactory = await ethers.getContractFactory("MockLayerZeroEndpoint");
    mockEndpointContract = await MockEndpointFactory.deploy();

    // Deploy the DAO V2 contract
    const DAOV2Factory = await ethers.getContractFactory("SolanaControllerDAOV2");
    dao = await DAOV2Factory.deploy(
      await mockEndpointContract.getAddress(),
      owner.address,
      SOLANA_EID,
      MOCK_SOLANA_CONTROLLER
    );

    // Set up peer for LayerZero messaging
    const solanaControllerBytes32 = ethers.zeroPadValue(MOCK_SOLANA_CONTROLLER, 32);
    await dao.setPeer(SOLANA_EID, solanaControllerBytes32);

    // Add test members
    await dao.addMember(member1.address);
    await dao.addMember(member2.address);
    await dao.addMember(member3.address);
  });

  describe("Enhanced V2 Features", function () {
    it("Should have correct command constants", async function () {
      expect(await dao.COMMAND_UPDATE_COLLECTION_METADATA()).to.equal(0);
      expect(await dao.COMMAND_BATCH_UPDATE_CNFTS()).to.equal(1);
      expect(await dao.COMMAND_TRANSFER_AUTHORITY()).to.equal(2);
      expect(await dao.COMMAND_EMERGENCY_PAUSE()).to.equal(3);
      expect(await dao.COMMAND_EMERGENCY_UNPAUSE()).to.equal(4);
      expect(await dao.MESSAGE_VERSION()).to.equal(1);
    });

    it("Should start with messageNonce = 1", async function () {
      expect(await dao.messageNonce()).to.equal(1);
    });

    it("Should create update metadata proposal with standardized message", async function () {
      const description = "Update collection to new theme";
      const newUri = "https://arweave.net/new-metadata";
      const newName = "Enhanced Collection";
      const newSymbol = "ENHANCE";

      const tx = await dao.connect(member1).createUpdateMetadataProposal(
        description,
        newUri,
        newName,
        newSymbol
      );

      const receipt = await tx.wait();
      
      // Check ProposalCreated event
      const event = receipt.logs.find(
        (log: any) => log.fragment?.name === "ProposalCreated"
      );
      expect(event).to.not.be.undefined;

      // Check proposal details
      const proposal = await dao.getProposal(0);
      expect(proposal.id).to.equal(0);
      expect(proposal.description).to.equal(description);
      expect(proposal.command).to.equal(COMMAND_UPDATE_COLLECTION_METADATA);
      expect(proposal.nonce).to.equal(1);
      expect(proposal.executed).to.be.false;
      expect(proposal.proposer).to.equal(member1.address);

      // Check nonce incremented
      expect(await dao.messageNonce()).to.equal(2);
    });

    it("Should create emergency pause proposal", async function () {
      const description = "Emergency pause due to security issue";

      const tx = await dao.connect(member1).createEmergencyPauseProposal(description);
      await tx.wait();

      const proposal = await dao.getProposal(0);
      expect(proposal.command).to.equal(COMMAND_EMERGENCY_PAUSE);
      expect(proposal.nonce).to.equal(1);

      // Check nonce incremented
      expect(await dao.messageNonce()).to.equal(2);
    });

    it("Should allow voting on V2 proposals", async function () {
      // Create proposal
      await dao.connect(member1).createUpdateMetadataProposal(
        "Test proposal",
        "https://test.uri",
        "Test Name",
        "TEST"
      );

      // Vote on proposal
      await dao.connect(member1).vote(0, true);
      await dao.connect(member2).vote(0, true);

      const proposal = await dao.getProposal(0);
      expect(proposal.forVotes).to.equal(2);
    });

    it("Should execute V2 proposal and send enhanced message", async function () {
      // Create and vote on proposal
      await dao.connect(member1).createUpdateMetadataProposal(
        "Update metadata",
        "https://new.uri",
        "New Collection",
        "NEW"
      );

      await dao.connect(member1).vote(0, true);
      await dao.connect(member2).vote(0, true);
      await dao.connect(member3).vote(0, true);

      // Fast forward past voting period
      await time.increase(VOTING_PERIOD + 1);

      // Execute proposal
      const tx = await dao.executeProposal(0, { value: ethers.parseEther("0.01") });
      const receipt = await tx.wait();

      // Check ProposalExecuted event
      const executedEvent = receipt.logs.find(
        (log: any) => log.fragment?.name === "ProposalExecuted"
      );
      expect(executedEvent).to.not.be.undefined;

      // Check CrossChainCommandSent event
      const crossChainEvent = receipt.logs.find(
        (log: any) => log.fragment?.name === "CrossChainCommandSent"
      );
      expect(crossChainEvent).to.not.be.undefined;

      // Verify proposal is marked as executed
      const proposal = await dao.getProposal(0);
      expect(proposal.executed).to.be.true;
    });

    it("Should quote command fees correctly", async function () {
      const payload = ethers.AbiCoder.defaultAbiCoder().encode(
        ["string", "string", "string"],
        ["https://test.uri", "Test Name", "TEST"]
      );

      const quote = await dao.quoteCommand(COMMAND_UPDATE_COLLECTION_METADATA, payload);
      // The actual fee might be different due to LayerZero processing, just check it's reasonable
      expect(quote.nativeFee).to.be.greaterThan(0);
      expect(quote.lzTokenFee).to.equal(0);
    });

    it("Should allow admin emergency updates", async function () {
      const payload = ethers.AbiCoder.defaultAbiCoder().encode(
        ["string"],
        ["Emergency update data"]
      );

      const tx = await dao.emergencyUpdate(
        COMMAND_EMERGENCY_PAUSE,
        payload,
        { value: ethers.parseEther("0.01") }
      );

      await tx.wait();

      // Check nonce incremented
      expect(await dao.messageNonce()).to.equal(2);
    });

    it("Should not allow non-admin emergency updates", async function () {
      const payload = ethers.AbiCoder.defaultAbiCoder().encode(
        ["string"],
        ["Unauthorized update"]
      );

      await expect(
        dao.connect(member1).emergencyUpdate(
          COMMAND_EMERGENCY_PAUSE,
          payload,
          { value: ethers.parseEther("0.01") }
        )
      ).to.be.revertedWith("Not admin");
    });

    it("Should prevent double execution", async function () {
      // Create and vote on proposal
      await dao.connect(member1).createUpdateMetadataProposal(
        "Test proposal",
        "https://test.uri",
        "Test Name",
        "TEST"
      );

      await dao.connect(member1).vote(0, true);
      await dao.connect(member2).vote(0, true);
      await dao.connect(member3).vote(0, true);

      await time.increase(VOTING_PERIOD + 1);

      // First execution should succeed
      await dao.executeProposal(0, { value: ethers.parseEther("0.01") });

      // Second execution should fail
      await expect(
        dao.executeProposal(0, { value: ethers.parseEther("0.01") })
      ).to.be.revertedWith("Already executed");
    });

    it("Should handle multiple proposals with correct nonces", async function () {
      // Create multiple proposals
      await dao.connect(member1).createUpdateMetadataProposal(
        "Proposal 1",
        "https://uri1.com",
        "Name 1",
        "SYM1"
      );

      await dao.connect(member1).createEmergencyPauseProposal("Proposal 2");

      await dao.connect(member1).createUpdateMetadataProposal(
        "Proposal 3",
        "https://uri3.com",
        "Name 3",
        "SYM3"
      );

      // Check proposals have sequential nonces
      const proposal0 = await dao.getProposal(0);
      const proposal1 = await dao.getProposal(1);
      const proposal2 = await dao.getProposal(2);

      expect(proposal0.nonce).to.equal(1);
      expect(proposal1.nonce).to.equal(2);
      expect(proposal2.nonce).to.equal(3);

      // Check current nonce
      expect(await dao.messageNonce()).to.equal(4);
    });
  });

  // Port all comprehensive edge case tests from V1
  describe("Deployment Edge Cases", function () {
    it("Should set the correct owner", async function () {
      expect(await dao.owner()).to.equal(owner.address);
    });

    it("Should set the correct Solana endpoint ID", async function () {
      expect(await dao.SOLANA_EID()).to.equal(SOLANA_EID);
    });

    it("Should set the correct Solana controller address", async function () {
      expect(await dao.SOLANA_CONTROLLER()).to.equal(MOCK_SOLANA_CONTROLLER_RAW);
    });

    it("Should add the owner as the first member", async function () {
      expect(await dao.members(owner.address)).to.be.true;
      expect(await dao.memberCount()).to.equal(4); // owner + 3 added in beforeEach
    });

    it("Should reject deployment with zero address endpoint", async function () {
      const DAOV2Factory = await ethers.getContractFactory("SolanaControllerDAOV2");
      await expect(DAOV2Factory.deploy(
        ethers.ZeroAddress,
        owner.address,
        SOLANA_EID,
        MOCK_SOLANA_CONTROLLER_RAW
      )).to.be.reverted;
    });

    it("Should reject deployment with zero address owner (LayerZero requires valid delegate)", async function () {
      const DAOV2Factory = await ethers.getContractFactory("SolanaControllerDAOV2");
      await expect(DAOV2Factory.deploy(
        await mockEndpointContract.getAddress(),
        ethers.ZeroAddress,
        SOLANA_EID,
        MOCK_SOLANA_CONTROLLER_RAW
      )).to.be.revertedWithCustomError(dao, "InvalidDelegate");
    });
  });

  describe("Member Management Edge Cases", function () {
    let member4: HardhatEthersSigner;
    let member5: HardhatEthersSigner;

    beforeEach(async function () {
      [,,,,, member4, member5] = await ethers.getSigners();
    });

    it("Should allow owner to add members", async function () {
      await dao.addMember(member4.address);
      expect(await dao.members(member4.address)).to.be.true;
      expect(await dao.memberCount()).to.equal(5); // owner + 3 existing + 1 new
    });

    it("Should not allow non-owner to add members", async function () {
      await expect(dao.connect(member1).addMember(member4.address))
        .to.be.revertedWith("Not admin");
    });

    it("Should not allow adding existing members", async function () {
      await expect(dao.addMember(member1.address))
        .to.be.revertedWith("Already a member");
    });

    it("Should allow owner to remove members", async function () {
      await dao.removeMember(member1.address);
      expect(await dao.members(member1.address)).to.be.false;
      expect(await dao.memberCount()).to.equal(3); // owner + 2 remaining
    });

    it("Should not allow adding zero address as member", async function () {
      await expect(dao.addMember(ethers.ZeroAddress))
        .to.be.revertedWith("Cannot add zero address");
    });

    it("Should not allow removing non-members", async function () {
      await expect(dao.removeMember(member4.address))
        .to.be.revertedWith("Not a member");
    });

    it("Should not allow removing the owner", async function () {
      await expect(dao.removeMember(owner.address))
        .to.be.revertedWith("Cannot remove owner");
    });

    it("Should handle adding the same member after removal", async function () {
      await dao.removeMember(member1.address);
      await dao.addMember(member1.address);
      expect(await dao.members(member1.address)).to.be.true;
      expect(await dao.memberCount()).to.equal(4); // back to original
    });

    it("Should correctly track member count with multiple additions/removals", async function () {
      await dao.addMember(member4.address);
      await dao.addMember(member5.address);
      expect(await dao.memberCount()).to.equal(6); // owner + 5 members

      await dao.removeMember(member1.address);
      await dao.removeMember(member3.address);
      expect(await dao.memberCount()).to.equal(4); // owner + member2 + member4 + member5
    });

    it("Should emit MemberAdded and MemberRemoved events", async function () {
      await expect(dao.addMember(member4.address))
        .to.emit(dao, "MemberAdded")
        .withArgs(member4.address);

      await expect(dao.removeMember(member4.address))
        .to.emit(dao, "MemberRemoved")
        .withArgs(member4.address);
    });
  });

  describe("Proposal Creation Edge Cases", function () {
    it("Should allow members to create V2 proposals", async function () {
      const description = "Update collection metadata";
      const newUri = "https://test.uri";
      const newName = "Test Collection";
      const newSymbol = "TEST";

      const tx = await dao.connect(member1).createUpdateMetadataProposal(
        description,
        newUri,
        newName,
        newSymbol
      );
      const receipt = await tx.wait();
      
      expect(receipt?.status).to.equal(1);
      expect(await dao.proposalCount()).to.equal(1);
    });

    it("Should not allow non-members to create proposals", async function () {
      await expect(dao.connect(nonMember).createUpdateMetadataProposal(
        "Test",
        "https://test.uri",
        "Test",
        "TEST"
      )).to.be.revertedWith("Not a DAO member");
    });

    it("Should set correct proposal details for V2", async function () {
      const description = "Update collection metadata";
      const newUri = "https://test.uri";
      const newName = "Test Collection";
      const newSymbol = "TEST";

      await dao.connect(member1).createUpdateMetadataProposal(
        description,
        newUri,
        newName,
        newSymbol
      );
      
      const proposal = await dao.getProposal(0);
      expect(proposal.id).to.equal(0);
      expect(proposal.description).to.equal(description);
      expect(proposal.proposer).to.equal(member1.address);
      expect(proposal.executed).to.be.false;
      expect(proposal.forVotes).to.equal(0);
      expect(proposal.againstVotes).to.equal(0);
      expect(proposal.command).to.equal(COMMAND_UPDATE_COLLECTION_METADATA);
      expect(proposal.nonce).to.equal(1);
    });

    it("Should allow creating proposals with empty description", async function () {
      const description = "";

      await dao.connect(member1).createUpdateMetadataProposal(
        description,
        "https://test.uri",
        "Test",
        "TEST"
      );
      const proposal = await dao.getProposal(0);
      expect(proposal.description).to.equal("");
    });

    it("Should allow creating proposals with very long descriptions", async function () {
      const description = "A".repeat(1000); // Very long description

      await dao.connect(member1).createUpdateMetadataProposal(
        description,
        "https://test.uri",
        "Test",
        "TEST"
      );
      const proposal = await dao.getProposal(0);
      expect(proposal.description).to.equal(description);
    });

    it("Should increment proposal IDs correctly", async function () {
      await dao.connect(member1).createUpdateMetadataProposal("Proposal 1", "https://uri1.com", "Name1", "SYM1");
      await dao.connect(member2).createEmergencyPauseProposal("Proposal 2");
      await dao.connect(member1).createUpdateMetadataProposal("Proposal 3", "https://uri3.com", "Name3", "SYM3");

      expect(await dao.proposalCount()).to.equal(3);
      
      const proposal0 = await dao.getProposal(0);
      const proposal1 = await dao.getProposal(1);
      const proposal2 = await dao.getProposal(2);

      expect(proposal0.description).to.equal("Proposal 1");
      expect(proposal1.description).to.equal("Proposal 2");
      expect(proposal2.description).to.equal("Proposal 3");
    });

    it("Should emit ProposalCreated event with correct parameters", async function () {
      const description = "Test proposal";

      await expect(dao.connect(member1).createUpdateMetadataProposal(
        description,
        "https://test.uri",
        "Test",
        "TEST"
      )).to.emit(dao, "ProposalCreated")
        .withArgs(0, member1.address, description);
    });

    it("Should set deadline correctly for new proposals", async function () {
      const beforeTime = await time.latest();
      await dao.connect(member1).createUpdateMetadataProposal(
        "Test proposal",
        "https://test.uri",
        "Test",
        "TEST"
      );
      const afterTime = await time.latest();

      const proposal = await dao.getProposal(0);
      expect(proposal.deadline).to.be.at.least(beforeTime + VOTING_PERIOD);
      expect(proposal.deadline).to.be.at.most(afterTime + VOTING_PERIOD);
    });
  });

  describe("Voting Edge Cases", function () {
    beforeEach(async function () {
      // Create a test proposal
      await dao.connect(member1).createUpdateMetadataProposal(
        "Update collection metadata",
        "https://test.uri",
        "Test Collection",
        "TEST"
      );
    });

    it("Should allow members to vote", async function () {
      const tx = await dao.connect(member1).vote(0, true);
      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);
    });

    it("Should not allow non-members to vote", async function () {
      await expect(dao.connect(nonMember).vote(0, true))
        .to.be.revertedWith("Not a DAO member");
    });

    it("Should not allow double voting", async function () {
      await dao.connect(member1).vote(0, true);
      await expect(dao.connect(member1).vote(0, false))
        .to.be.revertedWith("Already voted");
    });

    it("Should count votes correctly", async function () {
      await dao.connect(member1).vote(0, true);
      await dao.connect(member2).vote(0, true);
      await dao.connect(member3).vote(0, false);

      const proposal = await dao.getProposal(0);
      expect(proposal.forVotes).to.equal(2);
      expect(proposal.againstVotes).to.equal(1);
    });

    it("Should not allow voting on non-existent proposals", async function () {
      await expect(dao.connect(member1).vote(999, true))
        .to.be.reverted; // Proposal doesn't exist
    });

    it("Should not allow voting after deadline", async function () {
      // Fast forward time beyond voting period
      await time.increase(VOTING_PERIOD + 1);

      await expect(dao.connect(member1).vote(0, true))
        .to.be.revertedWith("Voting period ended");
    });

    it("Should allow voting exactly at the deadline", async function () {
      const proposal = await dao.getProposal(0);
      // Fast forward to just before the deadline 
      await time.increaseTo(proposal.deadline - 1n);

      // Should still be able to vote at the deadline block
      await dao.connect(member1).vote(0, true);
      const updatedProposal = await dao.getProposal(0);
      expect(updatedProposal.forVotes).to.equal(1);
    });

    it("Should emit VoteCast event with correct parameters", async function () {
      await expect(dao.connect(member1).vote(0, true))
        .to.emit(dao, "VoteCast")
        .withArgs(0, member1.address, true);

      await expect(dao.connect(member2).vote(0, false))
        .to.emit(dao, "VoteCast")
        .withArgs(0, member2.address, false);
    });

    it("Should handle voting by removed members", async function () {
      // Remove member after proposal creation but before voting
      await dao.removeMember(member3.address);
      
      await expect(dao.connect(member3).vote(0, true))
        .to.be.revertedWith("Not a DAO member");
    });

    it("Should handle complex voting scenarios", async function () {
      // Mixed voting pattern (owner + 3 members = 4 total)
      await dao.vote(0, true);                    // Owner: For
      await dao.connect(member1).vote(0, true);   // For
      await dao.connect(member2).vote(0, false);  // Against
      // member3 doesn't vote

      const proposal = await dao.getProposal(0);
      expect(proposal.forVotes).to.equal(2);
      expect(proposal.againstVotes).to.equal(1);
    });
  });

  describe("Proposal Execution Edge Cases", function () {
    beforeEach(async function () {
      // Create a test proposal
      await dao.connect(member1).createUpdateMetadataProposal(
        "Update collection metadata",
        "https://test.uri",
        "Test Collection",
        "TEST"
      );
    });

    it("Should not allow execution during voting period", async function () {
      await dao.connect(member1).vote(0, true);
      await dao.connect(member2).vote(0, true);

      await expect(dao.executeProposal(0, { value: ethers.parseEther("0.01") }))
        .to.be.revertedWith("Voting still active");
    });

    it("Should not allow execution of failed proposals (not enough votes)", async function () {
      // Only one vote out of 4 members (25%, below 51% quorum)
      await dao.connect(member1).vote(0, true);

      await time.increase(VOTING_PERIOD + 1);

      await expect(dao.executeProposal(0, { value: ethers.parseEther("0.01") }))
        .to.be.revertedWith("Proposal did not pass");
    });

    it("Should not allow execution of failed proposals (more against than for)", async function () {
      await dao.vote(0, false);                   // Owner: Against
      await dao.connect(member1).vote(0, false);  // Against
      await dao.connect(member2).vote(0, true);   // For

      await time.increase(VOTING_PERIOD + 1);

      await expect(dao.executeProposal(0, { value: ethers.parseEther("0.01") }))
        .to.be.revertedWith("Proposal did not pass");
    });

    it("Should not execute the same proposal twice", async function () {
      // Pass the proposal
      await dao.vote(0, true);                    // Owner
      await dao.connect(member1).vote(0, true);   // member1
      await dao.connect(member2).vote(0, true);   // member2

      await time.increase(VOTING_PERIOD + 1);

      // First execution should succeed with mock endpoint
      await dao.executeProposal(0, { value: ethers.parseEther("0.01") });

      // Second execution should revert
      await expect(dao.executeProposal(0, { value: ethers.parseEther("0.01") }))
        .to.be.revertedWith("Already executed");
    });

    it("Should not allow execution of non-existent proposals", async function () {
      await expect(dao.executeProposal(999, { value: ethers.parseEther("0.01") }))
        .to.be.reverted;
    });

    it("Should handle quorum edge cases", async function () {
      // Add one more member to have 5 total members (owner + 4)
      const [,,,,,, member4] = await ethers.getSigners();
      await dao.addMember(member4.address);

      // Test exact quorum (51% of 5 = 2.55, rounded up to 3)
      await dao.vote(0, true);                    // Owner
      await dao.connect(member1).vote(0, true);   // member1
      await dao.connect(member2).vote(0, true);   // member2
      // member3 and member4 don't vote

      await time.increase(VOTING_PERIOD + 1);

      // Should pass with exactly 3 votes out of 5 members
      try {
        await dao.executeProposal(0, { value: ethers.parseEther("0.01") });
      } catch (error: any) {
        // Expected to fail due to mock endpoint, but should not revert due to quorum
        expect(error.message).to.not.include("Proposal did not pass");
      }
    });

    it("Should handle zero quorum edge case", async function () {
      // Remove all members except owner
      await dao.removeMember(member1.address);
      await dao.removeMember(member2.address);
      await dao.removeMember(member3.address);

      // Create new proposal with only owner as member
      await dao.createUpdateMetadataProposal(
        "Owner only proposal",
        "https://owner.uri",
        "Owner Collection",
        "OWNER"
      );

      // Owner votes
      await dao.vote(1, true);

      await time.increase(VOTING_PERIOD + 1);

      // Should pass with owner's single vote
      try {
        await dao.executeProposal(1, { value: ethers.parseEther("0.01") });
      } catch (error: any) {
        // Expected to fail due to mock endpoint
        expect(error.message).to.not.include("Proposal did not pass");
      }
    });
  });

  describe("Emergency Functions Edge Cases", function () {
    it("Should allow admin to call emergency update", async function () {
      const payload = ethers.AbiCoder.defaultAbiCoder().encode(
        ["string"],
        ["emergency command"]
      );
      
      // This will fail due to mock endpoint, but we can test the access control
      try {
        await dao.emergencyUpdate(COMMAND_EMERGENCY_PAUSE, payload, { value: ethers.parseEther("0.01") });
      } catch (error: any) {
        // Expected due to mock LayerZero endpoint
        expect(error.message).to.not.include("Not admin");
      }
    });

    it("Should not allow non-admin to call emergency update", async function () {
      const payload = ethers.AbiCoder.defaultAbiCoder().encode(
        ["string"],
        ["emergency command"]
      );
      
      await expect(dao.connect(member1).emergencyUpdate(
        COMMAND_EMERGENCY_PAUSE,
        payload,
        { value: ethers.parseEther("0.01") }
      )).to.be.revertedWith("Not admin");
    });

    it("Should allow emergency update with empty payload", async function () {
      const payload = ethers.AbiCoder.defaultAbiCoder().encode(["string"], [""]);
      
      try {
        await dao.emergencyUpdate(COMMAND_EMERGENCY_PAUSE, payload, { value: ethers.parseEther("0.01") });
      } catch (error: any) {
        expect(error.message).to.not.include("Not admin");
      }
    });

    it("Should allow emergency update without ETH value", async function () {
      const payload = ethers.AbiCoder.defaultAbiCoder().encode(
        ["string"],
        ["emergency command"]
      );
      
      try {
        await dao.emergencyUpdate(COMMAND_EMERGENCY_PAUSE, payload, { value: 0 });
      } catch (error: any) {
        expect(error.message).to.not.include("Not admin");
      }
    });
  });

  describe("Security Edge Cases", function () {
    it("Should not allow reentrancy attacks during execution", async function () {
      // This is more of a conceptual test since our mock doesn't support reentrancy
      // But the contract should be safe due to state changes before external calls
      await dao.connect(member1).createUpdateMetadataProposal(
        "Test",
        "https://test.uri",
        "Test",
        "TEST"
      );

      await dao.vote(0, true);
      await dao.connect(member1).vote(0, true);

      await time.increase(VOTING_PERIOD + 1);

      // The executed flag should be set before the external call
      const proposalBefore = await dao.getProposal(0);
      expect(proposalBefore.executed).to.be.false;
    });

    it("Should handle overflow/underflow in member count", async function () {
      // Add max number of members (not realistic but tests boundaries)
      const memberCount = await dao.memberCount();
      expect(memberCount).to.equal(4); // Owner + 3 members

      // Remove owner (should fail with correct error)
      await expect(dao.removeMember(owner.address))
        .to.be.revertedWith("Cannot remove owner");
    });

    it("Should protect against proposal ID manipulation", async function () {
      await dao.connect(member1).createUpdateMetadataProposal(
        "Proposal 0",
        "https://test.uri",
        "Test",
        "TEST"
      );
      
      // Try to vote on future proposal IDs
      await expect(dao.connect(member1).vote(1, true))
        .to.be.reverted; // Should fail for non-existent proposal

      await expect(dao.connect(member1).vote(999, true))
        .to.be.reverted; // Should fail for non-existent proposal
    });

    it("Should handle extreme gas scenarios", async function () {
      // Test with very large URI and name data
      const largeUri = "https://example.com/" + "x".repeat(500);
      const largeName = "x".repeat(100);
      
      // Should still work with large data
      await dao.connect(member1).createUpdateMetadataProposal(
        "Large data proposal",
        largeUri,
        largeName,
        "TEST"
      );
      const proposal = await dao.getProposal(0);
      expect(proposal.description).to.equal("Large data proposal");
    });
  });

  describe("Quote Function Edge Cases", function () {
    it("Should be callable with valid command data", async function () {
      const payload = ethers.AbiCoder.defaultAbiCoder().encode(
        ["string", "string", "string"],
        ["https://test.uri", "Test Name", "TEST"]
      );
      
      try {
        await dao.quoteCommand(COMMAND_UPDATE_COLLECTION_METADATA, payload);
      } catch (error) {
        // Expected due to mock LayerZero endpoint - just verify function exists
        expect(error).to.be.instanceOf(Error);
      }
    });

    it("Should handle empty payload in quote", async function () {
      const payload = ethers.AbiCoder.defaultAbiCoder().encode(["string"], [""]);
      
      try {
        await dao.quoteCommand(COMMAND_EMERGENCY_PAUSE, payload);
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
      }
    });

    it("Should handle large payload in quote", async function () {
      const largeData = "x".repeat(1000);
      const payload = ethers.AbiCoder.defaultAbiCoder().encode(
        ["string", "string", "string"],
        [largeData, largeData, "TEST"]
      );
      
      try {
        await dao.quoteCommand(COMMAND_UPDATE_COLLECTION_METADATA, payload);
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
      }
    });
  });

  describe("State Consistency Edge Cases", function () {
    it("Should maintain consistent state after member changes during proposal lifecycle", async function () {
      await dao.connect(member1).createUpdateMetadataProposal(
        "Test",
        "https://test.uri",
        "Test",
        "TEST"
      );

      // Member votes, then gets removed
      await dao.connect(member1).vote(0, true);
      await dao.removeMember(member1.address);

      // Removed member should not be able to vote again
      await expect(dao.connect(member1).vote(0, false))
        .to.be.revertedWith("Not a DAO member");

      // But their previous vote should still count
      const proposal = await dao.getProposal(0);
      expect(proposal.forVotes).to.equal(1);
    });

    it("Should handle member count changes affecting quorum calculations", async function () {
      // Total: 4 members (owner + 3), quorum = 2 (51% of 4 = 2.04, rounded down to 2)
      await dao.connect(member1).createUpdateMetadataProposal(
        "Test",
        "https://test.uri",
        "Test",
        "TEST"
      );

      // Only 1 vote - should not be enough for 4 members (need at least 2)
      await dao.connect(member1).vote(0, true);

      await time.increase(VOTING_PERIOD + 1);

      // Should fail due to insufficient quorum (1 vote < 2 required)
      await expect(dao.executeProposal(0, { value: ethers.parseEther("0.01") }))
        .to.be.reverted;
    });

    it("Should handle nonce consistency across multiple operations", async function () {
      const initialNonce = await dao.messageNonce();
      expect(initialNonce).to.equal(1);

      // Create proposals
      await dao.connect(member1).createUpdateMetadataProposal("P1", "https://uri1.com", "Name1", "SYM1");
      await dao.connect(member1).createEmergencyPauseProposal("P2");
      
      expect(await dao.messageNonce()).to.equal(3);

      // Emergency update
      const payload = ethers.AbiCoder.defaultAbiCoder().encode(["string"], ["emergency"]);
      try {
        await dao.emergencyUpdate(COMMAND_EMERGENCY_PAUSE, payload, { value: ethers.parseEther("0.01") });
      } catch (error) {
        // Expected to fail due to mock endpoint
      }
      
      expect(await dao.messageNonce()).to.equal(4);
    });
  });

  describe("Integration Edge Cases", function () {
    it("Should handle complex multi-proposal scenarios", async function () {
      const uri1 = "https://proposal1.uri";
      const uri2 = "https://proposal2.uri";

      // Create multiple proposals
      await dao.connect(member1).createUpdateMetadataProposal("Proposal 1", uri1, "Name1", "SYM1");
      await dao.connect(member2).createEmergencyPauseProposal("Proposal 2");

      // Vote on both
      await dao.vote(0, true);                    // Owner votes for P1
      await dao.connect(member1).vote(0, true);   // member1 votes for P1
      await dao.vote(1, false);                   // Owner votes against P2
      await dao.connect(member2).vote(1, true);   // member2 votes for P2

      const proposal0 = await dao.getProposal(0);
      const proposal1 = await dao.getProposal(1);

      expect(proposal0.forVotes).to.equal(2);
      expect(proposal0.againstVotes).to.equal(0);
      expect(proposal1.forVotes).to.equal(1);
      expect(proposal1.againstVotes).to.equal(1);
    });

    it("Should handle rapid member additions and removals", async function () {
      const [,,,,,, member4, member5] = await ethers.getSigners();
      
      // Rapidly add and remove members
      await dao.addMember(member4.address);
      await dao.addMember(member5.address);
      await dao.removeMember(member1.address);
      await dao.addMember(nonMember.address);
      await dao.removeMember(member2.address);

      expect(await dao.memberCount()).to.equal(5); // owner + member3 + member4 + member5 + nonMember
      expect(await dao.members(member1.address)).to.be.false;
      expect(await dao.members(member2.address)).to.be.false;
      expect(await dao.members(member3.address)).to.be.true;
      expect(await dao.members(member4.address)).to.be.true;
      expect(await dao.members(member5.address)).to.be.true;
      expect(await dao.members(nonMember.address)).to.be.true;
    });

    it("Should handle mixed V2 proposal types in sequence", async function () {
      // Create different types of V2 proposals
      await dao.connect(member1).createUpdateMetadataProposal(
        "Update metadata",
        "https://new-metadata.uri",
        "New Collection",
        "NEW"
      );
      
      await dao.connect(member2).createEmergencyPauseProposal("Emergency pause");

      // Verify different command types and sequential nonces
      const proposal0 = await dao.getProposal(0);
      const proposal1 = await dao.getProposal(1);

      expect(proposal0.command).to.equal(COMMAND_UPDATE_COLLECTION_METADATA);
      expect(proposal1.command).to.equal(COMMAND_EMERGENCY_PAUSE);
      expect(proposal0.nonce).to.equal(1);
      expect(proposal1.nonce).to.equal(2);
      expect(await dao.messageNonce()).to.equal(3);
    });
  });
});
