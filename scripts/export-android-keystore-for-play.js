#!/usr/bin/env node
/**
 * Export Android keystore and credentials from EAS for Play Store upload form.
 *
 * Prerequisites:
 *   1. Run: eas credentials -p android
 *   2. Choose: "Credentials.json: Upload/Download credentials between EAS servers and your local json"
 *   3. Choose: "Download credentials from EAS to credentials.json"
 *
 * Then run: node scripts/export-android-keystore-for-play.js
 *
 * This prints the keystore file path and the three values to paste into the
 * Play Console / custom keystore form (Keystore Password, Keystore Alias, Key Password).
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const credentialsPath = path.join(projectRoot, 'credentials.json');
const outputDir = path.join(projectRoot, 'android', 'keystores');
const defaultKeystoreFileName = 'upload-keystore.jks';

function main() {
  if (!fs.existsSync(credentialsPath)) {
    console.error('credentials.json not found.');
    console.error('');
    console.error('Do this first:');
    console.error('  1. cd to your project root (vybeme)');
    console.error('  2. Run: eas credentials -p android');
    console.error('  3. Select: "Credentials.json: Upload/Download credentials between EAS servers and your local json"');
    console.error('  4. Select: "Download credentials from EAS to credentials.json"');
    console.error('  5. Run this script again: node scripts/export-android-keystore-for-play.js');
    process.exit(1);
  }

  let credentials;
  try {
    credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
  } catch (e) {
    console.error('Failed to parse credentials.json:', e.message);
    process.exit(1);
  }

  const android = credentials.android;
  if (!android || !android.keystore) {
    console.error('credentials.json does not contain android.keystore.');
    process.exit(1);
  }

  const { keystore } = android;
  const keystorePassword = keystore.keystorePassword || keystore.keystore_password;
  const keyAlias = keystore.keyAlias || keystore.key_alias;
  const keyPassword = keystore.keyPassword || keystore.key_password;

  if (!keystorePassword || !keyAlias || !keyPassword) {
    console.error('credentials.json android.keystore is missing password/alias/keyPassword.');
    process.exit(1);
  }

  let keystoreFilePath;

  if (keystore.keystorePath) {
    keystoreFilePath = path.isAbsolute(keystore.keystorePath)
      ? keystore.keystorePath
      : path.join(projectRoot, keystore.keystorePath);
    if (!fs.existsSync(keystoreFilePath)) {
      console.error('Keystore file not found at:', keystoreFilePath);
      process.exit(1);
    }
  } else if (keystore.keystore || keystore.keystoreBase64) {
    const base64 = keystore.keystore || keystore.keystoreBase64;
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    keystoreFilePath = path.join(outputDir, defaultKeystoreFileName);
    const buffer = Buffer.from(base64, 'base64');
    fs.writeFileSync(keystoreFilePath, buffer);
    console.error('Wrote keystore file to:', keystoreFilePath);
  } else {
    console.error('credentials.json has no keystorePath, keystore, or keystoreBase64.');
    process.exit(1);
  }

  console.log('');
  console.log('--- Use these in the Play Store "Custom Keystore" form ---');
  console.log('');
  console.log('1. Keystore file:');
  console.log('   ', keystoreFilePath);
  console.log('');
  console.log('2. Keystore Password:');
  console.log('   ', keystorePassword);
  console.log('');
  console.log('3. Keystore Alias:');
  console.log('   ', keyAlias);
  console.log('');
  console.log('4. Key Password:');
  console.log('   ', keyPassword);
  console.log('');
  console.log('Upload the keystore file and paste the three values above into the form.');
  console.log('(Keystore file is in .gitignore; do not commit it.)');
}

main();
