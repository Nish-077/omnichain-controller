const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Testing deployed contract...");
  
  const daoAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const provider = ethers.provider; // Use Hardhat's provider
  
  // Simple ABI for testing
  const abi = [
    "function proposalCount() public view returns (uint256)",
    "function memberCount() public view returns (uint256)",
    "function members(address) public view returns (bool)"
  ];
  
  const contract = new ethers.Contract(daoAddress, abi, provider);
  
  try {
    const proposalCount = await contract.proposalCount();
    console.log("✅ proposalCount():", Number(proposalCount));
    
    const memberCount = await contract.memberCount();
    console.log("✅ memberCount():", Number(memberCount));
    
    // Test if deployer is a member
    const deployer = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const isMember = await contract.members(deployer);
    console.log("✅ deployer is member:", isMember);
    
    console.log("🎉 Contract is working correctly!");
    
  } catch (error) {
    console.error("❌ Contract test failed:", error.message);
    
    // Try to get contract info
    const code = await provider.getCode(daoAddress);
    console.log("Contract bytecode length:", code.length);
    console.log("Contract exists:", code !== "0x");
  }
}

main().catch(console.error);
