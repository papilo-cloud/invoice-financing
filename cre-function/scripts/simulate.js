import { readFileSync } from 'fs';

/**
 * Simulate the verification function locally
 * This helps test the logic before deploying to Chainlink
 */

// Mock Functions object (simulates Chainlink runtime)
globalThis.Functions = {
  encodeUint256: (value) => {
    // Simple encoding for testing
    const buffer = new Uint8Array(32);
    const hex = BigInt(value).toString(16).padStart(64, '0');
    for (let i = 0; i < 32; i++) {
      buffer[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return buffer;
  },
};

const testCases = [
  {
    name: 'Trusted Company - Apple Inc',
    args: [
      '0', // invoiceId
      'Apple Inc', // debtorName
      '50000000000000000000000', // 50000 ETH
      String(Math.floor(Date.now() / 1000) + 60 * 86400), // 60 days from now
    ],
    expectedRange: [80, 100],
  },
  {
    name: 'Unknown Company - Good Terms',
    args: [
      '1',
      'Random Corp Ltd',
      '5000000000000000000000', // 5000 ETH
      String(Math.floor(Date.now() / 1000) + 45 * 86400), // 45 days
    ],
    expectedRange: [60, 80],
  },
  {
    name: 'Overdue Invoice',
    args: [
      '2',
      'Late Payer Inc',
      '10000000000000000000000', // 10000 ETH
      String(Math.floor(Date.now() / 1000) - 10 * 86400), // 10 days ago
    ],
    expectedRange: [0, 30],
  },
  {
    name: 'Microsoft - Optimal Timeframe',
    args: [
      '3',
      'Microsoft Corporation',
      '75000000000000000000000', // 75000 ETH
      String(Math.floor(Date.now() / 1000) + 45 * 86400), // 45 days
    ],
    expectedRange: [85, 100],
  },
];

async function simulate() {
  console.log('Simulating Invoice Verification Locally\n');

  // Read source code
  const sourceCode = readFileSync('./invoiceVerification.js', 'utf8');

  // Run each test case
  for (const testCase of testCases) {
    console.log('═══════════════════════════════════════════');
    console.log('Test Case:', testCase.name);
    console.log('═══════════════════════════════════════════');

    // Create function from source
    const func = new Function('args', sourceCode + '\n//# sourceURL=invoiceVerification.js');

    try {
      const result = func(testCase.args);
      
      let score = 0;
      if (result instanceof Uint8Array) {
        // Convert last bytes to number
        for (let i = 24; i < 32; i++) {
          score = score * 256 + result[i];
        }
      }

      console.log('\n Result:', score, '/100');
      
      const [min, max] = testCase.expectedRange;
      if (score >= min && score <= max) {
        console.log('PASS - Score in expected range', `[${min}-${max}]`);
      } else {
        console.log(' WARNING - Score outside expected range', `[${min}-${max}]`);
      }
      
    } catch (error) {
      console.error('Error:', error.message);
    }

    console.log('');
  }

  console.log('═══════════════════════════════════════════');
  console.log('Simulation Complete');
  console.log('═══════════════════════════════════════════\n');
}

simulate();