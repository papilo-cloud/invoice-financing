// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {InvoiceNFT} from "../src/InvoiceNFT.sol";
import {InvoiceVerifier} from "../src/cre/InvoiceVerifierV2.sol";
import {InvoiceFractionalizationPool} from "../src/InvoiceFractionalizationPool.sol";
import {PaymentDistributor} from "../src/PaymentDistributor.sol";

contract DeployScript is Script {
    // Chainlink CRE Forwarder addresses for Sepolia
    address constant MOCK_FORWARDER = 0x15fC6ae953E024d975e77382eEeC56A9101f9F88;      // For testing with --broadcast
    address constant KEYSTONE_FORWARDER = 0xF8344CFd5c43616a4366C34E3EEE75af79a74482; // For production
    
    bool constant USE_PRODUCTION_FORWARDER = false; // Set to true for production deployment

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
        console.log("");

        // Deploy InvoiceVerifier
        console.log("\n2. Deploying InvoiceVerifier...");
        address forwarderAddress = USE_PRODUCTION_FORWARDER ? KEYSTONE_FORWARDER : MOCK_FORWARDER;

        InvoiceVerifier verifier = new InvoiceVerifier(
            forwarderAddress,
            address(invoiceNFT)
        );
        console.log("InvoiceVerifier deployed at:", address(verifier));
        console.log("   Using forwarder:", forwarderAddress);
        console.log("");

        // Deploy InvoiceFractionalizationPool
        console.log("\n3. Deploying InvoiceFractionalizationPool...");
        InvoiceFractionalizationPool pool = new InvoiceFractionalizationPool(
            address(invoiceNFT)
        );
        console.log("InvoiceFractionalizationPool deployed at:", address(pool));
        console.log("");

        // Deploy PaymentDistributor
        console.log("\n4. Deploying PaymentDistributor...");
        PaymentDistributor distributor = new PaymentDistributor(
            address(invoiceNFT),
            address(pool)
        );
        console.log("PaymentDistributor deployed at:", address(distributor));
        console.log("");

        // Setup Authorization
        console.log("\n5. Setting up authorization...");
        invoiceNFT.setVerifier(address(verifier));
        console.log("- Set verifier on InvoiceNFT");
        
        invoiceNFT.setPaymentDistributor(address(distributor));
        console.log("- Set payment distributor on InvoiceNFT");
        
        pool.setPaymentDistributor(address(distributor));
        console.log("- Set payment distributor on Pool");

        console.log("");

        vm.stopBroadcast();

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