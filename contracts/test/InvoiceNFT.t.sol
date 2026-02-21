// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {InvoiceNFT} from "../src/InvoiceNFT.sol";
import {PaymentDistributor} from "../src/PaymentDistributor.sol";
import {InvoiceVerifier} from "../src/cre/InvoiceVerifier.sol";

contract InvoiceNFTTest is Test { // markAsPaid
    InvoiceNFT private invoiceNFT;
    InvoiceVerifier private invoiceVerifier;
    PaymentDistributor private distributor;

    address deployer = address(1);
    address business1 = address(2);
    address business2 = address(3);
    address attacker = address(4);

    address mockRouter = address(5);
    bytes32 mockDonId = bytes32(uint256(123));
    uint64 mockSubscriptionId = 456;

    address mockFractionalizationPool = address(7);

    event InvoiceCreated(uint256 indexed tokenId, address indexed issuer, string debtorName, uint256 faceValue, uint256 dueDate);
    event InvoicePaid(uint256 indexed tokenId, address indexed payer);
    event InvoiceVerified(uint256 indexed tokenId, uint256 riskScore);
    event VerifierUpdated(address indexed newVerifier);

    function setUp() public {
        vm.startPrank(deployer);
        invoiceNFT = new InvoiceNFT();
        invoiceVerifier = new InvoiceVerifier(address(invoiceNFT), mockDonId, mockSubscriptionId, mockRouter);
        distributor = new PaymentDistributor(address(invoiceNFT), mockFractionalizationPool);
        invoiceNFT.setVerifier(address(invoiceVerifier));
        invoiceNFT.setPaymentDistributor(address(distributor));
        vm.stopPrank();
    }

    // ====================== MINTING TESTS ======================

    function testCreateInvoice() public {
        string memory debtorName = "Apple Inc.";
        uint256 faceValue = 50000 ether;
        uint256 dueDate = block.timestamp + 30 days;

        vm.startPrank(business1);

        vm.expectEmit(true, true, true, true);
        emit InvoiceCreated(0, business1, debtorName, faceValue, dueDate);

        uint256 tokenId = invoiceNFT.createInvoice(debtorName, faceValue, dueDate);

        (
            address issuer,
            string memory storedDebtorName,
            uint256 storedFaceValue,
            uint256 storedDueDate,
            uint256 riskScore,
            bool isPaid,
            bool isVerified,
            uint256 createdAt
        ) = invoiceNFT.invoices(tokenId);

        assertEq(tokenId, 0);
        assertEq(issuer, business1);

        assertEq(issuer, business1);
        assertEq(storedDebtorName, debtorName);
        assertEq(storedFaceValue, faceValue);
        assertEq(storedDueDate, dueDate);
        assertEq(riskScore, 0);
        assertFalse(isPaid);
        assertFalse(isVerified);
        assertEq(createdAt, block.timestamp);

        vm.stopPrank();
    }

    function testCreatingMultipleInvoices() public {
        vm.startPrank(business1);

        uint256 tokenId1 = invoiceNFT.createInvoice(
            "Company A",
            10000 ether,
            block.timestamp + 15 days
        );
        uint256 tokenId2 = invoiceNFT.createInvoice(
            "Company B",
            20000 ether,
            block.timestamp + 30 days
        );
        uint256 tokenId3 = invoiceNFT.createInvoice(
            "Company C",
            30000 ether,
            block.timestamp + 45 days
        );

        assertEq(tokenId1, 0);
        assertEq(tokenId2, 1);
        assertEq(tokenId3, 2);

        assertEq(invoiceNFT.ownerOf(tokenId1), business1);
        assertEq(invoiceNFT.ownerOf(tokenId2), business1);
        assertEq(invoiceNFT.ownerOf(tokenId3), business1);

        vm.stopPrank();
    }

    function testCannotCreateInvoiceWithPastDueDate() public {
        vm.startPrank(business1);

        vm.expectRevert();
        invoiceNFT.createInvoice("Company A", 10000 ether, block.timestamp - 1);

        vm.stopPrank();
    }

    function testCannotCreateInvoiceWithZeroFaceValue() public {
        vm.startPrank(business1);

        vm.expectRevert();
        invoiceNFT.createInvoice("Company A", 0, block.timestamp + 30 days);

        vm.stopPrank();
    }

    function testCreateInvoiceWithInvalidDueDate() public {
        vm.startPrank(business1);

        vm.expectRevert();
        invoiceNFT.createInvoice("Company A", 10000 ether, block.timestamp - 1);

        vm.stopPrank();
    }

    // ====================== VERIFICATION TESTS ======================

    function testSetVerificationSource() public {
        string memory source = "function verifyInvoice() { return true; }";

        vm.startPrank(deployer);

        invoiceVerifier.setVerificationSource(source);
        assertEq(invoiceVerifier.verificationSource(), source);

        vm.stopPrank();
    }

    function testOnlyOwnerCanSetVerificationSource() public {
        string memory source = "function verifyInvoice() { return true; }";

        vm.startPrank(attacker);

        vm.expectRevert();
        invoiceVerifier.setVerificationSource(source);

        vm.stopPrank();
    }

    function testVerifyInvoice() public {
        string memory debtorName = "Apple Inc.";
        uint256 faceValue = 50000 ether;
        uint256 dueDate = block.timestamp + 30 days;

        vm.prank(business1);
        uint256 tokenId = invoiceNFT.createInvoice(debtorName, faceValue, dueDate);

        // Verify the invoice manually (simulating the off-chain verification process)
        vm.prank(deployer);
        invoiceVerifier.manualVerify(tokenId, 20);

        (,,,, uint256 riskScore, , bool isVerified,) = invoiceNFT.invoices(tokenId);

        assertEq(riskScore, 20);
        assertTrue(isVerified);
    }

    function testOnlyOwnerCanVerify() public {
        string memory debtorName = "Apple Inc.";
        uint256 faceValue = 50000 ether;
        uint256 dueDate = block.timestamp + 30 days;

        vm.prank(business1);
        uint256 tokenId = invoiceNFT.createInvoice(debtorName, faceValue, dueDate);

        vm.prank(attacker);
        vm.expectRevert();
        invoiceNFT.markVerified(tokenId, 100);
    }

    function testOwnerCanVerify() public {
        string memory debtorName = "Apple Inc.";
        uint256 faceValue = 50000 ether;
        uint256 dueDate = block.timestamp + 30 days;

        vm.prank(business1);
        uint256 tokenId = invoiceNFT.createInvoice(debtorName, faceValue, dueDate);

        vm.prank(deployer);
        invoiceNFT.markVerified(tokenId, 10);

        (,,,, uint256 riskScore, , bool isVerified,) = invoiceNFT.invoices(tokenId);

        assertEq(riskScore, 10);
        assertTrue(isVerified);
    }

    function testCannotVerifyWithInvalidRiskScore() public {
        vm.prank(business1);
        uint256 tokenId = invoiceNFT.createInvoice(
            "Apple Inc",
            50000 ether,
            block.timestamp + 60 days
        );
        
        vm.prank(deployer);
        vm.expectRevert();
        invoiceNFT.markVerified(tokenId, 101);
    }
    
    function testCannotVerifyNonexistentInvoice() public {
        vm.prank(deployer);
        vm.expectRevert();
        invoiceNFT.markVerified(999, 85);
    }
    
    function testCannotVerifyTwice() public {
        vm.prank(business1);
        uint256 tokenId = invoiceNFT.createInvoice(
            "Apple Inc",
            50000 ether,
            block.timestamp + 60 days
        );
        
        vm.startPrank(deployer);
        invoiceVerifier.manualVerify(tokenId, 85);
        
        vm.expectRevert();
        invoiceNFT.markVerified(tokenId, 90);
        vm.stopPrank();
    }
    
    function testVerifyEmitsEvent() public {
        vm.prank(business1);
        uint256 tokenId = invoiceNFT.createInvoice(
            "Apple Inc",
            50000 ether,
            block.timestamp + 60 days
        );
        
        vm.expectEmit(true, false, false, true);
        emit InvoiceVerified(tokenId, 85);
        
        vm.prank(deployer);
        invoiceVerifier.manualVerify(tokenId, 85);
    }
    
    // ========== PAYMENT TESTS ==========
    
    function testMarkAsPaid() public {
        vm.prank(business1);
        uint256 tokenId = invoiceNFT.createInvoice(
            "Apple Inc",
            50000 ether,
            block.timestamp + 60 days
        );

        vm.prank(deployer);
        invoiceNFT.markVerified(tokenId, 85);
        
        vm.prank(address(distributor));
        invoiceNFT.markAsPaid(tokenId);
        
        (,,,,, bool isPaid,,) = invoiceNFT.invoices(tokenId);
        assertTrue(isPaid);
    }
    
    function testOnlyDistributorCanMarkPaid() public {
        vm.prank(business1);
        uint256 tokenId = invoiceNFT.createInvoice(
            "Apple Inc",
            50000 ether,
            block.timestamp + 60 days
        );
        
        vm.prank(attacker);
        vm.expectRevert();
        invoiceNFT.markAsPaid(tokenId);
    }
    
    function testCannotMarkPaidTwice() public {
        vm.prank(business1);
        uint256 tokenId = invoiceNFT.createInvoice(
            "Apple Inc",
            50000 ether,
            block.timestamp + 60 days
        );
        vm.prank(deployer);
        invoiceNFT.markVerified(tokenId, 90);

        vm.startPrank(address(distributor));
        invoiceNFT.markAsPaid(tokenId);
        
        vm.expectRevert();
        invoiceNFT.markAsPaid(tokenId);
        vm.stopPrank();
    }
    
    // function testMarkPaidEmitsEvent() public {
    //     vm.prank(business1);
    //     uint256 tokenId = invoiceNFT.createInvoice(
    //         "Apple Inc",
    //         50000 ether,
    //         block.timestamp + 60 days
    //     );
        
    //     vm.expectEmit(true, false, false, false);
    //     emit InvoicePaid(tokenId, business1);
        
    //     vm.prank(address(distributor));
    //     invoiceNFT.markAsPaid(tokenId);
    // }
    
    // ================= VIEW FUNCTION TESTS ===============
    
    function testGetInvoice() public {
        vm.prank(business1);
        uint256 tokenId = invoiceNFT.createInvoice(
            "Apple Inc",
            50000 ether,
            block.timestamp + 60 days
        );
        
        InvoiceNFT.Invoice memory invoice = invoiceNFT.getInvoice(tokenId);
        
        assertEq(invoice.issuer, business1);
        assertEq(invoice.debtorName, "Apple Inc");
        assertEq(invoice.faceValue, 50000 ether);
    }
    
    function testIsVerified() public {
        vm.prank(business1);
        uint256 tokenId = invoiceNFT.createInvoice(
            "Apple Inc",
            50000 ether,
            block.timestamp + 60 days
        );
        
        assertFalse(invoiceNFT.isVerified(tokenId));
        
        vm.prank(deployer);
        invoiceVerifier.manualVerify(tokenId, 85);
        
        assertTrue(invoiceNFT.isVerified(tokenId));
    }
    
    // ========== VERIFIER MANAGEMENT TESTS ==========
    
    function testSetVerifier() public {
        address newVerifier = address(99);
        
        vm.prank(deployer);
        invoiceNFT.setVerifier(newVerifier);
        
        assertEq(invoiceNFT.verifier(), newVerifier);
    }
    
    function testOnlyOwnerCanSetVerifier() public {
        address newVerifier = address(99);
        
        vm.prank(attacker);
        vm.expectRevert();
        invoiceNFT.setVerifier(newVerifier);
    }
    
    function testCannotSetZeroAddressVerifier() public {
        vm.prank(deployer);
        vm.expectRevert();
        invoiceNFT.setVerifier(address(0));
    }
    
    // ========== NFT STANDARD TESTS ==========
    
    function testTransferInvoice() public {
        vm.prank(business1);
        uint256 tokenId = invoiceNFT.createInvoice(
            "Apple Inc",
            50000 ether,
            block.timestamp + 60 days
        );
        
        vm.prank(business1);
        invoiceNFT.transferFrom(business1, business2, tokenId);
        
        assertEq(invoiceNFT.ownerOf(tokenId), business2);
    }
    
    function testApproveAndTransfer() public {
        vm.prank(business1);
        uint256 tokenId = invoiceNFT.createInvoice(
            "Apple Inc",
            50000 ether,
            block.timestamp + 60 days
        );
        
        vm.prank(business1);
        invoiceNFT.approve(business2, tokenId);
        
        assertEq(invoiceNFT.getApproved(tokenId), business2);
        
        vm.prank(business2);
        invoiceNFT.transferFrom(business1, business2, tokenId);
        
        assertEq(invoiceNFT.ownerOf(tokenId), business2);
    }
}