// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {InvoiceVerifier} from "../src/cre/InvoiceVerifier.sol";

contract PostDeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address verifierAddress = vm.envAddress("VERIFIER_ADDRESS");
        
        vm.startBroadcast(deployerPrivateKey);

        InvoiceVerifier verifier = InvoiceVerifier(verifierAddress);
        
        // Set verification source code (simplified for demo)
        string memory source = 
            "return { success: true, riskScore: 85 }";
        
        verifier.setVerificationSource(source);
        console.log("Verification source set!");

        vm.stopBroadcast();
    }
}