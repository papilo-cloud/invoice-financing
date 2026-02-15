// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";
import "./InvoiceNFT.sol";

contract InvoiceVerifier is Ownable {
    InvoiceNFT public invoiceNFT;

    constructor(address _invoiceNFT) Ownable(msg.sender) {
        invoiceNFT = InvoiceNFT(_invoiceNFT);
    }

    function verifyInvoice(uint256 tokenId, uint256 riskScore) external onlyOwner {
        invoiceNFT.verifyInvoice(tokenId, riskScore);
    }
}