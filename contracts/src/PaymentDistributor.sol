// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {
    ReentrancyGuard
} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {InvoiceNFT} from "./InvoiceNFT.sol";
import {InvoiceFractionalizationPool} from "./InvoiceFractionalizationPool.sol";

contract PaymentDistributor is Ownable, ReentrancyGuard {
    InvoiceNFT public invoiceNFT;
    InvoiceFractionalizationPool public fractionalizationPool;

    struct Distribution {
        uint256 totalPayment;
        uint256 paymentPerFraction;
        uint256 totalFractions;
        uint256 fractionsSold;
        bool isPaid;
    }

    mapping(uint256 => Distribution) public distributions;
    mapping(uint256 => mapping(address => bool)) public hasClaimed;

    uint256 public minimumDistributionThreshold = 0.001 ether; // Minimum payment to accept


    event PaymentReceived(
        uint256 indexed invoiceTokenId,
        uint256 totalAmount,
        address indexed payer,
        uint256 timestamp
    );
    event Claimed(
        uint256 indexed invoiceTokenId,
        address indexed user,
        uint256 amount
    );
    event TransferFailed(
        uint256 indexed invoiceTokenId,
        address indexed investor,
        uint256 amount,
        string reason
    );
    event IssuerClaimedReturns(
        uint256 indexed invoiceTokenId,
        address indexed issuer,
        uint256 amount,
        uint256 unsoldFractions
    );
    event MinimumDistributionThresholdUpdated(uint256 newThreshold);

    error InvalidAddress(string message);
    error InvoiceNotVerified(uint256 invoiceId);
    error InvoiceNotFractionalized(uint256 invoiceId);
    error InvoiceAlreadyPaid(uint256 invoiceId);
    error InvoiceNotPaid(uint256 invoiceId);
    error PaymentBelowThreshold(uint256 amount, uint256 threshold);
    error NoPaymentReceived(uint256 invoiceId);
    error AlreadyClaimed(uint256 invoiceId);
    error NoFractionsSold(uint256 fractionId);
    error PaymentAmountMismatch(uint256 expected, uint256 received);
    error InvalidInvoiceId(uint256 invoiceId);
    error NothingToClaim();
    error NotIssuer();

    constructor(address _invoiceNFT, address _fractionalizationPool) Ownable(msg.sender) {
        if (_invoiceNFT == address(0) || _fractionalizationPool == address(0)) {
            revert InvalidAddress("Invalid address provided");
        }

        invoiceNFT = InvoiceNFT(_invoiceNFT);
        fractionalizationPool = InvoiceFractionalizationPool(
            _fractionalizationPool
        );
    }

    /**
     * @notice Called by debtor to pay the invoice.
        Distributes payment to fraction holders if invoice is verified and fractionalized.
     * @param invoiceTokenId The ID of the invoice being paid.
     */
    function receivePayment(uint256 invoiceTokenId) external payable nonReentrant {
        if (invoiceNFT.ownerOf(invoiceTokenId) == address(0)) {
            revert InvalidInvoiceId(invoiceTokenId);
        }
        if (msg.value < minimumDistributionThreshold) {
            revert PaymentBelowThreshold(msg.value, minimumDistributionThreshold);
        }

        (,, uint256 faceValue,,, bool isPaid, bool isVerified,) = invoiceNFT.invoices(invoiceTokenId);
        if (!isVerified) {
            revert InvoiceNotVerified(invoiceTokenId);
        }
        if (isPaid) {
            revert InvoiceAlreadyPaid(invoiceTokenId);
        }

        uint256 fractionId = fractionalizationPool.getFractionIdByInvoice(invoiceTokenId);
        if (fractionId == 0) {
            revert InvoiceNotFractionalized(invoiceTokenId);
        }

        (, uint256 totalFractions, uint256 fractionsSold,,,) = fractionalizationPool.getFractionInfo(fractionId); // Check if fraction exists

        if (fractionsSold == 0) {
            revert NoFractionsSold(fractionId);
        }

        uint256 minimumAcceptable = (faceValue * 90) / 100; // Accept payments that are at least 90% of face value
        if (msg.value < minimumAcceptable) {
            revert PaymentAmountMismatch(msg.value, minimumAcceptable);
        }

        uint256 paymentPerFraction = msg.value / totalFractions;

        distributions[invoiceTokenId] = Distribution({
            totalPayment: msg.value,
            paymentPerFraction: paymentPerFraction,
            totalFractions: totalFractions,
            fractionsSold: fractionsSold,
            isPaid: true
        });

        invoiceNFT.markAsPaid(invoiceTokenId);

        emit PaymentReceived(invoiceTokenId, msg.value, msg.sender, block.timestamp);
    }

    /**
     * @notice Allows investors to claim their payout for a paid invoice.
     * @param invoiceTokenId The ID of the invoice to claim payout for.
     */
    function claim(uint256 invoiceTokenId) external nonReentrant {
        Distribution memory distribution = distributions[invoiceTokenId];
        if (!distribution.isPaid) {
            revert InvoiceNotPaid(invoiceTokenId);
        }

        if (hasClaimed[invoiceTokenId][msg.sender]) {
            revert AlreadyClaimed(invoiceTokenId);
        }

        uint256 fractionId = fractionalizationPool.getFractionIdByInvoice(invoiceTokenId);

        uint256 holderBalance = fractionalizationPool.balanceOf(msg.sender, fractionId);
        if (holderBalance == 0) {
            revert NothingToClaim();
        }
        
        uint256 payout = distribution.paymentPerFraction * holderBalance;
        hasClaimed[invoiceTokenId][msg.sender] = true;


        fractionalizationPool.burnOnRepayment(fractionId, msg.sender, holderBalance);

        (bool success, ) = payable(msg.sender).call{value: payout}("");

        if (success) {
            emit Claimed(invoiceTokenId, msg.sender, payout);
        } else {
            emit TransferFailed(invoiceTokenId, msg.sender, payout, "Claim transfer failed");
        }
    }

    /**
     * @notice Allows the issuer to claim returns for unsold fractions.
     * @param invoiceTokenId The ID of the invoice to claim returns for.
     */
    function claimIssuerReturns(uint256 invoiceTokenId) external nonReentrant {
        if (invoiceNFT.ownerOf(invoiceTokenId) != msg.sender) {
            revert NotIssuer();
        }

        Distribution memory distribution = distributions[invoiceTokenId];
        if (!distribution.isPaid) {
            revert InvoiceNotPaid(invoiceTokenId);
        }

        uint256 fractionId = fractionalizationPool.getFractionIdByInvoice(invoiceTokenId);
        (,,,, address issuer,) = fractionalizationPool.getFractionInfo(fractionId);

        if (issuer != msg.sender) {
            revert NotIssuer();
        }

        uint256 unsoldFractions = distribution.totalFractions - distribution.fractionsSold;

        if (unsoldFractions == 0) {
            revert NothingToClaim();
        }

        uint256 amountToClaim = unsoldFractions * distribution.paymentPerFraction;

        hasClaimed[invoiceTokenId][msg.sender] = true;

        (bool success, ) = payable(msg.sender).call{value: amountToClaim}("");

        if (success) {
            emit IssuerClaimedReturns(invoiceTokenId, msg.sender, amountToClaim, unsoldFractions);
        } else {
            emit TransferFailed(invoiceTokenId, msg.sender, amountToClaim, "Issuer claim transfer failed");
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
     * @notice Returns the claimable amount for a user for a specific invoice.
     * @param user The address of the user.
     * @param invoiceTokenId The ID of the invoice.
     * @return The claimable amount in wei.
     */
    function claimable(address user, uint256 invoiceTokenId) external view returns (uint256) {
        Distribution memory distribution = distributions[invoiceTokenId];
        if (!distribution.isPaid) {
            return 0;
        }

        if (hasClaimed[invoiceTokenId][user]) {
            return 0;
        }

        uint256 fractionId = fractionalizationPool.getFractionIdByInvoice(invoiceTokenId);
        uint256 balance = fractionalizationPool.balanceOf(user, fractionId);

        if (balance > 0) {
            return balance * distribution.paymentPerFraction;
        }

        (,,,, address issuer,) = fractionalizationPool.getFractionInfo(fractionId);
        if (issuer == user) {
            uint256 unsoldFractions = distribution.totalFractions - distribution.fractionsSold;
            return unsoldFractions * distribution.paymentPerFraction;
        }

        return 0;
    }

    /**
     * @notice Returns the total payment amount for a specific invoice.
     * @param invoiceTokenId The ID of the invoice.
     * @return The total payment amount in wei.
     */
    function paymentAmounts(uint256 invoiceTokenId) external view returns (uint256) {
        Distribution memory distribution = distributions[invoiceTokenId];
        if (!distribution.isPaid) {
            revert NoPaymentReceived(invoiceTokenId);
        }
        return distribution.totalPayment;
    }

    function getDistributionInfo(uint256 invoiceTokenId) external view returns (Distribution memory) {
        return distributions[invoiceTokenId];
    }

    function hasUserClaimed(address user, uint256 invoiceTokenId) external view returns (bool) {
        return hasClaimed[invoiceTokenId][user];
    }
    receive() external payable {
        revert("Direct payments not allowed, use receivePayment function");
    }
}
