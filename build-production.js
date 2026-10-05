const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 开始生产环境构建...\n');

// 1. 构建 Next.js 静态文件
console.log('1️⃣  构建 Next.js 静态文件...');
execSync('npm run build', { stdio: 'inherit' });

// 2. 编译 Electron 代码
console.log('\n2️⃣  编译 Electron 代码...');
execSync('npx esbuild electron/main.ts --bundle --platform=node --outfile=dist-electron/main.js --external:electron', { stdio: 'inherit' });
execSync('npx esbuild electron/preload.ts --bundle --platform=node --outfile=dist-electron/preload.js --external:electron', { stdio: 'inherit' });
console.log('✅ Electron 代码编译完成');

// 3. 打包 DMG
console.log('\n3️⃣  打包 DMG...');

// 清空临时依赖
const packageJson = require('./package.json');
const originalDependencies = packageJson.dependencies;
packageJson.dependencies = {};
fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2));

try {
  execSync('npx electron-builder --mac --arm64 --dir', { stdio: 'inherit' });

  const productName = packageJson.build.productName;
  const version = packageJson.version;
  const appPath = path.join(__dirname, 'dist-electron', 'mac-arm64', `${productName}.app`);
  const dmgPath = path.join(__dirname, 'dist-electron', `${productName}-${version}-arm64.dmg`);

  if (!fs.existsSync(appPath)) {
    throw new Error(`未找到已打包的 app: ${appPath}`);
  }

  if (fs.existsSync(dmgPath)) {
    fs.unlinkSync(dmgPath);
  }

  execSync(
    `hdiutil create -volname "${productName}" -srcfolder "${appPath}" -format UDZO "${dmgPath}"`,
    { stdio: 'inherit' }
  );

  console.log('\n✅ DMG 打包成功！');
} finally {
  // 恢复依赖
  packageJson.dependencies = originalDependencies;
  fs.writeFileSync('./package.json', JSON.stringify(packageJson, null, 2));
  console.log('♻️  已恢复 package.json');
}

console.log('\n🎉 构建完成！');
console.log(`\n📦 DMG 位置: dist-electron/${packageJson.build.productName}-${packageJson.version}-arm64.dmg`);
