// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {InvoiceNFT} from "../src/InvoiceNFT.sol";
import {InvoiceVerifier} from "../src/cre/InvoiceVerifier.sol";
import {InvoiceFractionalizationPool} from "../src/InvoiceFractionalizationPool.sol";
import {PaymentDistributor} from "../src/PaymentDistributor.sol";

contract PaymentDistributorTest is Test {
    InvoiceNFT public invoiceNFT;
    InvoiceVerifier public verifier;
    InvoiceFractionalizationPool public pool;
    PaymentDistributor public distributor;
    
    address deployer = address(1);
    address business = address(2);
    address investor1 = address(3);
    address investor2 = address(4);
    address payer = address(5);
    
    address mockRouter = address(6);
    bytes32 mockDonId = bytes32(uint256(1));
    uint64 mockSubId = 1;
    
    function setUp() public {
        vm.startPrank(deployer);
        
        invoiceNFT = new InvoiceNFT();
        verifier = new InvoiceVerifier(address(invoiceNFT), mockDonId, mockSubId, mockRouter);
        invoiceNFT.setVerifier(address(verifier));
        pool = new InvoiceFractionalizationPool(address(invoiceNFT));
        distributor = new PaymentDistributor(address(invoiceNFT), address(pool));
        
        pool.setPaymentDistributor(address(distributor));
        invoiceNFT.setPaymentDistributor(address(distributor));
        
        vm.stopPrank();
        
        vm.deal(business, 100 ether);
        vm.deal(investor1, 100000 ether);
        vm.deal(investor2, 100000 ether);
        vm.deal(payer, 100000 ether);
    }
    
    function _setupComplete() internal returns (uint256 tokenId, uint256 fractionId) {
        string memory debtorName = "Apple Inc";
        uint256 faceValue = 50000 ether;
        uint256 dueDate = block.timestamp + 60 days;

        vm.prank(business);
        tokenId = invoiceNFT.createInvoice(debtorName, faceValue, dueDate);
        
        vm.prank(deployer);
        verifier.manualVerify(tokenId, 85);
        
        vm.startPrank(business);
        invoiceNFT.approve(address(pool), tokenId);
        fractionId = pool.fractionalizeInvoice(tokenId, 100, 480 ether);
        vm.stopPrank();
        
        vm.warp(block.timestamp + 6 minutes);
        
        vm.prank(investor1);
        pool.buyFractions{value: 28800 ether}(fractionId, 60);
        
        vm.prank(investor2);
        pool.buyFractions{value: 19200 ether}(fractionId, 40);
    }
    
    // ========== RECEIVE PAYMENT TESTS ==========
    
    function testReceivePayment() public {
        (uint256 tokenId,) = _setupComplete();
        
        vm.prank(payer);
        distributor.receivePayment{value: 50000 ether}(tokenId);
        
        (uint256 totalPayment, uint256 paymentPerFraction, bool isPaid) = distributor.distributions(tokenId);
        
        assertEq(totalPayment, 50000 ether);
        assertEq(paymentPerFraction, 500 ether); // 50000 / 100
        assertTrue(isPaid);
        assertEq(distributor.paymentAmounts(tokenId), 50000 ether);
        
        (,,,,, bool invoicePaid,,) = invoiceNFT.invoices(tokenId);
        assertTrue(invoicePaid);
    }
    
    function testCannotReceivePaymentForUnverified() public {
        vm.prank(business);
        uint256 tokenId = invoiceNFT.createInvoice("Apple Inc", 50000 ether, block.timestamp + 60 days);
        
        vm.prank(payer);
        vm.expectRevert(abi.encodeWithSignature("InvoiceNotVerified(uint256)", tokenId));
        distributor.receivePayment{value: 50000 ether}(tokenId);
    }
    
    function testCannotReceivePaymentBelowThreshold() public {
        (uint256 tokenId,) = _setupComplete();
        
        vm.prank(payer);
        vm.expectRevert();
        distributor.receivePayment{value: 0.0001 ether}(tokenId);
    }
    
    function testCannotReceivePaymentForUnfractionalized() public {
        vm.prank(business);
        uint256 tokenId = invoiceNFT.createInvoice("Apple Inc", 50000 ether, block.timestamp + 60 days);
        
        vm.prank(deployer);
        verifier.manualVerify(tokenId, 85);
        
        vm.prank(payer);
        vm.expectRevert(abi.encodeWithSignature("InvoiceNotFractionalized(uint256)", tokenId));
        distributor.receivePayment{value: 50000 ether}(tokenId);
    }
    
    function testCannotReceivePaymentTwice() public {
        (uint256 tokenId,) = _setupComplete();
        
        vm.prank(payer);
        distributor.receivePayment{value: 50000 ether}(tokenId);
        
        vm.prank(payer);
        vm.expectRevert(abi.encodeWithSignature("InvoiceAlreadyPaid(uint256)", tokenId));
        distributor.receivePayment{value: 50000 ether}(tokenId);
    }
    
    function testCannotReceiveInsufficientPayment() public {
        (uint256 tokenId,) = _setupComplete();
        
        vm.prank(payer);
        vm.expectRevert();
        distributor.receivePayment{value: 40000 ether}(tokenId); // Only 80%
    }

    function testCannotReceivePaymentForNonexistentInvoice() public {
        vm.prank(payer);
        vm.expectRevert();
        distributor.receivePayment{value: 50000 ether}(999);
    }

    function testCannotReceiveDirectEther() public {
        vm.prank(payer);
        (bool success, ) = address(distributor).call{value: 1 ether}("");
        assertFalse(success);
    }

    function testCanReceiveMinimumAcceptableFacevalue() public {
        (uint256 tokenId,) = _setupComplete();

        (,, uint256 faceValue,,,,,) = invoiceNFT.invoices(tokenId); // Get invoice details to confirm setup
        uint256 minimumAcceptable = (faceValue * 90) / 100; // 90% of face value
        
        vm.prank(payer);
        distributor.receivePayment{value: minimumAcceptable}(tokenId);
        
        (uint256 totalPayment,, bool isPaid) = distributor.distributions(tokenId);
        assertEq(totalPayment, minimumAcceptable);
        assertTrue(isPaid);
    }

    function testReceivePaymentEmitsEvent() public {
        (uint256 tokenId,) = _setupComplete();
        
        vm.prank(payer);
        vm.expectEmit(true, true, true, true);
        emit PaymentDistributor.PaymentReceived(tokenId, 50000 ether, payer, block.timestamp);
        distributor.receivePayment{value: 50000 ether}(tokenId);
    }
    
    // ========== CLAIM TESTS ==========
    
    function testClaim() public {
        (uint256 tokenId,) = _setupComplete();
        
        vm.prank(payer);
        distributor.receivePayment{value: 50000 ether}(tokenId);
        
        uint256 balanceBefore = investor1.balance;
        
        vm.prank(investor1);
        distributor.claim(tokenId);
        
        // 60 fractions × 500 ETH = 30000 ETH
        assertEq(investor1.balance, balanceBefore + 30000 ether);
        assertTrue(distributor.hasClaimed(tokenId, investor1));
    }
    
    function testCannotClaimBeforePayment() public {
        (uint256 tokenId,) = _setupComplete();
        
        vm.prank(investor1);
        vm.expectRevert(abi.encodeWithSignature("InvoiceNotPaid(uint256)", tokenId));
        distributor.claim(tokenId);
    }
    
    function testCannotClaimTwice() public {
        (uint256 tokenId,) = _setupComplete();
        
        vm.prank(payer);
        distributor.receivePayment{value: 50000 ether}(tokenId);
        
        vm.startPrank(investor1);
        distributor.claim(tokenId);
        
        vm.expectRevert(abi.encodeWithSignature("AlreadyClaimed(uint256)", tokenId));
        distributor.claim(tokenId);
        vm.stopPrank();
    }
    
    function testCannotClaimWithNoFractions() public {
        (uint256 tokenId,) = _setupComplete();
        
        vm.prank(payer);
        distributor.receivePayment{value: 50000 ether}(tokenId);
        
        vm.prank(address(999));
        vm.expectRevert(abi.encodeWithSignature("NothingToClaim()"));
        distributor.claim(tokenId);
    }
    
    function testClaimBurnsTokens() public {
        (uint256 tokenId, uint256 fractionId) = _setupComplete();
        
        vm.prank(payer);
        distributor.receivePayment{value: 50000 ether}(tokenId);
        
        assertEq(pool.balanceOf(investor1, fractionId), 60);
        
        vm.prank(investor1);
        distributor.claim(tokenId);
        
        assertEq(pool.balanceOf(investor1, fractionId), 0);
    }
    
    function testMultipleInvestorsClaim() public {
        (uint256 tokenId,) = _setupComplete();
        
        vm.prank(payer);
        distributor.receivePayment{value: 50000 ether}(tokenId);
        
        uint256 investor1BalanceBefore = investor1.balance;
        uint256 investor2BalanceBefore = investor2.balance;
        
        vm.prank(investor1);
        distributor.claim(tokenId);
        
        vm.prank(investor2);
        distributor.claim(tokenId);
        
        assertEq(investor1.balance, investor1BalanceBefore + 30000 ether); // 60%
        assertEq(investor2.balance, investor2BalanceBefore + 20000 ether); // 40%
    }
    
    // ========== CLAIMABLE TESTS ==========
    
    function testClaimable() public {
        (uint256 tokenId,) = _setupComplete();
        
        assertEq(distributor.claimable(investor1, tokenId), 0); // Not paid yet
        
        vm.prank(payer);
        distributor.receivePayment{value: 50000 ether}(tokenId);
        
        assertEq(distributor.claimable(investor1, tokenId), 30000 ether);
        assertEq(distributor.claimable(investor2, tokenId), 20000 ether);
        
        vm.prank(investor1);
        distributor.claim(tokenId);
        
        assertEq(distributor.claimable(investor1, tokenId), 0); // Already claimed
    }
    
    // ========== TRANSFER THEN CLAIM TESTS ==========
    
    function testClaimReflectsTransfers() public {
        (uint256 tokenId, uint256 fractionId) = _setupComplete();
        
        // Investor1 transfers all to investor2
        vm.prank(investor1);
        pool.safeTransferFrom(investor1, investor2, fractionId, 60, "");
        
        vm.prank(payer);
        distributor.receivePayment{value: 50000 ether}(tokenId);
        
        // Investor1 has nothing to claim
        vm.prank(investor1);
        vm.expectRevert(abi.encodeWithSignature("NothingToClaim()"));
        distributor.claim(tokenId);
        
        // Investor2 can claim everything
        uint256 balanceBefore = investor2.balance;
        
        vm.prank(investor2);
        distributor.claim(tokenId);
        
        assertEq(investor2.balance, balanceBefore + 50000 ether); // All 100 fractions
    }

    // ========== CONFIGURATION TESTS ==========
    
    function testUpdateMinimumPaymentThreshold() public {
        uint256 newThreshold = 1 ether;
        
        vm.prank(deployer);
        distributor.updateMinimumDistributionThreshold(newThreshold);
        
        assertEq(distributor.minimumDistributionThreshold(), newThreshold);
    }
    
    function testOnlyOwnerCanUpdateThreshold() public {
        vm.prank(business);
        vm.expectRevert();
        distributor.updateMinimumDistributionThreshold(1 ether);
    }
}