#!/usr/bin/env node

const nodeVersion = process.version;
const major = parseInt(nodeVersion.slice(1).split('.')[0]);
const minor = parseInt(nodeVersion.slice(1).split('.')[1]);

console.log(`Node.js version: ${nodeVersion}`);

if (major > 23 || (major === 23 && minor >= 6)) {
  console.log('✅ Native TypeScript support available (no flags needed)');
  console.log('Recommended: npm run start:native');
} else if (major > 22 || (major === 22 && minor >= 6)) {
  console.log('✅ TypeScript support available with flag');
  console.log('Recommended: npm run start:ts');
} else {
  console.log('⚠️  Build step required for TypeScript');
  console.log('Recommended: npm start');
}

console.log('\nAvailable scripts:');
console.log('- npm start          (build + run, works on all versions)');
console.log('- npm run start:ts   (direct TS, Node.js 22.6+)');
console.log('- npm run start:native (direct TS, Node.js 23.6+)');
