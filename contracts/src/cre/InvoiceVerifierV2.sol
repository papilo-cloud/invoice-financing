// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {InvoiceNFT} from "../InvoiceNFT.sol";
import {ReceiverTemplate} from "./ReceiverTemplate.sol";

contract InvoiceVerifier is ReceiverTemplate, ReentrancyGuard {
    error InvoiceDoesNotExist(uint256 tokenId);
    error AlreadyVerified(uint256 tokenId);
    error InvalidRiskScore(uint256 score);
    error DecodingFailed();

    InvoiceNFT public immutable invoiceNFT;
    
    struct VerificationRecord {
        uint256 riskScore;
        bool isVerified;
        uint256 verifiedAt;
    }
    
    mapping(uint256 => VerificationRecord) public verifications;

    event VerificationReceived(
        uint256 indexed tokenId,
        uint256 riskScore,
        bool success,
        uint256 timestamp
    );
    event VerificationFailed(
        uint256 indexed tokenId,
        string reason
    );
    event ManualVerification(
        uint256 indexed tokenId,
        uint256 riskScore,
        address indexed verifier
    );

    /**
     * @notice Initializes the contract
     * @param _forwarderAddress Address of the Chainlink CRE Forwarder
     * @param _invoiceNFT Address of the InvoiceNFT contract
     */
    constructor(
        address _forwarderAddress,
        address _invoiceNFT
    ) ReceiverTemplate(_forwarderAddress) {
        require(_invoiceNFT != address(0), "Invalid InvoiceNFT address");
        invoiceNFT = InvoiceNFT(_invoiceNFT);
    }

    /**
     * @notice Processes the verification report from CRE workflow
     * @param report Encoded report data: (uint256 tokenId, uint256 riskScore, bool success)
     * @dev This is called by the CRE Forwarder via handleReport()
     */
    function _processReport(bytes calldata report) internal override {
        (uint256 tokenId, uint256 riskScore, bool success) = abi.decode(
            report,
            (uint256, uint256, bool)
        );
        
        if (invoiceNFT.ownerOf(tokenId) == address(0)) {
            emit VerificationFailed(tokenId, "Invoice does not exist");
            return;
        }
        
        if (verifications[tokenId].isVerified) {
            emit VerificationFailed(tokenId, "Already verified");
            return;
        }
        
        if (riskScore > 100) {
            emit VerificationFailed(tokenId, "Invalid risk score");
            return;
        }
        
        if (!success) {
            emit VerificationFailed(tokenId, "Verification failed in workflow");
            return;
        }
        
        verifications[tokenId] = VerificationRecord({
            riskScore: riskScore,
            isVerified: true,
            verifiedAt: block.timestamp
        });
        
        invoiceNFT.setVerificationResult(tokenId, riskScore, success);
        
        emit VerificationReceived(tokenId, riskScore, success, block.timestamp);
    }

    /**
     * @notice Manual verification for testing or emergency fallback
     * @param tokenId The ID of the invoice to verify
     * @param riskScore The risk score to assign (0-100)
     */
    function manualVerify(uint256 tokenId, uint256 riskScore) 
        external 
        onlyOwner 
        nonReentrant 
    {
        if (invoiceNFT.ownerOf(tokenId) == address(0)) {
            revert InvoiceDoesNotExist(tokenId);
        }
        
        if (verifications[tokenId].isVerified) {
            revert AlreadyVerified(tokenId);
        }
        
        if (riskScore > 100) {
            revert InvalidRiskScore(riskScore);
        }
        
        verifications[tokenId] = VerificationRecord({
            riskScore: riskScore,
            isVerified: true,
            verifiedAt: block.timestamp
        });
        
        invoiceNFT.setVerificationResult(tokenId, riskScore, true);
        
        emit ManualVerification(tokenId, riskScore, msg.sender);
        emit VerificationReceived(tokenId, riskScore, true, block.timestamp);
    }
    
    /**
     * @notice Batch manual verification
     * @param tokenIds Array of invoice token IDs
     * @param riskScores Array of risk scores
     */
    function batchManualVerify(
        uint256[] calldata tokenIds,
        uint256[] calldata riskScores
    ) external onlyOwner nonReentrant {
        require(tokenIds.length == riskScores.length, "Length mismatch");
        
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            uint256 riskScore = riskScores[i];
            
            // Skip if invalid
            if (verifications[tokenId].isVerified) continue;
            if (invoiceNFT.ownerOf(tokenId) == address(0)) continue;
            if (riskScore > 100) continue;
            
            verifications[tokenId] = VerificationRecord({
                riskScore: riskScore,
                isVerified: true,
                verifiedAt: block.timestamp
            });
            
            invoiceNFT.setVerificationResult(tokenId, riskScore, true);
            
            emit ManualVerification(tokenId, riskScore, msg.sender);
            emit VerificationReceived(tokenId, riskScore, true, block.timestamp);
        }
    }

    /**
     * @notice Get verification details for an invoice
     */
    function getVerification(uint256 tokenId) external view returns (VerificationRecord memory) {
        return verifications[tokenId];
    }

    /**
     * @notice Check if an invoice is verified
     */
    function isVerified(uint256 tokenId) external view returns (bool) {
        return verifications[tokenId].isVerified;
    }
    
    /**
     * @notice Get verification status
     * @return status 0=not verified, 1=verified
     * @return riskScore The risk score if verified
     */
    function getVerificationStatus(uint256 tokenId) 
        external 
        view 
        returns (uint8 status, uint256 riskScore) 
    {
        if (verifications[tokenId].isVerified) {
            return (1, verifications[tokenId].riskScore);
        }
        return (0, 0);
    }
}