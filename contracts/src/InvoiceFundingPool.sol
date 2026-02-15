// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./InvoiceNFT.sol";
contract InvoiceFundingPool is ERC1155, Ownable {
    InvoiceNFT public invoiceNFT;

    struct FundingPosition {
        uint256 tokenId;
        uint256 amount;
        address funder;
        bool isActive;
    }

    mapping(uint256 => FundingPosition) public fundingPositions;
    uint256 private _positionIdCounter;

    event FundingPositionCreated(uint256 indexed positionId, uint256 indexed tokenId, uint256 amount, address indexed funder);
    event FundingPositionClosed(uint256 indexed positionId, address indexed funder);

    constructor(address _invoiceNFT) ERC1155("") Ownable(msg.sender) {
        invoiceNFT = InvoiceNFT(_invoiceNFT);
    }

    function createFundingPosition(uint256 tokenId, uint256 amount) external {
        require(invoiceNFT.ownerOf(tokenId) != address(0), "Invoice does not exist");
        require(amount > 0, "Amount must be greater than zero");

        uint256 positionId = _positionIdCounter++;

        fundingPositions[positionId] = FundingPosition({
            tokenId: tokenId,
            amount: amount,
            funder: msg.sender,
            isActive: true
        });

        _mint(msg.sender, positionId, amount, "");
        emit FundingPositionCreated(positionId, tokenId, amount, msg.sender);
    }

    function closeFundingPosition(uint256 positionId) external {
        require(fundingPositions[positionId].isActive, "Funding position is not active");
        require(fundingPositions[positionId].funder == msg.sender, "Only the funder can close the position");

        fundingPositions[positionId].isActive = false;
        _burn(msg.sender, positionId, fundingPositions[positionId].amount);
        emit FundingPositionClosed(positionId, msg.sender);
    }
    
}