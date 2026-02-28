// InvoiceNFT ABI
export const INVOICE_NFT_ABI = [
  // Read Functions
  "function invoices(uint256) external view returns (address issuer, string debtorName, uint256 faceValue, uint256 dueDate, uint256 riskScore, bool isPaid, bool isVerified, uint256 createdAt)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function tokenURI(uint256 tokenId) external view returns (string)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function isVerified(uint256 tokenId) external view returns (bool)",
  "function verifier() external view returns (address)",
  "function paymentDistributor() external view returns (address)",
  "function getInvoice(uint256 tokenId) view returns (tuple(address issuer, string debtorName, uint256 faceValue, uint256 dueDate, uint256 riskScore, bool isPaid, bool isVerified, uint256 createdAt))",
  
  // Write Functions
  "function createInvoice(string debtorName, uint256 faceValue, uint256 dueDate) external returns (uint256)",
  "function approve(address to, uint256 tokenId) external",
  "function setApprovalForAll(address operator, bool approved) external",
  "function markVerified(uint256 tokenId, uint256 riskScore) external",
  "function markAsPaid(uint256 tokenId) external",
  
  // Events
  "event InvoiceCreated(uint256 indexed tokenId, address indexed issuer, string debtorName, uint256 faceValue, uint256 dueDate)",
  "event InvoiceVerified(uint256 indexed tokenId, uint256 riskScore)",
  "event InvoicePaid(uint256 indexed tokenId, uint256 amount)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
];

// InvoiceVerifier ABI
export const VERIFIER_ABI = [
  // Read Functions
  "function verificationSource() external view returns (string)",
  "function subscriptionId() external view returns (uint64)",
  "function donId() external view returns (bytes32)",
  "function invoiceNFT() external view returns (address)",
  "function owner() external view returns (address)",
  
  // Write Functions
  "function requestVerification(uint256 invoiceId) external returns (bytes32)",
  "function manualVerify(uint256 invoiceId, uint256 riskScore) external",
  "function setVerificationSource(string source) external",
  "function updateConfig(bytes32 _donId, uint64 _subscriptionId, uint32 _callbackGasLimit) external",
  
  // Events
  "event VerificationRequested(bytes32 indexed requestId, uint256 indexed invoiceId)",
  "event VerificationFulfilled(uint256 indexed invoiceId, uint256 riskScore, bool success)",
  "event VerificationFailed(uint256 indexed invoiceId, bytes32 requestId, string reason)",
];

// InvoiceFractionalizationPool ABI
export const FRACTIONALIZATION_ABI = [
  // Read Functions
  "function fractions(uint256) external view returns (uint256 invoiceTokenId, uint256 totalFractions, uint256 fractionsSold, uint256 pricePerFraction, bool isActive, uint256 createdAt)",
  "function balanceOf(address account, uint256 id) external view returns (uint256)",
  "function nextFractionId() external view returns (uint256)",
  "function pendingProceeds(address) external view returns (uint256)",
  "function buyoutInfo(uint256) external view returns (address buyer, uint256 buyoutPrice, uint256 deadline, bool isActive)",
  "function getFractionInfo(uint256) external view returns (uint256 invoiceTokenId,uint256 totalFractions,uint256 fractionsSold,uint256 pricePerFraction,address issuer, bool isActive)",
  
  // Write Functions
  "function fractionalizeInvoice(uint256 invoiceTokenId, uint256 totalFractions, uint256 pricePerFraction) external returns (uint256)",
  "function buyFractions(uint256 fractionId, uint256 amount) external payable",
  "function withdrawProceeds() external",
  "function initiateBuyout(uint256 fractionId) external payable",
  "function claimBuyoutPayment(uint256 fractionId) external",
  "function finalizeBuyout(uint256 fractionId) external",
  "function setApprovalForAll(address operator, bool approved) external",
  "function pendingWithdrawals(address) public view returns (uint256)",
  
  // Events
  "event InvoiceFramentalized(uint256 indexed fractionId, uint256 indexed invoiceTokenId, uint256 totalFractions, uint256 pricePerFraction)",
  "event FractionsPurchased(uint256 indexed fractionId, address indexed buyer, uint256 amount, uint256 totalCost)",
  "event ProceedsWithdrawn(address indexed recipient, uint256 amount)",
  "event BuyoutInitiated(uint256 indexed fractionId, address indexed buyer, uint256 buyoutPrice)",
  "event BuyoutFinalized(uint256 indexed fractionId, address indexed buyer)",
];

// PaymentDistributor ABI
export const DISTRIBUTOR_ABI = [
  // Read Functions
  "function claimableAmount(uint256 invoiceTokenId, address holder) external view returns (uint256)",
  "function totalPaid(uint256 invoiceTokenId) external view returns (uint256)",
  "function invoiceNFT() external view returns (address)",
  "function fractionalizationPool() external view returns (address)",
  
  // Write Functions
  "function receivePayment(uint256 invoiceTokenId) external payable",
  "function claim(uint256 invoiceTokenId) external",
  
  // Events
  "event PaymentReceived(uint256 indexed invoiceTokenId, address indexed payer, uint256 amount)",
  "event PayoutClaimed(uint256 indexed invoiceTokenId, address indexed holder, uint256 amount)",
];