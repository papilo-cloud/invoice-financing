// src/abis/InvoiceVerifier.ts
import { parseAbi } from "viem"

export const InvoiceVerifierABI = parseAbi([
  "function getVerification(uint256 tokenId) external view returns (uint256 riskScore, bool isVerified, uint256 verifiedAt)",
  "function isVerified(uint256 tokenId) external view returns (bool)",
  "function getVerificationStatus(uint256 tokenId) external view returns (uint8 status, uint256 riskScore)",
  "function getForwarderAddress() external view returns (address)",
  "function getExpectedWorkflowId() external view returns (bytes32)",
  "function getExpectedAuthor() external view returns (address)",
  "function getExpectedWorkflowName() external view returns (bytes10)",
  "function verifications(uint256) external view returns (uint256 riskScore, bool isVerified, uint256 verifiedAt)",
  "function manualVerify(uint256 tokenId, uint256 riskScore) external",
  "function batchManualVerify(uint256[] tokenIds, uint256[] riskScores) external",

 
  "event VerificationReceived(uint256 indexed tokenId, uint256 riskScore, bool success, uint256 timestamp)",
  "event VerificationFailed(uint256 indexed tokenId, string reason)",
  "event ManualVerification(uint256 indexed tokenId, uint256 riskScore, address indexed verifier)",
] as const)