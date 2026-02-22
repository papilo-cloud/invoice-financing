// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {InvoiceNFT} from "../src/InvoiceNFT.sol";
import {InvoiceVerifier} from "../src/cre/InvoiceVerifier.sol";
import {PaymentDistributor} from "../src/PaymentDistributor.sol";

contract NFTImageTest is Test {
    InvoiceNFT public invoiceNFT;
    InvoiceVerifier public verifier;
    PaymentDistributor public distributor;
    
    address deployer = address(1);
    address business = address(2);
    
    function setUp() public {
        vm.startPrank(deployer);
        invoiceNFT = new InvoiceNFT();
        verifier = new InvoiceVerifier(
            address(invoiceNFT),
            bytes32(uint256(1)), // mock don
            1, // mock sub
            address(3) // mock router
        );
        distributor = new PaymentDistributor(address(invoiceNFT), address(4)); // mock pool
        invoiceNFT.setVerifier(address(verifier));
        invoiceNFT.setPaymentDistributor(address(distributor));
        vm.stopPrank();
    }
    
    function testGenerateTokenURI() public {
        vm.prank(business);
        uint256 tokenId = invoiceNFT.createInvoice(
            "Apple Inc",
            50000 ether,
            block.timestamp + 60 days
        );
        
        // Get token URI (before verification)
        string memory uri1 = invoiceNFT.tokenURI(tokenId);
        console.log("\n=== TOKEN URI (Unverified) ===");
        console.log(uri1);
        
        vm.prank(deployer);
        verifier.manualVerify(tokenId, 65);
        
        string memory uri2 = invoiceNFT.tokenURI(tokenId);
        console.log("\n=== TOKEN URI (Verified, Risk: 85) ===");
        console.log(uri2);
        
        vm.prank(address(distributor));
        invoiceNFT.markAsPaid(tokenId);
        
        // Get token URI (after payment)
        string memory uri3 = invoiceNFT.tokenURI(tokenId);
        console.log("\n=== TOKEN URI (Paid) ===");
        console.log(uri3);
        
        // Token URI should change based on status
        assertTrue(keccak256(bytes(uri1)) != keccak256(bytes(uri2)));
        assertTrue(keccak256(bytes(uri2)) != keccak256(bytes(uri3)));
    }
    
    function testMultipleInvoicesUniqueSVGs() public {
        vm.startPrank(business);
        uint256 id1 = invoiceNFT.createInvoice("Apple Inc", 50000 ether, block.timestamp + 60 days);
        uint256 id2 = invoiceNFT.createInvoice("Microsoft Corp", 75000 ether, block.timestamp + 90 days);
        uint256 id3 = invoiceNFT.createInvoice("Amazon LLC", 100000 ether, block.timestamp + 30 days);
        
        vm.stopPrank();
        
        // Verify with different risk scores
        vm.startPrank(deployer);
        verifier.manualVerify(id1, 90); // High risk - Green
        verifier.manualVerify(id2, 65); // Medium risk - Blue
        verifier.manualVerify(id3, 35); // Low risk - Red
        vm.stopPrank();
        
        string memory uri1 = invoiceNFT.tokenURI(id1);
        string memory uri2 = invoiceNFT.tokenURI(id2);
        string memory uri3 = invoiceNFT.tokenURI(id3);
        
        console.log("\n=== INVOICE #0 (Apple, Risk: 90) ===");
        console.log(uri1);
        
        console.log("\n=== INVOICE #1 (Microsoft, Risk: 65) ===");
        console.log(uri2);
        
        console.log("\n=== INVOICE #2 (Amazon, Risk: 35) ===");
        console.log(uri3);
        
        // All should be unique
        assertTrue(keccak256(bytes(uri1)) != keccak256(bytes(uri2)));
        assertTrue(keccak256(bytes(uri2)) != keccak256(bytes(uri3)));
        assertTrue(keccak256(bytes(uri1)) != keccak256(bytes(uri3)));
    }
}