// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract InvoiceNFT is ERC721, Ownable {
    error InvoiceDoesNotExist(uint256 tokenId);
    error NotAuthorized(string message);
    error InvoiceAlreadyPaid(uint256 tokenId);
    error InvoiceNotVerified(uint256 tokenId);
    error InvoiceAlreadyVerified(uint256 tokenId);
    error InvalidRiskScore(uint256 riskScore);
    error InvalidAddress(string message);
    error InvalidValue(string message);

    struct Invoice {
        address issuer;
        string debtorName;
        uint256 faceValue;
        uint256 dueDate;
        uint256 riskScore;
        bool isPaid;
        bool isVerified;
        uint256 createdAt;
    }

    uint256 private _tokenIdCounter;
    mapping(uint256 => Invoice) public invoices;

    // Authorized verifier contract address
    address public verifier;
    address public paymentDistributor;

    event InvoiceCreated(uint256 indexed tokenId, address indexed issuer, string debtorName, uint256 faceValue, uint256 dueDate);
    event InvoicePaid(uint256 indexed tokenId, address indexed payer);
    event InvoiceVerified(uint256 indexed tokenId, uint256 riskScore);
    event VerifierUpdated(address indexed newVerifier);
    event DistributorUpdated(address indexed newDistributor);

     modifier onlyVerifier() {
        _onlyVerifier();
        _;
    }

    modifier onlyDistributor() {
        _onlyDistributor();
        _;
    }

    modifier exists(uint256 tokenId) {
        _exists(tokenId);
        _;
    }

    constructor() ERC721("InvoiceNFT", "INFT") Ownable(msg.sender) {}

    function setPaymentDistributor(address _distributor) external onlyOwner {
        if (_distributor == address(0)) {
            revert InvalidAddress("Distributor address cannot be zero");
        }

        paymentDistributor = _distributor;
        emit DistributorUpdated(_distributor);
    }

    function setVerifier(address _verifier) external onlyOwner {
        if (_verifier == address(0)) {
            revert InvalidAddress("Verifier address cannot be zero");
        }

        verifier = _verifier;
        emit VerifierUpdated(_verifier);
    }

    /**
     * @notice Creates a new invoice.
     * @param debtorName The name of the debtor.
     * @param faceValue The face value of the invoice.
     * @param dueDate The due date of the invoice.
     */
    function createInvoice(
        string memory debtorName,
        uint256 faceValue,
        uint256 dueDate
    ) external returns (uint256) {
        if (faceValue == 0) {
            revert InvalidValue("Face value must be greater than zero");
        }
        if (dueDate <= block.timestamp) {
            revert InvalidValue("Due date must be in the future");
        }

        uint256 tokenId = _tokenIdCounter++;

        invoices[tokenId] = Invoice({
            issuer: msg.sender,
            debtorName: debtorName,
            faceValue: faceValue,
            dueDate: dueDate,
            riskScore: 0,
            isPaid: false,
            isVerified: false,
            createdAt: block.timestamp
        });

        _safeMint(msg.sender, tokenId);
        emit InvoiceCreated(tokenId, msg.sender, debtorName, faceValue, dueDate);

        return tokenId;
    }

    function markVerified(uint256 tokenId, uint256 riskScore) external onlyVerifier exists(tokenId) {
        if (riskScore > 100) {
            revert InvalidRiskScore(riskScore);
        }
        if (invoices[tokenId].isVerified) {
            revert InvoiceAlreadyVerified(tokenId);
        }

        invoices[tokenId].riskScore = riskScore;
        invoices[tokenId].isVerified = true;

        emit InvoiceVerified(tokenId, riskScore);
    }

    function markAsPaid(uint256 tokenId) external onlyDistributor exists(tokenId) {
        Invoice storage invoice = invoices[tokenId];

        if (!invoice.isVerified) {
            revert InvoiceNotVerified(tokenId);
        }
        if (invoice.isPaid) {
            revert InvoiceAlreadyPaid(tokenId);
        }

        invoice.isPaid = true;

        emit InvoicePaid(tokenId, msg.sender);
    }

    function getInvoice(uint256 tokenId) external view exists(tokenId) returns (Invoice memory) {
        return invoices[tokenId];
    }

    function isVerified(uint256 tokenId) external view exists(tokenId) returns (bool) {
        return invoices[tokenId].isVerified;
    }

    function isPaid(uint256 tokenId) external view exists(tokenId) returns (bool) {
        return invoices[tokenId].isPaid;
    }

    function _onlyVerifier() internal view {
        if (msg.sender != verifier && msg.sender != owner()) {
            revert NotAuthorized("Caller is not the authorized verifier");
        }
    }

    function _onlyDistributor() internal view {
        if (msg.sender != paymentDistributor) {
            revert NotAuthorized("Caller is not the authorized payment distributor");
        }
    }

    function _exists(uint256 tokenId) internal view {
        if (_ownerOf(tokenId) == address(0)) {
            revert InvoiceDoesNotExist(tokenId);
        }
    }
}