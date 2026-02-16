// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {
    ReentrancyGuard
} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {InvoiceNFT} from "./InvoiceNFT.sol";
import {InvoiceFractionalizationPool} from "./InvoiceFractionalizationPool.sol";

contract PaymentDistributor is Ownable, ReentrancyGuard {
    InvoiceNFT public invoiceNFT;
    InvoiceFractionalizationPool public fractionalizationPool;

    // Payment distribution tracking
    mapping(uint256 => bool) public isDistributed;
    mapping(uint256 => uint256) public paymentAmounts;
    mapping(uint256 => uint256) public distributionTimestamps;

    // Distribution tracking per fraction holder
    mapping(uint256 => mapping(address => bool)) public hasClaimed;

    uint256 public constant DISTRIBUTION_GAS_LIMIT = 5000000; // Gas limit per transfer
    uint256 public minimumDistributionThreshold = 0.001 ether; // Minimum payment to accept

    event PaymentDistributed(
        uint256 indexed invoiceTokenId,
        uint256 totalAmount,
        uint256 recipients,
        uint256 timestamp
    );
    event PaymentReceived(
        uint256 indexed invoiceTokenId,
        uint256 totalAmount,
        address indexed payer,
        uint256 timestamp
    );
    event FractionPayment(
        uint256 indexed fractionId,
        address indexed investor,
        uint256 amount
    );
    event DistributionFailed(
        uint256 indexed invoiceTokenId,
        address indexed investor,
        uint256 amount,
        string reason
    );
    event MinimumDistributionThresholdUpdated(uint256 newThreshold);

    error InvoiceNotVerified(uint256 invoiceId);
    error InvoiceNotFractionalized(uint256 invoiceId);
    error InvoiceAlreadyPaid(uint256 invoiceId);
    error InvoiceNotPaid(uint256 invoiceId);
    error PaymentBelowThreshold(uint256 amount, uint256 threshold);
    error NoPaymentReceived(uint256 invoiceId);
    error AlreadyDistributed(uint256 invoiceId);
    error NoFractionsSold(uint256 fractionId);
    error PaymentAmountMismatch(uint256 expected, uint256 received);
    error InvalidInvoiceId(uint256 invoiceId);
    error UnauthorizedPayer(address payer);
    error DistributionInProgress(uint256 invoiceId);

    constructor(address _invoiceNFT, address _fractionalizationPool) Ownable(msg.sender) {
        if (_invoiceNFT == address(0) || _fractionalizationPool == address(0)) {
            revert InvalidInvoiceId(0);
        }

        invoiceNFT = InvoiceNFT(_invoiceNFT);
        fractionalizationPool = InvoiceFractionalizationPool(
            _fractionalizationPool
        );
    }

    /**
     * @notice Receives payment for a specific invoice and initiates distribution to fraction holders.
     * @param invoiceTokenId The ID of the invoice being paid.
     */
    function receivePayment(uint256 invoiceTokenId) external payable nonReentrant {
        if (msg.value < minimumDistributionThreshold) {
            revert PaymentBelowThreshold(msg.value, minimumDistributionThreshold);
        }

        (,, uint256 faceValue, uint256 dueDate,, bool isPaid, bool isVerified,) = invoiceNFT.invoices(invoiceTokenId);
        if (!isVerified) {
            revert InvoiceNotVerified(invoiceTokenId);
        }
        if (isPaid) {
            revert InvoiceAlreadyPaid(invoiceTokenId);
        }
        if (block.timestamp >= dueDate) {
            revert InvoiceNotPaid(invoiceTokenId);
        }

        uint256 fractionId = fractionalizationPool.getFractionIdByInvoice(invoiceTokenId);
        if (fractionId == 0) {
            revert InvoiceNotFractionalized(invoiceTokenId);
        }

        if (isDistributed[invoiceTokenId]) {
            revert AlreadyDistributed(invoiceTokenId);
        }

        uint256 minimumAcceptable = (faceValue * 90) / 100; // Accept payments that are at least 90% of face value
        if (msg.value < minimumAcceptable) {
            revert PaymentAmountMismatch(msg.value, minimumAcceptable);
        }

        paymentAmounts[invoiceTokenId] = msg.value;

        // Mark invoice as paid in NFT contract
        invoiceNFT.markAsPaid(invoiceTokenId);

        emit PaymentReceived(invoiceTokenId, msg.value, msg.sender, block.timestamp);
    }

    /**
     * @notice Distributes payments to all fraction holders of a given invoice.
     * @param invoiceTokenId The ID of the invoice to distribute funds for.
     */
    function distributeFunds(uint256 invoiceTokenId) external payable nonReentrant {
        // Check if payment has been received for the invoice
        uint256 totalPayment = paymentAmounts[invoiceTokenId];
        if (totalPayment == 0) {
            revert NoPaymentReceived(invoiceTokenId);
        }

        if (isDistributed[invoiceTokenId]) {
            revert AlreadyDistributed(invoiceTokenId);
        }

        // Check invoice is paid
        (,,,,, bool isPaid,,) = invoiceNFT.invoices(invoiceTokenId);
        if (!isPaid) {
            revert InvoiceNotPaid(invoiceTokenId);
        }

        uint256 fractionId = fractionalizationPool.getFractionIdByInvoice(invoiceTokenId);
        
        (,, uint256 fractionsSold,,,) = fractionalizationPool.getFractionInfo(fractionId);

        if (fractionsSold == 0) {
            revert NoFractionsSold(fractionId);
        }

        uint256 paymentPerFraction = totalPayment / fractionsSold;

        address[] memory investorsList = fractionalizationPool.getInvestors(fractionId);

        uint256 successfulTransfers = 0;
        uint256 failedTransfers = 0;

         // Distribute payments to each holders
        for (uint256 i = 0; i < investorsList.length; i++) {
            address investor = investorsList[i];
            uint256 investorFractions = fractionalizationPool.getInvestments(fractionId, investor);

            if (investorFractions > 0) {
                uint256 investorPayment = paymentPerFraction * investorFractions;
                (bool success, ) = investor.call{value: investorPayment, gas: DISTRIBUTION_GAS_LIMIT}("");

                if (success) {
                    emit FractionPayment(fractionId, investor, investorPayment);
                    successfulTransfers++;
                } else {
                    emit DistributionFailed(invoiceTokenId, investor, investorPayment, "Transfer failed");
                    failedTransfers++;
                }
            }
        }

        // Mark as distributed even  if some transfers failed
        // Failed funds remain in contract and can be claimed by investors later
        isDistributed[invoiceTokenId] = true;
        distributionTimestamps[invoiceTokenId] = block.timestamp;

        emit PaymentDistributed(invoiceTokenId, totalPayment, successfulTransfers, block.timestamp);
    }

    /** 
     * @notice Allows investors to claim their payout for a distributed invoice that failed to be fully distributed.
     * @param invoiceTokenId The ID of the invoice to claim payout for.
     */
    function claimPayout(uint256 invoiceTokenId) external nonReentrant {
        if (!isDistributed[invoiceTokenId]) {
            revert DistributionInProgress(invoiceTokenId);
        }

        if (hasClaimed[invoiceTokenId][msg.sender]) {
            revert AlreadyDistributed(invoiceTokenId);
        }

        uint256 fractionId = fractionalizationPool.getFractionIdByInvoice(invoiceTokenId);
        uint256 investorFractions = fractionalizationPool.getInvestments(fractionId, msg.sender);

        if (investorFractions == 0) {
            revert NoFractionsSold(fractionId);
        }

        // Calculate payment based on fractions held
        (,, uint256 fractionsSold,,,) = fractionalizationPool.getFractionInfo(fractionId);

        uint256 totalPayment = paymentAmounts[invoiceTokenId];
        uint256 paymentPerFraction = totalPayment / fractionsSold;
        uint256 investorPayment = paymentPerFraction * investorFractions;

        hasClaimed[invoiceTokenId][msg.sender] = true;

        (bool success, ) = msg.sender.call{value: investorPayment, gas: DISTRIBUTION_GAS_LIMIT}("");
        if (success) {
            emit FractionPayment(fractionId, msg.sender, investorPayment);
        } else {
            emit DistributionFailed(invoiceTokenId, msg.sender, investorPayment, "Claim transfer failed");
        }
    }

    /** 
     * @notice Updates the minimum distribution threshold (owner only).
     * @param newThreshold The new minimum distribution threshold value.
     */
    function updateMinimumDistributionThreshold(uint256 newThreshold) external onlyOwner {
        minimumDistributionThreshold = newThreshold;
        emit MinimumDistributionThresholdUpdated(newThreshold);
    }

        /**
        * @notice Allows the contract owner to withdraw remaining funds in case of distribution failure or after a certain period.
        * @param invoiceTokenId The ID of the invoice for which to perform emergency withdrawal.
        */
    function emergencyWithdraw(uint256 invoiceTokenId) external onlyOwner nonReentrant {
        if (!isDistributed[invoiceTokenId]) {
            revert DistributionInProgress(invoiceTokenId);
        }

        if (distributionTimestamps[invoiceTokenId] + 30 days > block.timestamp) {
            revert DistributionInProgress(invoiceTokenId);
        }

        uint256 remainingBalance = address(this).balance;
        if (remainingBalance > 0) {
            (bool success, ) = owner().call{value: remainingBalance}("");
            require(success, "Emergency withdrawal failed");
        }
    }

    /**
     * @notice Returns the status of a distribution for a given invoice.
     * @param invoiceTokenId The ID of the invoice to check.
     * @return distributed Whether the invoice has been distributed.
     * @return totalPayment The total payment amount for the invoice.
     * @return timestamp The timestamp when distribution was initiated.
     * @return expectedReceipients The number of expected recipients for the distribution.
     */
    function getDistributionStatus(uint256 invoiceTokenId) external view returns (bool distributed, uint256 totalPayment, uint256 timestamp, uint256 expectedReceipients) {
        distributed = isDistributed[invoiceTokenId];
        totalPayment = paymentAmounts[invoiceTokenId];
        timestamp = distributionTimestamps[invoiceTokenId];

        if (totalPayment > 0) {
            uint256 fractionId = fractionalizationPool.getFractionIdByInvoice(invoiceTokenId);
            address[] memory investors = fractionalizationPool.getInvestors(fractionId);
            expectedReceipients = investors.length;
        } else {
            expectedReceipients = 0;
        }
    }

    receive() external payable {
        revert("Direct payments not allowed, use receivePayment function");
    }
}
