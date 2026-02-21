// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {InvoiceNFT} from "../src/InvoiceNFT.sol";
import {InvoiceVerifier} from "../src/cre/InvoiceVerifier.sol";
import {InvoiceFractionalizationPool} from "../src/InvoiceFractionalizationPool.sol";
import {PaymentDistributor} from "../src/PaymentDistributor.sol";

contract InvoiceFractionalizationPoolTest is Test {
    InvoiceNFT public invoiceNFT;
    InvoiceVerifier public verifier;
    InvoiceFractionalizationPool public pool;
    PaymentDistributor public distributor;
    
    address deployer = address(1);
    address business = address(2);
    address investor1 = address(3);
    address investor2 = address(4);
    address investor3 = address(5);
    
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
        invoiceNFT.setPaymentDistributor(address(distributor));
        pool.setPaymentDistributor(address(distributor));
        
        vm.stopPrank();
        
        vm.deal(business, 100 ether);
        vm.deal(investor1, 100000 ether);
        vm.deal(investor2, 100000 ether);
        vm.deal(investor3, 100000 ether);
        // vm.deal(payer, 100000 ether);
    }
    
    function _setupInvoice() internal returns (uint256) {
        string memory debtorName = "Apple Inc";
        uint256 faceValue = 50000 ether;
        uint256 dueDate = block.timestamp + 60 days;

        vm.prank(business);
        uint256 tokenId = invoiceNFT.createInvoice(
            debtorName,
            faceValue,
            dueDate
        );
        
        vm.prank(deployer);
        verifier.manualVerify(tokenId, 85);
        
        return tokenId;
    }
    
    function _setupAndFractionalize() internal returns (uint256 tokenId, uint256 fractionId) {
        tokenId = _setupInvoice();
        
        vm.startPrank(business);
        invoiceNFT.approve(address(pool), tokenId);
        fractionId = pool.fractionalizeInvoice(tokenId, 100, 480 ether);
        vm.stopPrank();
    }
    
    // ========== FRACTIONALIZATION TESTS ==========
    
    function testFractionalizeInvoice() public {
        uint256 tokenId = _setupInvoice();
        
        vm.startPrank(business);
        invoiceNFT.approve(address(pool), tokenId);
        uint256 fractionId = pool.fractionalizeInvoice(tokenId, 100, 480 ether);
        vm.stopPrank();
        
        assertEq(fractionId, 1); // Counter starts at 1
        assertEq(invoiceNFT.ownerOf(tokenId), address(pool));
        assertEq(pool.invoiceToFractionId(tokenId), fractionId);
        
        (
            uint256 invoiceId,
            uint256 totalFractions,
            uint256 fractionsSold,
            uint256 pricePerFraction,
            address issuer,
            bool isActive
        ) = pool.getFractionInfo(fractionId);
        
        assertEq(invoiceId, tokenId);
        assertEq(totalFractions, 100);
        assertEq(fractionsSold, 0);
        assertEq(pricePerFraction, 480 ether);
        assertEq(issuer, business);
        assertTrue(isActive);
    }
    
    function testCannotFractionalizeUnverified() public {
        vm.prank(business);
        uint256 tokenId = invoiceNFT.createInvoice("Apple Inc", 50000 ether, block.timestamp + 60 days);
        
        vm.startPrank(business);
        invoiceNFT.approve(address(pool), tokenId);
        
        vm.expectRevert(abi.encodeWithSignature("InvoiceNotVerified(uint256)", tokenId));
        pool.fractionalizeInvoice(tokenId, 100, 480 ether);
        vm.stopPrank();
    }
    
    function testCannotFractionalizeWithoutApproval() public {
        uint256 tokenId = _setupInvoice();
        
        vm.prank(business);
        vm.expectRevert(abi.encodeWithSignature("InvoiceNotApproved(uint256)", tokenId));
        pool.fractionalizeInvoice(tokenId, 100, 480 ether);
    }
    
    function testCannotFractionalizeExpired() public {
        vm.prank(business);
        uint256 tokenId = invoiceNFT.createInvoice("Apple Inc", 50000 ether, block.timestamp + 1 days);
        
        vm.prank(deployer);
        verifier.manualVerify(tokenId, 85);
        
        vm.warp(block.timestamp + 2 days);
        
        vm.startPrank(business);
        invoiceNFT.approve(address(pool), tokenId);
        
        vm.expectRevert();
        pool.fractionalizeInvoice(tokenId, 100, 480 ether);
        vm.stopPrank();
    }
    
    function testCannotFractionalizeTwice() public {
        (uint256 tokenId, ) = _setupAndFractionalize();
        
        vm.startPrank(business);
        vm.expectRevert(abi.encodeWithSignature("NotInvoiceOwner(address,address)", business, invoiceNFT.ownerOf(tokenId)));

        pool.fractionalizeInvoice(tokenId, 100, 480 ether);
        vm.stopPrank();
    }
    
    function testCannotFractionalizeWithInvalidCount() public {
        uint256 tokenId = _setupInvoice();
        
        vm.startPrank(business);
        invoiceNFT.approve(address(pool), tokenId);
        
        vm.expectRevert(abi.encodeWithSignature("InvalidFractionCount(uint256)", 0));
        pool.fractionalizeInvoice(tokenId, 0, 480 ether);
        
        vm.expectRevert(abi.encodeWithSignature("InvalidFractionCount(uint256)", 1001));
        pool.fractionalizeInvoice(tokenId, 1001, 480 ether);
        vm.stopPrank();
    }
    
    // ========== BUY FRACTIONS TESTS ==========
    
    function testBuyFractions() public {
        (, uint256 fractionId) = _setupAndFractionalize();
        
        vm.warp(block.timestamp + 6 minutes);
        
        uint256 businessBalanceBefore = business.balance;
        
        vm.prank(investor1);
        pool.buyFractions{value: 24000 ether}(fractionId, 50);
        
        assertEq(pool.balanceOf(investor1, fractionId), 50);
        
        // Business gets 97.5% (2.5% platform fee)
        uint256 expectedProceeds = (24000 ether * 975) / 1000;
        assertEq(pool.pendingWithdrawals(business), expectedProceeds);
        assertEq(pool.platformFees(), 24000 ether - expectedProceeds);
    }
    
    function testCannotBuyDuringCooldown() public {
        (, uint256 fractionId) = _setupAndFractionalize();
        
        // Try immediately (within cooldown)
        vm.prank(investor1);
        vm.expectRevert();
        pool.buyFractions{value: 24000 ether}(fractionId, 50);
    }
    
    function testCannotBuyZeroFractions() public {
        (, uint256 fractionId) = _setupAndFractionalize();
        
        vm.warp(block.timestamp + 6 minutes);
        
        vm.prank(investor1);
        vm.expectRevert(abi.encodeWithSignature("InvalidAmount(uint256)", 0));
        pool.buyFractions{value: 0}(fractionId, 0);
    }
    
    function testCannotBuyMoreThanAvailable() public {
        (, uint256 fractionId) = _setupAndFractionalize();
        
        vm.warp(block.timestamp + 6 minutes);
        
        vm.prank(investor1);
        vm.expectRevert();
        pool.buyFractions{value: 50000 ether}(fractionId, 101);
    }
    
    function testCannotBuyWithInsufficientPayment() public {
        (, uint256 fractionId) = _setupAndFractionalize();
        
        vm.warp(block.timestamp + 6 minutes);
        
        vm.prank(investor1);
        vm.expectRevert();
        pool.buyFractions{value: 1000 ether}(fractionId, 50); // Need 24000
    }
    
    function testRefundsExcessPayment() public {
        (, uint256 fractionId) = _setupAndFractionalize();
        
        vm.warp(block.timestamp + 6 minutes);
        
        uint256 balanceBefore = investor1.balance;
        
        vm.prank(investor1);
        pool.buyFractions{value: 30000 ether}(fractionId, 50); // Send extra 6000
        
        uint256 cost = 50 * 480 ether;
        assertEq(investor1.balance, balanceBefore - cost);
    }
    
    function testDeactivatesWhenFullySold() public {
        (, uint256 fractionId) = _setupAndFractionalize();
        
        vm.warp(block.timestamp + 6 minutes);
        
        vm.prank(investor1);
        pool.buyFractions{value: 48000 ether}(fractionId, 100);
        
        (,,,,, bool isActive) = pool.getFractionInfo(fractionId);
        assertFalse(isActive);
    }
    
    // ========== WITHDRAW PROCEEDS TESTS ==========
    
    function testWithdrawProceeds() public {
        (, uint256 fractionId) = _setupAndFractionalize();
        
        vm.warp(block.timestamp + 6 minutes);
        
        vm.prank(investor1);
        pool.buyFractions{value: 24000 ether}(fractionId, 50);
        
        uint256 expectedProceeds = (24000 ether * 975) / 1000;
        uint256 balanceBefore = business.balance;
        
        vm.prank(business);
        pool.withdrawProceeds();
        
        assertEq(business.balance, balanceBefore + expectedProceeds);
        assertEq(pool.pendingWithdrawals(business), 0);
    }
    
    function testCannotWithdrawWithNoProceeds() public {
        vm.prank(business);
        vm.expectRevert(abi.encodeWithSignature("InvalidAmount(uint256)", 0));
        pool.withdrawProceeds();
    }
    
    function testProceedsAccumulateAcrossMultipleSales() public {
        (, uint256 fractionId) = _setupAndFractionalize();
        
        vm.warp(block.timestamp + 6 minutes);
        
        vm.prank(investor1);
        pool.buyFractions{value: 14400 ether}(fractionId, 30);
        
        vm.prank(investor2);
        pool.buyFractions{value: 9600 ether}(fractionId, 20);
        
        uint256 expectedTotal = ((14400 ether + 9600 ether) * 975) / 1000;
        assertEq(pool.pendingWithdrawals(business), expectedTotal);
    }
    
    // ========== RECLAIM TESTS ==========
    
    function testReclaimInvoice() public {
        (uint256 tokenId, uint256 fractionId) = _setupAndFractionalize();
        
        vm.prank(business);
        pool.reclaimInvoice(fractionId);
        
        assertEq(invoiceNFT.ownerOf(tokenId), business);
        assertEq(pool.invoiceToFractionId(tokenId), 0);
    }
    
    function testCannotReclaimWithFractionsSold() public {
        (, uint256 fractionId) = _setupAndFractionalize();
        
        vm.warp(block.timestamp + 6 minutes);
        
        vm.prank(investor1);
        pool.buyFractions{value: 4800 ether}(fractionId, 10);
        
        vm.prank(business);
        vm.expectRevert();
        pool.reclaimInvoice(fractionId);
    }
    
    function testOnlyIssuerCanReclaim() public {
        (, uint256 fractionId) = _setupAndFractionalize();
        
        vm.prank(investor1);
        vm.expectRevert();
        pool.reclaimInvoice(fractionId);
    }
    
    // ========== BUYOUT TESTS ==========
    
    function testInitiateBuyout() public {
        (, uint256 fractionId) = _setupAndFractionalize();
        
        vm.warp(block.timestamp + 6 minutes);
        
        vm.prank(investor1);
        pool.buyFractions{value: 24000 ether}(fractionId, 50);
        
        // Buyout requires 110% of original price
        uint256 buyoutCost = 50 * 480 ether * 110 / 100;
        
        address buyer = address(99);
        vm.deal(buyer, 100000 ether);
        
        vm.prank(buyer);
        pool.initiateBuyout{value: buyoutCost}(fractionId);
        
        (
            address buyoutBuyer,
            uint256 pricePerFraction,
            uint256 remainingFractions,
            uint256 escrowedAmount,
            bool active,
            bool finalized
        ) = pool.buyouts(fractionId);
        
        assertEq(buyoutBuyer, buyer);
        assertEq(pricePerFraction, 480 ether * 110 / 100);
        assertEq(remainingFractions, 50);
        assertEq(escrowedAmount, buyoutCost);
        assertTrue(active);
        assertFalse(finalized);
    }
    
    function testClaimBuyoutPayment() public {
        (, uint256 fractionId) = _setupAndFractionalize();
        
        vm.warp(block.timestamp + 6 minutes);
        
        vm.prank(investor1);
        pool.buyFractions{value: 24000 ether}(fractionId, 50);
        
        uint256 buyoutCost = 50 * 480 ether * 110 / 100;
        
        address buyer = address(99);
        vm.deal(buyer, 100000 ether);
        
        vm.prank(buyer);
        pool.initiateBuyout{value: buyoutCost}(fractionId);
        
        uint256 balanceBefore = investor1.balance;
        
        vm.prank(investor1);
        pool.claimBuyoutPayment(fractionId);
        
        uint256 expectedPayment = 50 * 480 ether * 110 / 100;
        assertEq(investor1.balance, balanceBefore + expectedPayment);
        assertEq(pool.balanceOf(investor1, fractionId), 0);
    }
    
    function testFinalizeBuyout() public {
        (uint256 tokenId, uint256 fractionId) = _setupAndFractionalize();
        
        vm.warp(block.timestamp + 6 minutes);
        
        vm.prank(investor1);
        pool.buyFractions{value: 48000 ether}(fractionId, 100);

        (,,,,, bool isActive) = pool.getFractionInfo(fractionId);

        assertFalse(isActive);

        // TODO
        
        // uint256 buyoutCost = 100 * 480 ether * 110 / 100;
        
        // address buyer = address(99);
        // vm.deal(buyer, 100000 ether);
        
        // vm.prank(buyer);
        // pool.initiateBuyout{value: buyoutCost}(fractionId);
        
        // vm.prank(investor1);
        // pool.claimBuyoutPayment(fractionId);
        
        // vm.prank(buyer);
        // pool.finalizeBuyout(fractionId);
        
        // assertEq(invoiceNFT.ownerOf(tokenId), buyer);
    }
    
    function testCannotFinalizeBuyoutWithRemainingFractions() public {
        (, uint256 fractionId) = _setupAndFractionalize();
        
        vm.warp(block.timestamp + 6 minutes);
        
        vm.prank(investor1);
        pool.buyFractions{value: 24000 ether}(fractionId, 50);
        
        vm.prank(investor2);
        pool.buyFractions{value: 24000 ether}(fractionId, 40);
        
        uint256 buyoutCost = 100 * 480 ether * 110 / 100;
        
        address buyer = address(99);
        vm.deal(buyer, 100000 ether);
        
        vm.prank(buyer);
        pool.initiateBuyout{value: buyoutCost}(fractionId);
        
        // Only investor1 claims
        vm.prank(investor1);
        pool.claimBuyoutPayment(fractionId);
        
        // Cannot finalize yet
        vm.prank(buyer);
        vm.expectRevert();
        pool.finalizeBuyout(fractionId);
    }
    
    // ========== REDEEM AFTER PAYMENT TESTS ==========
    
    //     function testRedeemAfterPayment() public {
    //     (uint256 tokenId, uint256 fractionId) = _setupAndFractionalize();
        
    //     vm.warp(block.timestamp + 6 minutes);
        
    //     vm.prank(investor1);
    //     pool.buyFractions{value: 48000 ether}(fractionId, 100);
        
    //     // Mark as paid
    //     vm.prank(address(distributor));
    //     invoiceNFT.markAsPaid(tokenId);
        
    //     // All fractions must be burned/returned first
    //     // For this test, simulate all fractions claimed/burned
    //     vm.prank(address(pool));
    //     // In real scenario, PaymentDistributor would call burnOnRepayment
    //     pool.reclaimInvoice(fractionId);
    //     pool.burnOnRepayment(fractionId, investor1, 100);
        
    // }
    // ========== canFractionalize TESTS ==========
    
    function testCanFractionalize() public {
        uint256 tokenId = _setupInvoice();
        
        (bool can, string memory reason) = pool.canFractionalize(tokenId);
        
        assertTrue(can);
        assertEq(reason, "Invoice is eligible for fractionalization");
    }
    
    function testCannotFractionalizeUnverifiedInCanCheck() public {
        vm.prank(business);
        uint256 tokenId = invoiceNFT.createInvoice("Apple Inc", 50000 ether, block.timestamp + 60 days);
        
        (bool can, string memory reason) = pool.canFractionalize(tokenId);
        
        assertFalse(can);
        assertEq(reason, "Invoice not verified");
    }
    
    function testCannotFractionalizeExpiredInCanCheck() public {
        vm.prank(business);
        uint256 tokenId = invoiceNFT.createInvoice("Apple Inc", 50000 ether, block.timestamp + 1 days);
        
        vm.prank(deployer);
        verifier.manualVerify(tokenId, 85);
        
        vm.warp(block.timestamp + 2 days);
        
        (bool can, string memory reason) = pool.canFractionalize(tokenId);
        
        assertFalse(can);
        assertEq(reason, "Invoice expired");
    }

    // ==========  EMERGENCY RELEASE TESTS ==========
    function testEmergencyRelease() public {
        (uint256 tokenId, uint256 fractionId) = _setupAndFractionalize();

        (,,,uint256 dueDate,,,,) = invoiceNFT.invoices(tokenId);
        vm.prank(deployer);
        vm.warp(dueDate + 34 days);
        pool.emergencyRelease(fractionId, business);

        assertEq(invoiceNFT.ownerOf(tokenId), business);
        assertEq(pool.invoiceToFractionId(tokenId), 0);
    }

    function testCannotEmergencyReleaseBeforeDeadline() public {
        (uint256 tokenId, uint256 fractionId) = _setupAndFractionalize();

        (,,,uint256 dueDate,,,,) = invoiceNFT.invoices(tokenId);
        vm.prank(deployer);
        vm.warp(dueDate + 10 days);
        vm.expectRevert();
        pool.emergencyRelease(fractionId, business);
    }

    function testCannotEmergencyReleaseWithInvalidRecipient() public {
        (uint256 tokenId, uint256 fractionId) = _setupAndFractionalize();

        (,,,uint256 dueDate,,,,) = invoiceNFT.invoices(tokenId);
        vm.prank(deployer);
        vm.warp(dueDate + 34 days);
        vm.expectRevert();
        pool.emergencyRelease(fractionId, address(0));
    }

    function testCannotEmergencyReleaseIfNotOwner() public {
        (uint256 tokenId, uint256 fractionId) = _setupAndFractionalize();

        (,,,uint256 dueDate,,,,) = invoiceNFT.invoices(tokenId);
        vm.prank(investor1);
        vm.warp(dueDate + 34 days);
        vm.expectRevert();
        pool.emergencyRelease(fractionId, business);
    }

    function testCannotEmergencyReleaseIfFractionsRemain() public {
        (uint256 tokenId, uint256 fractionId) = _setupAndFractionalize();

        (,,,uint256 dueDate,,,,) = invoiceNFT.invoices(tokenId);

        vm.warp(block.timestamp + 6 minutes);
        vm.prank(investor1);
        pool.buyFractions{value: 4800 ether}(fractionId, 10);

        vm.prank(deployer);
        vm.warp(dueDate + 34 days);
        vm.expectRevert();
        pool.emergencyRelease(fractionId, business);
    }

    // =========== WITHDRAW PLATFORM FEES TESTS ===========

    function testWithdrawPlatformFees() public {
        (, uint256 fractionId) = _setupAndFractionalize();
        
        vm.warp(block.timestamp + 6 minutes);
        
        vm.prank(investor1);
        pool.buyFractions{value: 24000 ether}(fractionId, 50);
        
        uint256 feesBefore = pool.platformFees();
        uint256 balanceBefore = deployer.balance;
        
        vm.prank(deployer);
        pool.withdrawPlatformFees();
        
        assertEq(pool.platformFees(), 0);
        assertEq(deployer.balance, balanceBefore + feesBefore);
    }

    function testCannotWithdrawPlatformFeesIfZero() public {
        vm.prank(deployer);
        vm.expectRevert(abi.encodeWithSignature("InvalidAmount(uint256)", 0));
        pool.withdrawPlatformFees();
    }

    function testOnlyOwnerCanWithdrawPlatformFees() public {
        vm.prank(investor1);
        vm.expectRevert();
        pool.withdrawPlatformFees();
    }

    function testPlatformFeesAccumulate() public {
        (, uint256 fractionId) = _setupAndFractionalize();
        
        vm.warp(block.timestamp + 6 minutes);
        
        vm.prank(investor1);
        pool.buyFractions{value: 14400 ether}(fractionId, 30);
        
        vm.prank(investor2);
        pool.buyFractions{value: 9600 ether}(fractionId, 20);
        
        uint256 expectedFees = ((14400 ether + 9600 ether) * 25) / 1000;
        assertEq(pool.platformFees(), expectedFees);
    }

    // =========== OTHER TESTS ===========

    function testOnlyOwnerCanSetPaymentDistributor() public {
        vm.prank(investor1);
        vm.expectRevert();
        pool.setPaymentDistributor(address(0));
    }

    function testCannotSetInvalidPaymentDistributor() public {
        vm.prank(deployer);
        vm.expectRevert("Invalid address");
        pool.setPaymentDistributor(address(0));
    }

    function testOnlyDistributorCanCallBurnOnRepayment() public {
        vm.prank(investor1);
        vm.expectRevert();
        pool.burnOnRepayment(1, investor1, 10);
    }

    function testCannotBurnOnRepaymentWithInvalidAmount() public {
        vm.prank(address(distributor));
        vm.expectRevert(abi.encodeWithSignature("InvalidAmount(uint256)", 0));
        pool.burnOnRepayment(1, investor1, 0);
    }

    function testOnlyOwnerCanCallUpdateCooldownPeriod() public {
        vm.prank(investor1);
        vm.expectRevert();
        pool.updateCooldownPeriod(1);
    }

    function testCanSetCooldownPeriod() public {
        uint256 newCooldown = 2 hours;
        assertFalse(pool.coolDownPeriod() == newCooldown);

        vm.prank(deployer);
        pool.updateCooldownPeriod(newCooldown);
        assertEq(pool.coolDownPeriod(), newCooldown);
    }
}