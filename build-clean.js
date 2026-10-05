const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const packageJsonPath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Store original dependencies
const originalDependencies = packageJson.dependencies;
const originalDevDependencies = packageJson.devDependencies;

// Remove all dependencies temporarily
packageJson.dependencies = {};
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

console.log('🔧 Build configuration: removed all dependencies temporarily');

try {
  console.log('🔨 Building DMG...');
  execSync('npx electron-builder --mac', { stdio: 'inherit', cwd: __dirname });
  console.log('✅ Build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
} finally {
  // Restore original dependencies
  const restoredPackageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  restoredPackageJson.dependencies = originalDependencies;
  fs.writeFileSync(packageJsonPath, JSON.stringify(restoredPackageJson, null, 2));
  console.log('♻️  Restored original package.json');
}
