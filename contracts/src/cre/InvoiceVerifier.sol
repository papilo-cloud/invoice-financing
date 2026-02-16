// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../cre/InvoiceNFT.sol";

contract InvoiceVerifier is FunctionsClient, Ownable {
    using FunctionsRequest for FunctionsRequest.Request;

    InvoiceNFT public invoiceNFT;

    bytes32 public donId;
    uint64 public subscriptionId;
    uint32 public callbackGasLimit;

    mapping(bytes32 => uint256) public requestToInvoiceId;

    string public verificationSource;

    event VerificationRequested(bytes32 indexed requestId, uint256 indexed invoiceId);
    event VerificationFulfilled(uint256 indexed invoiceId, uint256 riskScore, bool success);
    event VerificationFailed(uint256 indexed invoiceId, bytes32 requestId, string reason);

    constructor(
        address _invoiceNFT,
        bytes32 _donId,
        uint64 _subscriptionId,
        address _functionRouter,
    ) FunctionClient(_functionRouter) Ownable(msg.sender) {
        invoiceNFT = InvoiceNFT(_invoiceNFT);
        donId = _donId;
        subscriptionId = _subscriptionId;
        callbackGasLimit = 300000;
    }

    /**
     * @notice Sets the verification source for the contract.
     * @param source The source code to be used for verification.
     */
    function setVerificationSource(string memory source) external onlyOwner {
        verificationSource = source;
    }

    function updateConfig(bytes32 _donId, uint64 _subscriptionId, uint32 _callbackGasLimit) external onlyOwner {
        donId = _donId;
        subscriptionId = _subscriptionId;
        callbackGasLimit = _callbackGasLimit;
    }

    /**
     * @notice Requests verification for a given invoice ID.
     * @param invoiceId The ID of the invoice to verify.
     * @return bytes32 The request ID for tracking the verification process.
     */
    function requestVerification(uint256 invoiceId) external returns (bytes32) {
        require(invoiceNFT.ownerOf(invoiceId) != address(0), "Invoice does not exist");
        require(bytes(verificationSource).length > 0, "Verification source is not set");

        // Fetch invoice details from the InvoiceNFT contract
        (
            ,
            string memory debtorName,
            uint256 faceValue,
            uint256 dueDate,
            ,,,

        ) = invoiceNFT.invoices(invoiceId);

        // Build the Functions request
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(verificationSource);

        string[] memory args = new string[](4);
        args[0] = _uint2str(invoiceId);
        args[1] = debtorName;
        args[2] = _uint2str(faceValue);
        args[3] = _uint2str(dueDate);

        req.setArgs(args);

        // Send the request
        bytes32 requestId = _sendRequest(
            req.encode(), 
            subscriptionId, 
            callbackGasLimit, 
            donId
        );

        requestToInvoiceId[requestId] = invoiceId;

        emit VerificationRequested(requestId, invoiceId);

        return requestId;
    }

    /**
     * @notice Handles the fulfillment of a verification request.
     * @param requestId The ID of the verification request.
     * @param response The response data from the Functions client.
     * @param err The error data, if any.
     * @dev This function is called by the Chainlink Functions client with the results of the verification process.
    */
    function fulfillRequest(
        bytes32 requestId, 
        bytes memory response, 
        bytes memory err
    ) internal override {
        uint256 invoiceId = requestToInvoiceId[requestId];

        if (err.length > 0) {
            string memory reason = string(err);
            emit VerificationFailed(invoiceId, requestId, reason);
            return;
        }

        (bool success, uint256 riskScore) = abi.decode(response, (bool, uint256));

        if (!success) {
            emit VerificationFailed(invoiceId, requestId, "Verification failed");
            return;
        }

        require(riskScore <= 100, "Invalid risk score");

        // Update the InvoiceNFT contract with the verification result
        invoiceNFT.markVerified(invoiceId, riskScore);

        emit VerificationFulfilled(invoiceId, riskScore, true);

        delete requestToInvoiceId[requestId];
    }

    /**
     * @notice MManual verification for testing/demo (bypasses Chainlink)
     * @param invoiceId The ID of the invoice to verify.
     * @param riskScore The risk score to assign to the invoice.
     */
    function manualVerify(uint256 invoiceId, uint256 riskScore) external onlyOwner {
        require(invoiceNFT.ownerOf(invoiceId) != address(0), "Invoice does not exist");
        require(riskScore <= 100, "Invalid risk score");

        invoiceNFT.markVerified(invoiceId, riskScore);

        emit VerificationFulfilled(invoiceId, riskScore, true);
    }

    // Helper function to convert uint to string
    function _uint2str(uint256 _i) internal pure returns (string memory str) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 length;
        while (j != 0) {
            length++;
            j /= 10;
        }
        bytes memory bstr = new bytes(length);
        uint256 k = length;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - (_i / 10) * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        str = string(bstr);
    }
}