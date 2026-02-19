// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ERC1155Supply} from "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import {InvoiceNFT} from "./InvoiceNFT.sol";

contract InvoiceFractionalizationPool is ERC1155Supply, Ownable, ReentrancyGuard {
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
    error FractionsAlreadySold(string message);
    error NoFractionsSold(string message);
    error InsufficientPayment(uint256 required, uint256 provided);
    error CooldownPeriodActive(uint256 timeRemaining);
    error InvalidAmount(uint256 amount);
    error PlatformFeeTransferFailed();
    error IssuerProceedsTransferFailed();
    error RefundFailed();
    error InvoiceDelayedRedemption(uint256 invoiceId, string message);
    error BuyoutPaymentFailed();
    error InvalidRecipient();
    error InvoiceNotPaid(uint256 invoiceId);
    error BuyoutAlreadyActive(uint256 fractionId);
    error BuyoutNotActive(uint256 fractionId);
    error AlreadyClaimedBuyoutPayment(uint256 fractionId, address holder);
    error NotBuyoutBuyer(address caller, address buyer);
    error FractionsRemaining(uint256 remaining, string message);
    error BuyoutAlreadyFinalized(uint256 fractionId);
    error WithdrawFailed();

    InvoiceNFT public invoiceNFT;
    address public platformFeeRecipient;
    address public paymentDistributor;

    struct FractionalInvoice {
        uint256 invoiceTokenId;
        uint256 totalFractions;
        uint256 pricePerFraction;
        uint256 fractionsSold;
        address issuer;
        bool isActive;
        uint256 fractionalizedAt;    // NEW: Timestamp when fractionalized
    }

    struct Buyout {
        address buyer;
        uint256 pricePerFraction;
        uint256 remainingFractions;
        uint256 escrowedAmount;
        bool active;
        bool finalized;
    }

    mapping(uint256 => FractionalInvoice) public fractionalInvoices; // tokenId => FractionalInvoice
    mapping(uint256 => uint256) public invoiceToFractionId; // invoiceTokenId => fractionalTokenId
    mapping(address => uint256) public pendingWithdrawals;

    mapping(uint256 => Buyout) public buyouts; // fractionId => Buyout details
    mapping(uint256 => mapping(address => bool)) public hasClaimedBuyout;

    uint256 private _fractionalTokenIdCounter = 1;

    uint256 public coolDownPeriod = 5 minutes; // Cool-down period for redemption
    uint256 public buyoutPremium = 110; // 10% premium for buyouts
    uint256 public platformFees;

    event InvoiceFractionalized(uint256 indexed invoiceId, uint256 indexed fractionId, uint256 totalFractions);
    event FractionPurchased(uint256 indexed fractionId, address indexed buyer, uint256 amount, uint256 cost);
    event InvoiceRedeemed(uint256 indexed invoiceId, uint256 indexed fractionId, address indexed redeemer);
    event FractionalInvoiceDeactivated(uint256 indexed fractionId);

    event ProceedsAdded(address indexed issuer, uint256 amount);
    event ProceedsWithdrawn(address indexed issuer, uint256 amount);
    event InvoiceReclaimed(
        uint256 indexed fractionId,
        uint256 indexed invoiceTokenId,
        address indexed issuer
    );
    event InvoiceBoughtOut(
        uint256 indexed fractionId,
        uint256 indexed invoiceTokenId,
        address indexed buyer,
        uint256 totalCost
    );
    event BuyoutPayment(
        uint256 indexed fractionId,
        address indexed holder,
        uint256 amount
    );
    event EmergencyRelease(
        uint256 indexed fractionId,
        uint256 indexed invoiceTokenId,
        address indexed recipient
    );
    event DistributorUpdated(address indexed newDistributor);

    modifier onlyDistributor() {
        require(msg.sender == paymentDistributor, "Not distributor");
        _;
    }

    constructor(address _invoiceNFT) ERC1155("") Ownable(msg.sender) {
        invoiceNFT = InvoiceNFT(_invoiceNFT);
        platformFeeRecipient = msg.sender;
    }

    /**
     * @dev Sets the payment distributor address.
     * @param _distributor The address of the payment distributor.
     */
    function setPaymentDistributor(address _distributor)
        external
        onlyOwner
    {
        require(_distributor != address(0), "Invalid address");
        paymentDistributor = _distributor;
        emit DistributorUpdated(_distributor);
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
    ) external nonReentrant returns (uint256) {

        (, , , uint256 dueDate,, bool isPaid, bool isVerified, ) = invoiceNFT.invoices(invoiceTokenId);


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
        if (invoiceToFractionId[invoiceTokenId] != 0) {
            revert InvoiceAlreadyFractionalized(invoiceTokenId);
        }

        if (totalFractions == 0 || totalFractions > 1000) {
            revert InvalidFractionCount(totalFractions);
        }

        if (pricePerFraction == 0) {
            revert InvalidPrice(pricePerFraction);
        }



        // Transfer the invoice NFT to the pool contract (escrow)
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

        invoiceToFractionId[invoiceTokenId] = fractionId;

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

        if (amount == 0) {
            revert InvalidAmount(amount);
        }

        uint256 availableFractions = fr.totalFractions - fr.fractionsSold;
        if (amount > availableFractions) {
            revert InsufficientFractionsAvailable(amount, availableFractions);
        }

        // Check invoice is still valid (not expired or paid) before allowing purchase
        (,,,uint256 dueDate,,bool isPaid,,) = invoiceNFT.invoices(fr.invoiceTokenId);
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

        _mint(msg.sender, fractionId, amount, "");

        uint256 platformFee = (cost * 25) / 1000; // 2.5% platform fee
        uint256 issuerProceeds = cost - platformFee;
        pendingWithdrawals[fr.issuer] += issuerProceeds;
        platformFees += platformFee;

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

    /**
     * @notice Withdraw proceeds for sold fractions
     * @dev Pull model - isseur decides when to collect proceeds
     */
    function withdrawProceeds() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        if (amount == 0) {
            revert InvalidAmount(0);
        }

        pendingWithdrawals[msg.sender] = 0;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) {
            revert WithdrawFailed();
        }

        emit ProceedsWithdrawn(msg.sender, amount);
    }

    /**
     * @notice Reclaim an invoice that was fractionalized
     * @param fractionId The ID of the fractional invoice to reclaim.
     * @dev Only the issuer can reclaim an invoice, and only if no fractions have been sold.
            This allows issuers to "undo" fractionalization if they change their mind or 
            made a mistake, without needing to wait for the invoice to expire.
     */
    function reclaimInvoice(uint256 fractionId) external nonReentrant {
        FractionalInvoice storage fr = fractionalInvoices[fractionId];

        if (msg.sender != fr.issuer) {
            revert NotInvoiceOwner(msg.sender, fr.issuer);
        }

        if (!fr.isActive) {
            revert FractionalInvoiceNotActive(fractionId);
        }

        if (fr.fractionsSold > 0) {
            revert FractionsAlreadySold("Cannot reclaim invoice with sold fractions, use buyout instead");
        }

        fr.isActive = false;
        delete invoiceToFractionId[fr.invoiceTokenId];


        invoiceNFT.transferFrom(address(this), msg.sender, fr.invoiceTokenId);

        emit InvoiceReclaimed(fractionId, fr.invoiceTokenId, msg.sender);
    }

    // ────────────────────────────────────────────
    // 3 MAIN FUNCTIONS FOR BUYOUT FLOW
    // ─────────────────────────────────────────────
    /**
     * @notice 1) initiateBuyout - buyer initiates buyout by paying total cost (including premium)
     * @param fractionId The ID of the fractional invoice to buyout
     */
    function initiateBuyout(uint256 fractionId) external payable nonReentrant {
        FractionalInvoice storage fr = fractionalInvoices[fractionId];
        Buyout storage buyout = buyouts[fractionId];

        if (!fr.isActive) {
            revert FractionalInvoiceNotActive(fractionId);
        }
        if (fr.fractionsSold == 0) {
            revert NoFractionsSold("Cannot buyout invoice with no sold fractions, use reclaim instead");
        }

        (,,,uint256 dueDate,,bool isPaid,,) = invoiceNFT.invoices(fr.invoiceTokenId);
        if (block.timestamp >= dueDate) {
            revert InvoiceExpired(fr.invoiceTokenId, dueDate);
        }
        if (isPaid) {
            revert InvoiceAlreadyPaid(fr.invoiceTokenId);
        }

        if (buyout.active) {
            revert BuyoutAlreadyActive(fractionId);
        }

        uint256 premiumPricePerFraction = fr.pricePerFraction * buyoutPremium / 100;
        uint256 circulatingSupply = totalSupply(fractionId);
        uint256 totalCost = circulatingSupply * premiumPricePerFraction;
        if (msg.value < totalCost) {
            revert InsufficientPayment(totalCost, msg.value);
        }

        fr.isActive = false;

        buyout.buyer = msg.sender;
        buyout.pricePerFraction = premiumPricePerFraction;
        buyout.remainingFractions = circulatingSupply;
        buyout.escrowedAmount = totalCost;
        buyout.active = true;
        buyout.finalized = false;

         // Refund any excess payment
        if (msg.value > totalCost) {
            (bool refundSuccess, ) = payable(msg.sender).call{value: msg.value - totalCost}("");
            if (!refundSuccess) {
                revert RefundFailed();
            }
        }

        emit InvoiceBoughtOut(fractionId, fr.invoiceTokenId, msg.sender, totalCost);
    }

    /**
     * @notice 2) claimBuyoutPayment - fraction holders claim payment from buyout
     * @param fractionId The ID of the fractional invoice being bought out
     */
    function claimBuyoutPayment(uint256 fractionId) external nonReentrant {
        Buyout storage buyout = buyouts[fractionId];

        if (!buyout.active) {
            revert BuyoutNotActive(fractionId);
        }
        if (hasClaimedBuyout[fractionId][msg.sender]) {
            revert AlreadyClaimedBuyoutPayment(fractionId, msg.sender);
        }

        uint256 holderBalance = balanceOf(msg.sender, fractionId);
        if (holderBalance == 0) {
            revert InsufficientFractionsAvailable(0, 0);
        }

        uint256 paymentAmount = holderBalance * buyout.pricePerFraction;
        hasClaimedBuyout[fractionId][msg.sender] = true;

        if (paymentAmount > buyout.escrowedAmount) {
            revert BuyoutPaymentFailed();
        }

        if (paymentAmount == 0) {
            revert BuyoutPaymentFailed();
        }

        _burn(msg.sender, fractionId, holderBalance);

        buyout.remainingFractions -= holderBalance;
        buyout.escrowedAmount -= paymentAmount;

        (bool success, ) = payable(msg.sender).call{value: paymentAmount}("");
        if (!success) {
            revert BuyoutPaymentFailed();
        }

        emit BuyoutPayment(fractionId, msg.sender, paymentAmount);
    }

    /**
    * @notice 3) finalizeBuyout - after all fractions claimed, transfer invoice to buyer
    * @param fractionId The ID of the fractional invoice being bought out
    */
    function finalizeBuyout(uint256 fractionId) external nonReentrant {
        Buyout storage buyout = buyouts[fractionId];
        FractionalInvoice storage fr = fractionalInvoices[fractionId];

        if (!buyout.active) {
            revert BuyoutNotActive(fractionId);
        }
        if (msg.sender != buyout.buyer) {
            revert NotBuyoutBuyer(msg.sender, buyout.buyer);
        }
        if (buyout.remainingFractions > 0) {
            revert FractionsRemaining(buyout.remainingFractions, "Cannot finalize buyout until all fractions are claimed");
        }
        if (buyout.finalized) {
            revert BuyoutAlreadyFinalized(fractionId);
        }

        buyout.active = false;
        buyout.finalized = true;

        delete invoiceToFractionId[fr.invoiceTokenId];

        invoiceNFT.transferFrom(address(this), buyout.buyer, fr.invoiceTokenId);
    }

    /**
     * @notice Issuer redeems NFT back after invoice has been paid
     * @param fractionId The fractionalization to close
     * @dev Called after PaymentDistributor completes distribution
     */
    function redeemAfterPayment(uint256 fractionId) external nonReentrant {
        FractionalInvoice storage fr = fractionalInvoices[fractionId];

        if (fr.issuer != msg.sender) {
            revert NotInvoiceOwner(msg.sender, fr.issuer);
        }

        (,,,,, bool isPaid,,) = invoiceNFT.invoices(fr.invoiceTokenId);
        if (!isPaid) {
            revert InvoiceNotPaid(fr.invoiceTokenId);
        }

        if (totalSupply(fractionId) > 0) {
            revert FractionsRemaining(totalSupply(fractionId), "Cannot redeem invoice until all fractions are bought back or claimed in buyout");
        }

        fr.isActive = false;
        delete invoiceToFractionId[fr.invoiceTokenId];

        // Return NFT to issuer as paid record / trophy
        invoiceNFT.transferFrom(address(this), msg.sender, fr.invoiceTokenId);

        emit InvoiceRedeemed(fr.invoiceTokenId, fractionId, msg.sender);
    }

    /**
     * @notice Emergency release of an invoice back to the issuer
     * @param fractionId The fractionalization to release
     * @param recipient The address to send the invoice back to
     */
    function emergencyRelease(uint256 fractionId, address recipient) external onlyOwner nonReentrant {
        FractionalInvoice storage fr = fractionalInvoices[fractionId];

        if (recipient == address(0)) {
            revert InvalidRecipient();
        }

        (,,,uint256 dueDate,,,,) = invoiceNFT.invoices(fr.invoiceTokenId); // Just to check if invoice exists
        if (block.timestamp < dueDate + 30 days) { // Allow emergency release only after invoice is significantly overdue
            revert InvoiceDelayedRedemption(fr.invoiceTokenId, "Cannot release invoice before due date");
        }

        if (totalSupply(fractionId) > 0) {
            revert FractionsRemaining(totalSupply(fractionId), "Cannot release invoice until all fractions are bought back or claimed in buyout");
        }

        fr.isActive = false;
        delete invoiceToFractionId[fr.invoiceTokenId];
        
        invoiceNFT.transferFrom(address(this), recipient, fr.invoiceTokenId);

        emit EmergencyRelease(fractionId, fr.invoiceTokenId, recipient);
    }

    /**
     * @notice Withdraw platform fees to the designated recipient
     * @dev Only the owner can call this function
     */
    function withdrawPlatformFees() external onlyOwner nonReentrant {
        uint256 amount = platformFees;
        if (amount == 0) {
            revert InvalidAmount(0);
        }

        platformFees = 0;

        (bool success, ) = payable(platformFeeRecipient).call{value: amount}("");
        if (!success) {
            revert PlatformFeeTransferFailed();
        }
    }

    function burnOnRepayment(uint256 fractionId, address holder, uint256 amount) external onlyDistributor {
         if (amount == 0) {
            revert InvalidAmount(amount);
        }

        _burn(holder, fractionId, amount);
    }

    function updateCooldownPeriod(uint256 newCooldown) external onlyOwner {
        coolDownPeriod = newCooldown;
    }

    function getFractionIdByInvoice(uint256 invoiceTokenId) external view returns (uint256) {
        return invoiceToFractionId[invoiceTokenId];
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
        );
    }

    /**
     * @notice How many fractions are still available to buy
     */
    function getAvailableFractions(uint256 fractionId) external view returns (uint256) {
        FractionalInvoice memory fr = fractionalInvoices[fractionId];
        return fr.totalFractions - fr.fractionsSold;
    }

    /**
     * Returns whether an invoice can be fractionalized.
     * @param invoiceTokenId The ID of the invoice to check.
     * @return canBeFractionalized Whether the invoice can be fractionalized.
     * @return reason A human-readable reason for the result.
     */
    function canFractionalize(uint256 invoiceTokenId) external view returns (
        bool canBeFractionalized,
        string memory reason
    ) {
        address owner = invoiceNFT.ownerOf(invoiceTokenId);
        if (owner == address(0)) {
            return (false, "Invoice does not exist");
        }

        (,,,uint256 dueDate,, bool isPaid, bool isVerified,) = invoiceNFT.invoices(invoiceTokenId);

        if (!isVerified) {
            return (false, "Invoice not verified");
        }
        if (block.timestamp >= dueDate) {
            return (false, "Invoice expired");
        }
        if (isPaid) {
            return (false, "Invoice already paid");
        }

        if (invoiceToFractionId[invoiceTokenId] != 0) {
            return (false, "Invoice already fractionalized");
        }

        return (true, "Invoice is eligible for fractionalization");
    }

    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override(ERC1155Supply) {
        super._update(from, to, ids, values);
    }
}