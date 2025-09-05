// Test script for GUID generation
const { generateBase32Guid } = require('./build/main.js');

console.log('Testing GUID generation...');

// Generate a few test GUIDs
for (let i = 0; i < 5; i++) {
  const guid = generateBase32Guid();
  console.log(`GUID ${i + 1}: ${guid} (length: ${guid.length})`);
}

console.log('\nGUID generation test completed!');
