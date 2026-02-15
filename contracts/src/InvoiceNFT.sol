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
    mapping(uint256 => Invoice) private _invoices;

    event InvoiceCreated(uint256 indexed tokenId, address indexed issuer, string debtorName, uint256 faceValue, uint256 dueDate);
    event InvoicePaid(uint256 indexed tokenId, address indexed payer);
    event InvoiceVerified(uint256 indexed tokenId, uint256 riskScore);

    constructor() ERC721("InvoiceNFT", "INFT") Ownable(msg.sender) {}

    function createInvoice(
        string memory debtorName,
        uint256 faceValue,
        uint256 dueDate
    ) external onlyOwner {
        require(dueDate > block.timestamp, "Due date must be in the future");
        require(faceValue > 0, "Face value must be greater than zero");

        uint256 tokenId = _tokenIdCounter++;

        _invoices[tokenId] = Invoice({
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
    }

    function verifyInvoice(uint256 tokenId, uint256 riskScore) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Invoice does not exists");
        require(riskScore <= 100, "Invalid risk score");
        require(!_invoices[tokenId].isVerified, "Already verified");

        _invoices[tokenId].riskScore = riskScore;
        _invoices[tokenId].isVerified = true;

        emit InvoiceVerified(tokenId, riskScore);
    }

    function markPaid(uint256 tokenId) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Invoice does not exists");
        require(!_invoices[tokenId].isPaid, "Already paid");

        _invoices[tokenId].isPaid = true;
        emit InvoicePaid(tokenId, msg.sender);
    }

    function getInvoice(uint256 tokenId) external view returns (Invoice memory) {
        require(_ownerOf(tokenId) != address(0), "Invoice does not exists");
        return _invoices[tokenId];
    }

    function isVerified(uint256 tokenId) external view returns (bool) {
        require(_ownerOf(tokenId) != address(0), "Invoice does not exists");
        return _invoices[tokenId].isVerified;
    }
}