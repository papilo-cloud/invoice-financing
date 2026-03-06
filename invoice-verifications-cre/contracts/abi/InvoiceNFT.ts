import { parseAbi } from "viem"

export const InvoiceNFT = parseAbi([
  "function invoices(uint256) view returns (address issuer, string debtorName, uint256 faceValue, uint256 dueDate, uint256 riskScore, bool isPaid, bool isVerified, uint256 createdAt)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  
  "event InvoiceCreated(uint256 indexed tokenId, address indexed issuer, string debtorName, uint256 faceValue, uint256 dueDate)",
  "event InvoiceVerified(uint256 indexed tokenId, uint256 riskScore, bool success)",
] as const)