// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {InvoiceNFT} from "../src/InvoiceNFT.sol";
import {InvoiceVerifier} from "../src/cre/InvoiceVerifier.sol";
import {InvoiceFractionalizationPool} from "../src/InvoiceFractionalizationPool.sol";
import {PaymentDistributor} from "../src/PaymentDistributor.sol";

contract DeployScript is Script {
    // Chainlink Functions configuration for Sepolia
    bytes32 constant DON_ID = 0x66756e2d657468657265756d2d7365706f6c69612d3100000000000000000000;
    address constant FUNCTIONS_ROUTER = 0xb83E47C2bC239B3bf370bc41e1459A34b41238D0;
    uint64 constant SUBSCRIPTION_ID = 6283;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying contracts with account:", deployer);
        console.log("Account balance:", deployer.balance);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy InvoiceNFT
        console.log("\n1. Deploying InvoiceNFT...");
        InvoiceNFT invoiceNFT = new InvoiceNFT();
        console.log("InvoiceNFT deployed at:", address(invoiceNFT));

        // Deploy InvoiceVerifier
        console.log("\n2. Deploying InvoiceVerifier...");
        InvoiceVerifier verifier = new InvoiceVerifier(
            address(invoiceNFT),
            DON_ID,
            SUBSCRIPTION_ID,
            FUNCTIONS_ROUTER
        );
        console.log("InvoiceVerifier deployed at:", address(verifier));

        // Deploy InvoiceFractionalizationPool
        console.log("\n3. Deploying InvoiceFractionalizationPool...");
        InvoiceFractionalizationPool pool = new InvoiceFractionalizationPool(
            address(invoiceNFT)
        );
        console.log("InvoiceFractionalizationPool deployed at:", address(pool));

        // Deploy PaymentDistributor
        console.log("\n4. Deploying PaymentDistributor...");
        PaymentDistributor distributor = new PaymentDistributor(
            address(invoiceNFT),
            address(pool)
        );
        console.log("PaymentDistributor deployed at:", address(distributor));

        // Setup Authorization
        console.log("\n5. Setting up authorization...");
        invoiceNFT.setVerifier(address(verifier));
        console.log("- Set verifier on InvoiceNFT");
        
        invoiceNFT.setPaymentDistributor(address(distributor));
        console.log("- Set payment distributor on InvoiceNFT");
        
        pool.setPaymentDistributor(address(distributor));
        console.log("- Set payment distributor on Pool");

        vm.stopBroadcast();

        // Save deployment addresses
        console.log("\n===========================================");
        console.log("DEPLOYMENT COMPLETE!");
        console.log("===========================================");
        
        // Write to file
        string memory addresses = string(
            abi.encodePacked(
                "VITE_INVOICE_NFT_ADDRESS=", vm.toString(address(invoiceNFT)), "\n",
                "VITE_INVOICE_VERIFIER_ADDRESS=", vm.toString(address(verifier)), "\n",
                "VITE_FRACTIONALIZATION_ADDRESS=", vm.toString(address(pool)), "\n",
                "VITE_PAYMENT_DISTRIBUTOR_ADDRESS=", vm.toString(address(distributor)), "\n"
            )
        );

        console.log(addresses);
    }
}