// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {InvoiceNFT} from "../src/InvoiceNFT.sol";
import {InvoiceVerifier} from "../src/cre/InvoiceVerifier.sol";

contract InvoiceVerifierTest is Test {
    InvoiceNFT public invoiceNFT;
    InvoiceVerifier public verifier;

    address deployer = address(1);
    address business = address(2);
    address attacker = address(3);

    // Mock Chainlink addresses
    address mockRouter = address(4);
    bytes32 mockDonId = bytes32(uint256(123));
    uint64 mockSubId = 456;

    event VerificationRequested(
        uint256 indexed invoiceId,
        bytes32 indexed requestId
    );
    event VerificationFulfilled(
        uint256 indexed invoiceId,
        uint256 riskScore,
        bool success
    );

    function setUp() public {
        vm.startPrank(deployer);

        invoiceNFT = new InvoiceNFT();
        verifier = new InvoiceVerifier(
            address(invoiceNFT),
            mockDonId,
            mockSubId,
            mockRouter
        );

        invoiceNFT.setVerifier(address(verifier));
        vm.stopPrank();
    }

    // =================== INITIALIZATION TESTS ===================
    
    function testInitialization() public view {
        assertEq(verifier.donId(), mockDonId);
        assertEq(verifier.subscriptionId(), mockSubId);
        assertEq(verifier.callbackGasLimit(), 300000);
        assertEq(address(verifier.invoiceNFT()), address(invoiceNFT));
    }

    // ==================== MANUAL VERIFICATION TESTS ====================

    function testManualVerification() public {
        vm.startPrank(business);
        uint256 tokenId = invoiceNFT.createInvoice(
            "Apple Inc",
            50000 ether,
            block.timestamp + 60 days
        );
        vm.stopPrank();

        vm.prank(deployer);
        verifier.manualVerify(tokenId, 95);

        (,,,, uint256 riskScore,, bool isVerified,) = invoiceNFT.invoices(tokenId);
        
        assertEq(riskScore, 95);
        assertTrue(isVerified);
    }

    function testOnlyVerifierCanVerify() public {
        vm.startPrank(business);
        uint256 tokenId = invoiceNFT.createInvoice(
            "Test Corp",
            10000 ether,
            block.timestamp + 30 days
        );

        // User cannot verify directly
        vm.expectRevert();
        invoiceNFT.markVerified(tokenId, 80);

        vm.stopPrank();
    }

        function testOnlyOwnerCanManualVerify() public {
        vm.prank(business);
        uint256 tokenId = invoiceNFT.createInvoice(
            "Apple Inc",
            50000 ether,
            block.timestamp + 60 days
        );
        
        vm.prank(attacker);
        vm.expectRevert();
        verifier.manualVerify(tokenId, 90);
    }

        function testCannotManualVerifyWithInvalidScore() public {
        vm.prank(business);
        uint256 tokenId = invoiceNFT.createInvoice(
            "Apple Inc",
            50000 ether,
            block.timestamp + 60 days
        );
        
        vm.prank(deployer);
        vm.expectRevert();
        verifier.manualVerify(tokenId, 101);
    }
    
    function testManualVerifyEmitsEvent() public {
        vm.prank(business);
        uint256 tokenId = invoiceNFT.createInvoice(
            "Apple Inc",
            50000 ether,
            block.timestamp + 60 days
        );
        
        vm.expectEmit(true, false, false, true);
        emit VerificationFulfilled(tokenId, 90, true);
        
        vm.prank(deployer);
        verifier.manualVerify(tokenId, 90);
    }
    
    // ========== CONFIGURATION TESTS ==========
    
    function testUpdateConfig() public {
        bytes32 newDonId = bytes32(uint256(2));
        uint64 newSubId = 200;
        uint32 newGasLimit = 400000;
        
        vm.prank(deployer);
        verifier.updateConfig(newDonId, newSubId, newGasLimit);
        
        assertEq(verifier.donId(), newDonId);
        assertEq(verifier.subscriptionId(), newSubId);
        assertEq(verifier.callbackGasLimit(), newGasLimit);
    }
    
    function testOnlyOwnerCanUpdateConfig() public {
        vm.prank(attacker);
        vm.expectRevert();
        verifier.updateConfig(bytes32(uint256(2)), 200, 400000);
    }
    
    function testSetVerificationSource() public {
        string memory source = "const result = 85; return Functions.encodeUint256(result);";
        
        vm.prank(deployer);
        verifier.setVerificationSource(source);
        
        assertEq(verifier.verificationSource(), source);
    }
    
    function testOnlyOwnerCanSetSource() public {
        string memory source = "const result = 85;";
        
        vm.prank(attacker);
        vm.expectRevert();
        verifier.setVerificationSource(source);
    }
    
    // ========== EDGE CASES ==========
    
    function testVerifyMultipleInvoices() public {
        vm.startPrank(business);
        uint256 tokenId1 = invoiceNFT.createInvoice("Company A", 10000 ether, block.timestamp + 30 days);
        uint256 tokenId2 = invoiceNFT.createInvoice("Company B", 20000 ether, block.timestamp + 60 days);
        uint256 tokenId3 = invoiceNFT.createInvoice("Company C", 30000 ether, block.timestamp + 90 days);
        vm.stopPrank();
        
        vm.startPrank(deployer);
        verifier.manualVerify(tokenId1, 85);
        verifier.manualVerify(tokenId2, 70);
        verifier.manualVerify(tokenId3, 95);
        vm.stopPrank();
        
        assertTrue(invoiceNFT.isVerified(tokenId1));
        assertTrue(invoiceNFT.isVerified(tokenId2));
        assertTrue(invoiceNFT.isVerified(tokenId3));
    }
    
    function testVerifyBoundaryScores() public {
        vm.prank(business);
        uint256 tokenId1 = invoiceNFT.createInvoice("Company A", 10000 ether, block.timestamp + 30 days);
        
        vm.prank(business);
        uint256 tokenId2 = invoiceNFT.createInvoice("Company B", 20000 ether, block.timestamp + 60 days);
        
        vm.startPrank(deployer);
        verifier.manualVerify(tokenId1, 0);   // Minimum
        verifier.manualVerify(tokenId2, 100); // Maximum
        vm.stopPrank();
        
        (,,,, uint256 riskScore1,,,) = invoiceNFT.invoices(tokenId1);
        (,,,, uint256 riskScore2,,,) = invoiceNFT.invoices(tokenId2);
        
        assertEq(riskScore1, 0);
        assertEq(riskScore2, 100);
    }
}
