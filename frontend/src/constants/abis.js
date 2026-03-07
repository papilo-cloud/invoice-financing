// InvoiceNFT ABI
export const INVOICE_NFT_ABI = [
  // Read Functions
  "function invoices(uint256) external view returns (address issuer, string debtorName, uint256 faceValue, uint256 dueDate, uint256 riskScore, bool isPaid, bool isVerified, uint256 createdAt)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function tokenURI(uint256 tokenId) external view returns (string)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function isVerified(uint256 tokenId) external view returns (bool)",
  "function verifier() external view returns (address)",
  "function getInvoice(uint256 tokenId) view returns (tuple(address issuer, string debtorName, uint256 faceValue, uint256 dueDate, uint256 riskScore, bool isPaid, bool isVerified, uint256 createdAt))",
  "function owner() external view returns (address)",
  "function getInvoicesByOwner(address owner) external view returns (uint256[] memory tokenIds)",
  
  // Write Functions
  "function createInvoice(string debtorName, uint256 faceValue, uint256 dueDate) external returns (uint256)",
  'function setVerificationResult(uint256 tokenId, uint256 riskScore, bool success) external',
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
  'function getVerification(uint256 tokenId) external view returns (uint256 riskScore, bool isVerified, uint256 verifiedAt)',
  'function isVerified(uint256 tokenId) external view returns (bool)',
  'function getVerificationStatus(uint256 tokenId) external view returns (uint8 status, uint256 riskScore)',
  'function getForwarderAddress() external view returns (address)',
  'function getExpectedWorkflowId() external view returns (bytes32)',
  'function getExpectedAuthor() external view returns (address)',
  'function getExpectedWorkflowName() external view returns (bytes10)',
  'function verifications(uint256) external view returns (uint256 riskScore, bool isVerified, uint256 verifiedAt)',
  
  // Write Functions
  'function manualVerify(uint256 tokenId, uint256 riskScore) external',
  'function batchManualVerify(uint256[] tokenIds, uint256[] riskScores) external',
  'function setForwarderAddress(address _forwarder) external',
  'function setExpectedWorkflowId(bytes32 _id) external',
  'function setExpectedAuthor(address _author) external',
  'function setExpectedWorkflowName(string _name) external',
  
  // Events
  'event VerificationReceived(uint256 indexed tokenId, uint256 riskScore, bool success, uint256 timestamp)',
  'event VerificationFailed(uint256 indexed tokenId, string reason)',
  'event ManualVerification(uint256 indexed tokenId, uint256 riskScore, address indexed verifier)',
  'event ForwarderAddressUpdated(address indexed previousForwarder, address indexed newForwarder)',
  'event ExpectedAuthorUpdated(address indexed previousAuthor, address indexed newAuthor)',
  'event ExpectedWorkflowNameUpdated(bytes10 indexed previousName, bytes10 indexed newName)',
  'event ExpectedWorkflowIdUpdated(bytes32 indexed previousId, bytes32 indexed newId)',
  'event SecurityWarning(string message)',
];

// InvoiceFractionalizationPool ABI
export const FRACTIONALIZATION_ABI = [
  // Read Functions
  "function fractions(uint256) external view returns (uint256 invoiceTokenId, uint256 totalFractions, uint256 fractionsSold, uint256 pricePerFraction, bool isActive, uint256 createdAt)",
  "function balanceOf(address account, uint256 id) external view returns (uint256)",
  "function nextFractionId() external view returns (uint256)",
  "function pendingProceeds(address) external view returns (uint256)",
  "function buyoutInfo(uint256) external view returns (address buyer, uint256 buyoutPrice, uint256 deadline, bool isActive)",
  "function buyouts(uint256 id) external view returns (tuple(address buyer, uint256 pricePerFraction, uint256 remainingFractions, uint256 escrowedAmount, bool active, bool finalized))",
  "function getFractionInfo(uint256) external view returns (uint256 invoiceTokenId,uint256 totalFractions,uint256 fractionsSold,uint256 pricePerFraction,address issuer, bool isActive)",
  "function buyoutPremium() external view returns (uint256)",
  "function owner() external view returns (address)",
  "function getFractionIdByInvoice(uint256 invoiceTokenId) external view returns (uint256)",
  "function isFractionalized(uint256 invoiceTokenId) external view returns (bool)",
  "function platformFees() external view returns (uint256)",
  'function holderBalance(address holder, uint256 fractionId) external view returns (uint256)',
  'function getHolderFractions(address holder, uint256 maxFractionId) external view returns (uint256[] memory fractionIds)',
  'function getBuyoutInfo(uint256 fractionId) external view returns (tuple(address buyer, uint256 pricePerFraction, uint256 remainingFractions, uint256 escrowedAmount, bool active, bool finalized))',
  'function getDetailedFractionInfo(uint256 fractionId) external view returns (uint256 invoiceTokenId, uint256 totalFractions, uint256 fractionsSold, uint256 pricePerFraction, address issuer, bool isActive, uint256 issuerProceeds)',
  'function getBuyoutPrice(uint256 fractionId) external view returns (uint256)',
  'function getNextFractionId() external view returns (uint256)',
  'function getAvailableFractions(uint256 fractionId) external view returns (uint256)',
  'function hasClaimed(uint256 fractionId, address holder) external view returns (bool)',


  
  // Write Functions
  "function fractionalizeInvoice(uint256 invoiceTokenId, uint256 totalFractions, uint256 pricePerFraction) external returns (uint256)",
  "function buyFractions(uint256 fractionId, uint256 amount) external payable",
  "function withdrawProceeds() external",
  "function initiateBuyout(uint256 fractionId) external payable",
  "function claimBuyoutPayment(uint256 fractionId) external",
  "function finalizeBuyout(uint256 fractionId) external",
  "function setApprovalForAll(address operator, bool approved) external",
  "function pendingWithdrawals(address) public view returns (uint256)",
  "function redeemAfterPayment(uint256 fractionId) external",
  "function emergencyRelease(uint256 fractionId, address recipient) external",
  "function totalSupply(uint256 fractionId) external view returns (uint256)",
  "function withdrawPlatformFees() external",
  'function reclaimInvoice(uint256 fractionId) external',
  
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
  "function claimable(address user, uint256 invoiceTokenId) external view returns (uint256)",
  'function paymentAmounts(uint256 invoiceTokenId) external view returns (uint256)',
  "function invoiceNFT() external view returns (address)",
  "function fractionalizationPool() external view returns (address)",
  'function hasUserClaimed(address user, uint256 invoiceTokenId) external view returns (bool)',
  'function getDistributionDetails(uint256 invoiceTokenId) external view returns (tuple(uint256 totalPayment, uint256 paymentPerFraction, uint256 totalFractions, uint256 fractionsSold, bool isPaid))',
  
  // Write Functions
  "function receivePayment(uint256 invoiceTokenId) external payable",
  "function claim(uint256 invoiceTokenId) external",
  'function claimIssuerReturns(uint256 invoiceTokenId) external',
  
  // Events
  "event PaymentReceived(uint256 indexed invoiceTokenId, address indexed payer, uint256 amount)",
  "event Claimed(uint256 indexed invoiceTokenId, address indexed user, uint256 amount)",
  'event IssuerClaimedReturns(uint256 indexed invoiceTokenId, address indexed issuer, uint256 amount, uint256 unsoldFractions)',
];