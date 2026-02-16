// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "../InvoiceNFT.sol";

contract InvoiceFractionalizationPool is ERC1155, Ownable, ReentrancyGuard {
    error InvoiceNotVerified(uint256 invoiceId);
    error NotInvoiceOwner(address caller, address owner);
    error InvoiceNotApproved(uint256 invoiceId);
    error InvalidFractionCount(uint256 count);
    error InvalidPrice(uint256 price);
    error InvoiceAlreadyFractionalized(uint256 invoiceId);
    error InvoiceExpired(uint256 invoiceId, uint256 dueDate);
    error InvoiceAlreadyPaid(uint256 invoiceId);
    error FractionalInvoiceNotActive(uint256 fractionId);
    error InsufficientFractionsAvailable(uint256 requested, uint256 available);
    error InsufficientPayment(uint256 required, uint256 provided);
    error CooldownPeriodActive(uint256 timeRemaining);
    error InvalidAmount(uint256 amount);
    error PlatformFeeTransferFailed();
    error IssuerProceedsTransferFailed();
    error RefundFailed();

    InvoiceNFT public invoiceNFT;
    address public platformFeeRecipient;

    struct FractionalInvoice {
        uint256 invoiceTokenId;
        uint256 totalFractions;
        uint256 pricePerFraction;
        uint256 fractionsSold;
        address issuer;
        bool isActive;
        uint256 fractionalizedAt;    // NEW: Timestamp when fractionalized
    }

    mapping(uint256 => FractionalInvoice) public fractionalInvoices; // tokenId => FractionalInvoice
    mapping(uint256 => uint256) public invoiceToFractionalToken; // invoiceTokenId => fractionalTokenId
    uint256 private _fractionalTokenIdCounter;

    mapping(uint256 => mapping(address => uint256)) public investments; // fractionalTokenId => (investor => amount)
    mapping(uint256 => address[]) private _investors; // fractionalTokenId => total invested amount
    
    // Minimum time between fractionalization and redemption to prevent flash loan attacks
    uint256 public coolDownPeriod = 5 minutes; // Cool-down period for redemption

    event InvoiceFractionalized(uint256 indexed invoiceId, uint256 indexed fractionId, uint256 totalFractions);
    event FractionPurchased(uint256 indexed fractionId, address indexed buyer, uint256 amount, uint256 cost);
    event InvoiceRedeemed(uint256 indexed invoiceId, uint256 indexed fractionId, address indexed redeemer);
    event FractionalInvoiceDeactivated(uint256 indexed fractionId);

    constructor(address _invoiceNFT) ERC1155("") Ownable(msg.sender) {
        invoiceNFT = InvoiceNFT(_invoiceNFT);
        platformFeeRecipient = msg.sender;
    }

    /**
     * @dev Fractionalizes an invoice into a tradable fractions.
     * @param invoiceTokenId The ID of the invoice NFT to fractionalize.
     * @param totalFractions The total number of fractions to create.
     * @param pricePerFraction The price per fraction in wei.
     */
    function fractionalizeInvoice(
        uint256 invoiceTokenId,
        uint256 totalFractions,
        uint256 pricePerFraction
    ) external returns (uint256) {

        (, , , uint256 dueDate, bool isVerified, bool isPaid, ) = invoiceNFT.invoices(invoiceTokenId);


        if (invoiceNFT.ownerOf(invoiceTokenId) != msg.sender) {
            revert NotInvoiceOwner(msg.sender, invoiceNFT.ownerOf(invoiceTokenId));
        }
        if (!isVerified) {
            revert InvoiceNotVerified(invoiceTokenId);
        }
        
        if (block.timestamp >= dueDate) {
            revert InvoiceExpired(invoiceTokenId, dueDate);
        }

        if (isPaid) {
            revert InvoiceAlreadyPaid(invoiceTokenId);
        }

        // Check if the pool contract is approved to transfer the invoice NFT
        address approved = invoiceNFT.getApproved(invoiceTokenId);
        bool isApprovedForAll = invoiceNFT.isApprovedForAll(msg.sender, address(this));

        if (approved != address(this) && !isApprovedForAll) {
            revert InvoiceNotApproved(invoiceTokenId);
        }

        // Ensure the invoice hasn't already been fractionalized
        if (invoiceToFractionalToken[invoiceTokenId] != 0) {
            revert InvoiceAlreadyFractionalized(invoiceTokenId);
        }

        if (totalFractions == 0 || totalFractions > 1000) {
            revert InvalidFractionCount(totalFractions);
        }

        if (pricePerFraction == 0) {
            revert InvalidPrice(pricePerFraction);
        }



        // Transfer the invoice NFT to the pool contract
        invoiceNFT.transferFrom(msg.sender, address(this), invoiceTokenId);

        // Create the fractional invoice
        uint256 fractionId = _fractionalTokenIdCounter++;

        fractionalInvoices[fractionId] = FractionalInvoice({
            invoiceTokenId: invoiceTokenId,
            totalFractions: totalFractions,
            pricePerFraction: pricePerFraction,
            fractionsSold: 0,
            issuer: msg.sender,
            isActive: true,
            fractionalizedAt: block.timestamp // Set the timestamp when fractionalized
        });

        invoiceToFractionalToken[invoiceTokenId] = fractionId;

        emit InvoiceFractionalized(invoiceTokenId, fractionId, totalFractions);

        return fractionId;
    }

    /**
     * @dev Buys fractions of an invoice.
     * @param fractionId The ID of the fractional invoice.
     * @param amount The number of fractions to buy.
     */
    function buyFractions(uint256 fractionId, uint256 amount) external payable nonReentrant {
        FractionalInvoice storage fr = fractionalInvoices[fractionId];

        if (!fr.isActive) {
            revert FractionalInvoiceNotActive(fractionId);
        }

        // Enforce cool-down period to prevent flash loan attacks
        uint256 timeSinceFractionalized = block.timestamp - fr.fractionalizedAt;
        if (timeSinceFractionalized < coolDownPeriod) {
            uint256 timeRemaining = coolDownPeriod - timeSinceFractionalized;
            revert CooldownPeriodActive(timeRemaining);
        }

        if (amount <= 0) {
            revert InvalidAmount(amount);
        }

        uint256 availableFractions = fr.totalFractions - fr.fractionsSold;
        if (amount > availableFractions) {
            revert InsufficientFractionsAvailable(amount, availableFractions);
        }

        // Check invoice is still valid (not expired or paid) before allowing purchase
        (,,,uint256 dueDate,,,bool isPaid) = invoiceNFT.invoices(fr.invoiceTokenId);
        if (block.timestamp >= dueDate) {
            revert InvoiceExpired(fr.invoiceTokenId, dueDate);
        }
        if (isPaid) {
            revert InvoiceAlreadyPaid(fr.invoiceTokenId);
        }

        uint256 cost = amount * fr.pricePerFraction;
        if (msg.value < cost) {
            revert InsufficientPayment(cost, msg.value);
        }


        fr.fractionsSold += amount;

        // Track investors for potential refunds
        if (investments[fractionId][msg.sender] == amount) { // First time investing in this fraction
            _investors[fractionId].push(msg.sender);
        }
        investments[fractionId][msg.sender] += amount;

        _mint(msg.sender, fractionId, amount, "");

        uint256 platformFee = (cost * 25) / 1000; // 2.5% platform fee
        uint256 issuerProceeds = cost - platformFee;

        (bool success, ) = payable(platformFeeRecipient).call{value: platformFee}("");
        if (!success) {
            revert PlatformFeeTransferFailed();
        }

        (bool issuerSuccess, ) = payable(fr.issuer).call{value: issuerProceeds}("");
        if (!issuerSuccess) {
            revert IssuerProceedsTransferFailed();
        }

        // Refund any excess payment
        if (msg.value > cost) {
            (bool refundSuccess, ) = payable(msg.sender).call{value: msg.value - cost}("");
            if (!refundSuccess) {
                revert RefundFailed();
            }
        }

        emit FractionPurchased(fractionId, msg.sender, amount, cost);

        // If all fractions sold, deactivate the fractional invoice
        if (fr.fractionsSold == fr.totalFractions) {
            fr.isActive = false;
            emit FractionalInvoiceDeactivated(fractionId);
        }
    }

    function deactivateFractionalInvoice(uint256 fractionId) external onlyOwner {
        fractionalInvoices[fractionId].isActive = false;
            
        emit FractionalInvoiceDeactivated(fractionId);
    }

    function updateCooldownPeriod(uint256 newCooldown) external onlyOwner {
        coolDownPeriod = newCooldown;
    }

    function getInvestors(uint256 fractionId) external view returns (address[] memory) {
        return _investors[fractionId];
    }

    function getInvestments(uint256 fractionId, address investor) external view returns (uint256) {
        return investments[fractionId][investor];
    }

    function getFractionInfo(uint256 fractionId) external view 
    returns (
        uint256 invoiceTokenId,
        uint256 totalFractions,
        uint256 fractionsSold,
        uint256 pricePerFraction,
        address issuer,
        bool isActive
    ) {
        FractionalInvoice memory fr = fractionalInvoices[fractionId];
        return (
            fr.invoiceTokenId,
            fr.totalFractions,
            fr.fractionsSold,
            fr.pricePerFraction,
            fr.issuer,
            fr.isActive
        )
    }

    /**
     * Returns whether an invoice can be fractionalized.
     * @param invoiceTokenId The ID of the invoice to check.
     * @return canFractionalize Whether the invoice can be fractionalized.
     * @return reason A human-readable reason for the result.
     */
    function canFractionalize(uint256 invoiceTokenId) external view returns (
        bool canFractionalize,
        string memory reason
    ) {
        address owner = invoiceNFT.ownerOf(invoiceTokenId);
        if (owner == address(0)) {
            revert NotInvoiceOwner(msg.sender, address(0));
        }

        (,,,uint256 dueDate,, bool isVerified, bool isPaid,) = invoiceNFT.invoices(invoiceTokenId);

        if (!isVerified) {
            revert InvoiceNotVerified(invoiceTokenId);
        }
        if (block.timestamp >= dueDate) {
            revert InvoiceExpired(invoiceTokenId, dueDate);
        }
        if (isPaid) {
            revert InvoiceAlreadyPaid(invoiceTokenId);
        }

        return (true, "Invoice is eligible for fractionalization");
    }
}