// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {InvoiceNFT} from "../src/InvoiceNFT.sol";
import {InvoiceVerifier} from "../src/cre/InvoiceVerifier.sol";
import {InvoiceFractionalizationPool} from "../src/InvoiceFractionalizationPool.sol";
import {PaymentDistributor} from "../src/PaymentDistributor.sol";

contract IntegrationTest is Test {
    InvoiceNFT public invoiceNFT;
    InvoiceVerifier public verifier;
    InvoiceFractionalizationPool public pool;
    PaymentDistributor public distributor;
    
    address deployer = address(1);
    address business = address(2);
    address investor1 = address(3);
    address investor2 = address(4);
    address debtor = address(5);
    
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
        vm.deal(debtor, 100000 ether);
    }
    
    function testCompleteInvoiceLifecycle() public {
        console.log("\n=== COMPLETE INVOICE LIFECYCLE TEST ===\n");
        
        // 1. Business mints invoice
        console.log("1. Business mints invoice...");
        vm.prank(business);
        uint256 tokenId = invoiceNFT.createInvoice(
            "BigBox Retailers",
            50000 ether,
            block.timestamp + 60 days
        );
        assertEq(invoiceNFT.ownerOf(tokenId), business);
        console.log("   Invoice minted with ID:", tokenId);
        
        // 2. Chainlink verifies
        console.log("2. Chainlink verifies invoice...");
        vm.prank(deployer);
        verifier.manualVerify(tokenId, 85);
        (,,,, uint256 riskScore,, bool isVerified,) = invoiceNFT.invoices(tokenId);
        assertTrue(isVerified);
        assertEq(riskScore, 85);
        console.log("   Risk score: 85/100");
        
        // 3. Business fractionalizes
        console.log("3. Business fractionalizes invoice...");
        vm.startPrank(business);
        invoiceNFT.approve(address(pool), tokenId);
        uint256 fractionId = pool.fractionalizeInvoice(tokenId, 100, 480 ether);
        vm.stopPrank();
        assertEq(invoiceNFT.ownerOf(tokenId), address(pool));
        console.log("   Fractionalized into 100 fractions at 480 ETH each");
        
        // 4. Wait for cooldown
        console.log("4. Waiting for cooldown period...");
        vm.warp(block.timestamp + 6 minutes);
        
        // 5. Investors purchase
        console.log("5. Investors purchase fractions...");
        uint256 businessProceedsBefore = pool.pendingWithdrawals(business);
        
        vm.prank(investor1);
        pool.buyFractions{value: 28800 ether}(fractionId, 60);
        console.log("   Investor1 bought 60 fractions");
        
        vm.prank(investor2);
        pool.buyFractions{value: 19200 ether}(fractionId, 40);
        console.log("   Investor2 bought 40 fractions");
        
        uint256 totalInvested = 28800 ether + 19200 ether;
        uint256 businessProceeds = pool.pendingWithdrawals(business) - businessProceedsBefore;
        console.log("   Business earned:", businessProceeds / 1 ether, "ETH");
        
        // 6. Business withdraws proceeds
        console.log("6. Business withdraws proceeds...");
        uint256 balanceBefore = business.balance;
        vm.prank(business);
        pool.withdrawProceeds();
        assertEq(business.balance, balanceBefore + businessProceeds);
        
        // 7. Debtor pays invoice
        console.log("7. Debtor pays invoice...");
        vm.prank(debtor);
        distributor.receivePayment{value: 50000 ether}(tokenId);
        console.log("   Payment of 50,000 ETH received");
        
        (,,,,, bool isPaid,,) = invoiceNFT.invoices(tokenId);
        assertTrue(isPaid);
        
        // 8. Investors claim
        console.log("8. Investors claim their payouts...");
        uint256 investor1BalanceBefore = investor1.balance;
        uint256 investor2BalanceBefore = investor2.balance;
        
        vm.prank(investor1);
        distributor.claim(tokenId);
        
        vm.prank(investor2);
        distributor.claim(tokenId);
        
        uint256 investor1Payout = investor1.balance - investor1BalanceBefore;
        uint256 investor2Payout = investor2.balance - investor2BalanceBefore;
        
        assertEq(investor1Payout, 30000 ether); // 60% of 50000
        assertEq(investor2Payout, 20000 ether); // 40% of 50000
        
        console.log("   Investor1 received:", investor1Payout / 1 ether, "ETH");
        console.log("   Investor2 received:", investor2Payout / 1 ether, "ETH");
        
        // 9. Calculate ROI
        console.log("\n9. Investment Returns:");
        uint256 investor1Profit = investor1Payout - 28800 ether;
        uint256 investor2Profit = investor2Payout - 19200 ether;
        
        console.log("   Investor1 profit:", investor1Profit / 1 ether, "ETH (4.17% ROI)");
        console.log("   Investor2 profit:", investor2Profit / 1 ether, "ETH (4.17% ROI)");
        
        console.log("\n=== LIFECYCLE COMPLETE ===\n");
    }
    
    function testTransferAndClaim() public {
        console.log("\n=== TRANSFER AND CLAIM TEST ===\n");
        
        // Setup
        vm.prank(business);
        uint256 tokenId = invoiceNFT.createInvoice("Company", 50000 ether, block.timestamp + 60 days);
        
        vm.prank(deployer);
        verifier.manualVerify(tokenId, 85);
        
        vm.startPrank(business);
        invoiceNFT.approve(address(pool), tokenId);
        uint256 fractionId = pool.fractionalizeInvoice(tokenId, 100, 480 ether);
        vm.stopPrank();
        
        vm.warp(block.timestamp + 6 minutes);
        
        // Investor1 buys all
        vm.prank(investor1);
        pool.buyFractions{value: 48000 ether}(fractionId, 100);
        
        // Investor1 transfers half to investor2
        console.log("Investor1 transfers 50 fractions to Investor2");
        vm.prank(investor1);
        pool.safeTransferFrom(investor1, investor2, fractionId, 50, "");
        
        assertEq(pool.balanceOf(investor1, fractionId), 50);
        assertEq(pool.balanceOf(investor2, fractionId), 50);
        
        // Payment received
        vm.prank(debtor);
        distributor.receivePayment{value: 50000 ether}(tokenId);
        
        // Both claim
        uint256 investor1Before = investor1.balance;
        uint256 investor2Before = investor2.balance;
        
        vm.prank(investor1);
        distributor.claim(tokenId);
        
        vm.prank(investor2);
        distributor.claim(tokenId);
        
        console.log("Investor1 received:", (investor1.balance - investor1Before) / 1 ether, "ETH");
        console.log("Investor2 received:", (investor2.balance - investor2Before) / 1 ether, "ETH");
        
        assertEq(investor1.balance - investor1Before, 25000 ether);
        assertEq(investor2.balance - investor2Before, 25000 ether);
        
        console.log("\n=== TRANSFER TEST COMPLETE ===\n");
    }
}