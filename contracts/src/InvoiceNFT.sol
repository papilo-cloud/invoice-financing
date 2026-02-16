// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract InvoiceNFT is ERC721, Ownable {
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

    event InvoiceCreated(uint256 indexed tokenId, address indexed issuer, string debtorName, uint256 faceValue, uint256 dueDate);
    event InvoicePaid(uint256 indexed tokenId, address indexed payer);
    event InvoiceVerified(uint256 indexed tokenId, uint256 riskScore);
    event VerifierUpdated(address indexed newVerifier);

    constructor() ERC721("InvoiceNFT", "INFT") Ownable(msg.sender) {}

    function setVerifier(address _verifier) external onlyOwner {
        require(_verifier != address(0), "Invalid verifier");
        verifier = _verifier;
        emit VerifierUpdated(_verifier);
    }

     modifier onlyVerifier() {
        require(msg.sender == verifier, "Caller is not the authorized verifier");
        _;
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
        require(dueDate > block.timestamp, "Due date must be in the future");
        require(faceValue > 0, "Face value must be greater than zero");

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

    function markVerified(uint256 tokenId, uint256 riskScore) external onlyVerifier {
        require(_ownerOf(tokenId) != address(0), "Invoice does not exists");
        require(riskScore <= 100, "Invalid risk score");
        require(!invoices[tokenId].isVerified, "Already verified");

        invoices[tokenId].riskScore = riskScore;
        invoices[tokenId].isVerified = true;

        emit InvoiceVerified(tokenId, riskScore);
    }

    function markAsPaid(uint256 tokenId) external {
        require(_ownerOf(tokenId) != address(0), "Invoice does not exists");
        require(!invoices[tokenId].isPaid, "Already paid");

        invoices[tokenId].isPaid = true;
        emit InvoicePaid(tokenId, msg.sender);
    }

    function getInvoice(uint256 tokenId) external view returns (Invoice memory) {
        require(_ownerOf(tokenId) != address(0), "Invoice does not exists");
        return invoices[tokenId];
    }

    function isVerified(uint256 tokenId) external view returns (bool) {
        require(_ownerOf(tokenId) != address(0), "Invoice does not exists");
        return invoices[tokenId].isVerified;
    }
}