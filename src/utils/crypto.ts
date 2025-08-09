import CryptoJS from 'crypto-js';

export function encrypt(text:string, secretKey:string="nawfqawnfuinqwunqwfu") {
const ciphertext = CryptoJS.AES.encrypt(text, secretKey).toString();
return ciphertext
}

export function decrypt(encryptedText:string, secretKey:string="nawfqawnfuinqwunqwfu") {
  const bytes  = CryptoJS.AES.decrypt(encryptedText, secretKey);
const originalText = bytes.toString(CryptoJS.enc.Utf8);
   return originalText;
}
