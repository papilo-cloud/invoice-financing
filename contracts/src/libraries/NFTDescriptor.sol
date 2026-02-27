// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";

library NFTDescriptor {
    
    struct InvoiceParams {
        uint256 tokenId;
        string debtorName;
        uint256 faceValue;
        uint256 dueDate;
        uint256 riskScore;
        bool isVerified;
        bool isPaid;
    }
    
    /**
     * @notice Generate the complete token URI with SVG image
     */
    function constructTokenURI(InvoiceParams memory params) 
        internal 
        view 
        returns (string memory) 
    {
        string memory name = generateName(params.tokenId);
        string memory description = generateDescription(params);
        string memory image = Base64.encode(bytes(generateSVG(params)));
        
        return string(
            abi.encodePacked(
                'data:application/json;base64,',
                Base64.encode(
                    bytes(
                        abi.encodePacked(
                            '{"name":"', name,
                            '", "description":"', description,
                            '", "image": "data:image/svg+xml;base64,', image,
                            '", "attributes":', generateAttributes(params),
                            '}'
                        )
                    )
                )
            )
        );
    }
    
    /**
     * @notice Generate NFT name
     */
    function generateName(uint256 tokenId) private pure returns (string memory) {
        return string(
            abi.encodePacked('Invoice #', toString(tokenId))
        );
    }
    
    /**
     * @notice Generate NFT description
     */
    function generateDescription(InvoiceParams memory params) 
        private 
        pure 
        returns (string memory) 
    {
        return string(
            abi.encodePacked(
                'Invoice financing NFT for ',
                params.debtorName,
                '. Face value: ',
                formatEther(params.faceValue),
                ' ETH. ',
                params.isVerified ? 'Verified' : 'Pending verification',
                params.isPaid ? ', PAID' : ''
            )
        );
    }
    
    /**
     * @notice Generate JSON attributes
     */
    function generateAttributes(InvoiceParams memory params) 
        private 
        pure 
        returns (string memory) 
    {
        return string(
            abi.encodePacked(
                '[',
                '{"trait_type":"Debtor","value":"', params.debtorName, '"},',
                '{"trait_type":"Face Value","value":', formatEther(params.faceValue), '},',
                '{"trait_type":"Risk Score","value":', toString(params.riskScore), '},',
                '{"trait_type":"Status","value":"', params.isPaid ? 'Paid' : params.isVerified ? 'Verified' : 'Pending', '"},',
                '{"trait_type":"Verification","value":"', params.isVerified ? 'Yes' : 'No', '"}',
                ']'
            )
        );
    }
    
    /**
     * @notice Generate SVG image
     */
    function generateSVG(InvoiceParams memory params) 
        private 
        view 
        returns (string memory) 
    {
        string memory riskColor = getRiskColor(params.riskScore);
        string memory statusBadge = getStatusBadge(params.isVerified, params.isPaid, params.dueDate);
        
        return string(
            abi.encodePacked(
                '<svg width="400" height="600" viewBox="0 0 400 600" xmlns="http://www.w3.org/2000/svg">',
                '<defs>',
                generateGradient(riskColor),
                generateFilters(),
                '</defs>',
                
                // Background
                '<rect width="400" height="600" fill="url(#grad)" rx="40"/>',
                
                // Border
                '<rect x="10" y="10" width="380" height="580" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2" rx="35"/>',
                
                // Top Section
                '<rect x="30" y="30" width="340" height="100" fill="rgba(255,255,255,0.1)" rx="10"/>',
                '<text x="50" y="65" font-family="monospace" font-size="16" fill="white" opacity="0.8">INVOICE NFT</text>',
                '<text x="50" y="100" font-family="Georgia, serif" font-size="32" font-weight="bold" fill="white">#', toString(params.tokenId), '</text>',
                
                // Debtor Name
                '<rect x="30" y="150" width="340" height="80" fill="rgba(255,255,255,0.1)" rx="10"/>',
                '<text x="50" y="180" font-family="monospace" font-size="14" fill="white" opacity="0.7">DEBTOR</text>',
                '<text x="50" y="210" font-family="monospace" font-size="20" font-weight="600" fill="white">',
                truncateString(params.debtorName, 20),
                '</text>',
                
                // Amount
                '<rect x="30" y="250" width="165" height="100" fill="rgba(255,255,255,0.1)" rx="10"/>',
                '<text x="50" y="280" font-family="monospace" font-size="14" fill="white" opacity="0.7">AMOUNT</text>',
                '<text x="50" y="310" font-family="Georgia, serif" font-size="18" font-weight="bold" fill="white">',
                formatEtherShort(params.faceValue),
                '</text>',
                '<text x="50" y="335" font-family="monospace" font-size="16" fill="white" opacity="0.9">ETH</text>',
                
                // Risk Score
                generateRiskGauge(params.riskScore, riskColor),
                '<text x="287" y="305" font-family="Georgia, serif" font-size="28" font-weight="bold" fill="white" text-anchor="middle">',
                toString(params.riskScore),
                '</text>',
                
                // Due Date
                '<rect x="30" y="370" width="165" height="60" fill="rgba(255,255,255,0.1)" rx="10"/>',
                '<text x="50" y="394" font-family="monospace" font-size="14" fill="white" opacity="0.7">DUE DATE</text>',
                '<text x="50" y="418" font-family="Georgia, serif" font-size="16" fill="white">',
                formatDate(params.dueDate),
                '</text>',
                
                // Status Badge
                statusBadge,
                
                // Footer
                '<rect x="0" y="550" width="400" height="50" fill="#0A1F44"/>',
                '<circle cx="170" cy="575" r="6" fill="#2A5ADA"/>',
                '<text x="200" y="580" font-family="monospace" font-size="12" fill="white" text-anchor="middle">',
                'Powered by Chainlink',
                '</text>',
                '</svg>'
            )
        );
    }
    
    /**
     * @notice Generate gradient based on risk score
     */
    function generateGradient(string memory color) private pure returns (string memory) {
        return string(
            abi.encodePacked(
                '<linearGradient id="grad" x1="0%" y1="0%" x2="15%" y2="100%">',
                '<stop offset="30%" style="stop-color:#0a0f1f;stop-opacity:1" />',
                '<stop offset="100%" style="stop-color:', color, ';stop-opacity:1" />',
                '</linearGradient>'
            )
        );
    }
    
    /**
     * @notice Generate SVG filters
     */
    function generateFilters() private pure returns (string memory) {
        return '<filter id="glow"><feGaussianBlur stdDeviation="3" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>';
    }
    
    /**
     * @notice Get status badge SVG
     */
    function getStatusBadge(bool isVerified, bool isPaid, uint256 dueDate) 
        private 
        view 
        returns (string memory) 
    {
        if (!isPaid && block.timestamp > dueDate) {
            return '<rect x="30" y="450" width="340" height="50" fill="rgba(7, 1, 1, 0.2)" rx="10"/><text x="200" y="482" font-family="monospace" font-size="20" font-weight="bold" fill="#fff" text-anchor="middle">DEFAULTED</text>';
        }
        if (isPaid) {
            return '<rect x="30" y="450" width="340" height="50" fill="rgba(0, 5, 2, 0.2)" rx="10"/><text x="200" y="482" font-family="monospace" font-size="20" font-weight="bold" fill="#fff" text-anchor="middle">PAID</text>';
        } else if (isVerified) {
            return '<rect x="30" y="450" width="340" height="50" fill="rgba(0, 3, 8, 0.2)" rx="10"/><text x="200" y="482" font-family="monospace" font-size="20" font-weight="bold" fill="#fff" text-anchor="middle">VERIFIED</text>';
        } else {
            return '<rect x="30" y="450" width="340" height="50" fill="rgba(0, 0, 0, 0.2)" rx="10"/><text x="200" y="482" font-family="monospace" font-size="20" font-weight="bold" fill="#fff" text-anchor="middle">PENDING</text>';
        }
    }
    
    /**
     * @notice Get color based on risk score
     */
    function getRiskColor(uint256 riskScore) private pure returns (string memory) {
        if (riskScore >= 80) return '#22c55e'; // Green
        if (riskScore >= 60) return '#3b82f6'; // Blue
        if (riskScore >= 40) return '#fbbf24'; // Yellow
        return '#ef4444'; // Red
    }
    
    /**
     * @notice Format ether value (simplified)
     */
    function formatEther(uint256 value) private pure returns (string memory) {
        uint256 eth = value / 1e18;
        return toString(eth);
    }
    
    /**
     * @notice Format ether value short
     */
    function formatEtherShort(uint256 value) private pure returns (string memory) {
        uint256 eth = value / 1e18;
        if (eth >= 1000000) {
            return string(abi.encodePacked(toString(eth / 1000000), 'M'));
        } else if (eth >= 1000) {
            return string(abi.encodePacked(toString(eth / 1000), 'K'));
        }
        return toString(eth);
    }
    
    /**
     * @notice Format Unix timestamp to date string
     */
    function formatDate(uint256 timestamp) private view returns (string memory) {
        if (timestamp <= block.timestamp) {
            return "OVERDUE";
        }
        uint256 daysFromNow = (timestamp - block.timestamp) / 86400;
        if (daysFromNow == 0) return 'TODAY';
        if (daysFromNow == 1) return '1 DAY';
        return string(abi.encodePacked(toString(daysFromNow), ' DAYS'));
    }
    
    /**
     * @notice Truncate string if too long
     */
    function truncateString(string memory str, uint256 maxLen) 
        private 
        pure 
        returns (string memory) 
    {
        bytes memory strBytes = bytes(str);
        if (strBytes.length <= maxLen) return str;
        if (maxLen <= 3) return str;
        
        bytes memory truncated = new bytes(maxLen);
        for (uint256 i = 0; i < maxLen - 3; i++) {
            truncated[i] = strBytes[i];
        }
        truncated[maxLen - 3] = '.';
        truncated[maxLen - 2] = '.';
        truncated[maxLen - 1] = '.';
        
        return string(truncated);
    }
    
    /**
     * @notice Convert uint to string
     */
    function toString(uint256 value) private pure returns (string memory) {
        if (value == 0) return "0";
        
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        
        return string(buffer);
    }

    /**
     * @notice Generate SVG for risk gauge
     */
    function generateRiskGauge(uint256 riskScore, string memory riskColor) 
        private 
        pure 
        returns (string memory) 
    {
        uint256 circumference = 314; // 2 * π * 50 (r=50 approx)
        uint256 progress = (riskScore * circumference) / 100;

        return string(
            abi.encodePacked(
                '<circle cx="287" cy="300" r="50" stroke="rgba(255,255,255,0.2)" stroke-width="10" fill="none"/>',
                '<circle cx="287" cy="300" r="50" stroke="', riskColor,
                '" stroke-width="10" fill="none" ',
                'stroke-dasharray="', toString(progress), ' ', toString(circumference - progress),
                '" transform="rotate(-90 287 300)"/>'
            )
        );
    }
}