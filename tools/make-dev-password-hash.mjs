#!/usr/bin/env node
// Build: 20261114-003
// make-dev-password-hash.mjs — produce the DEV_PW_KDF block for js/app.js.
//
// The dev-mode password is checked against a salted PBKDF2-HMAC-SHA256 value
// (see DEV_PW_KDF in js/app.js). This prints a fresh salt and the matching hash.
//
// Usage:
//   node tools/make-dev-password-hash.mjs            # generate a random 20-character password
//   WF_DEV_PW='your password' node tools/make-dev-password-hash.mjs   # hash one you chose
//
// The password is printed to the terminal only, once. It is never written to a
// file. Paste the DEV_PW_KDF block into js/app.js; keep the iteration count in
// step with OWASP's current guidance for PBKDF2-HMAC-SHA256.

import crypto from 'node:crypto';

const ITERATIONS = 600000;
const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';  // no look-alikes

let password = process.env.WF_DEV_PW || '';
const generated = !password;
if (generated) {
  // Rejection sampling so every character is equally likely.
  const limit = 256 - (256 % ALPHABET.length);
  while (password.length < 20) {
    for (const b of crypto.randomBytes(40)) {
      if (b < limit && password.length < 20) password += ALPHABET[b % ALPHABET.length];
    }
  }
}

const salt = crypto.randomBytes(16);
const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256');

console.log(generated ? `Generated password (shown once, not saved): ${password}\n` : 'Hashed the password from WF_DEV_PW.\n');
console.log('const DEV_PW_KDF = {');
console.log(`  salt:       '${salt.toString('hex')}',`);
console.log(`  iterations: ${ITERATIONS},`);
console.log(`  hash:       '${hash.toString('hex')}'`);
console.log('};');
