// Authenticated local envelope. Keys live in Keychain; only ciphertext reaches disk.
#import <Foundation/Foundation.h>
#import <CommonCrypto/CommonCryptor.h>
#import <CommonCrypto/CommonHMAC.h>
#import <CommonCrypto/CommonDigest.h>
#import <Security/Security.h>
static NSString *B4ScopeHash(NSString *scope) {
  NSData *data = [scope dataUsingEncoding:NSUTF8StringEncoding]; unsigned char hash[32];
  CC_SHA256(data.bytes, (CC_LONG)data.length, hash);
  NSMutableString *result = [NSMutableString string]; for (int i=0;i<32;i++) [result appendFormat:@"%02x",hash[i]]; return result;
}
static NSData *B4Seal(NSData *plain, NSData *key, NSString *scope) {
  if (key.length != 64 || plain.length > 6000000) return nil;
  unsigned char iv[16]; if (SecRandomCopyBytes(kSecRandomDefault,16,iv) != errSecSuccess) return nil;
  NSMutableData *cipher = [NSMutableData dataWithLength:plain.length+16]; size_t length=0;
  if (CCCrypt(kCCEncrypt,kCCAlgorithmAES,kCCOptionPKCS7Padding,key.bytes,32,iv,plain.bytes,plain.length,cipher.mutableBytes,cipher.length,&length)!=kCCSuccess) return nil;
  cipher.length=length;
  NSMutableData *result = [NSMutableData dataWithBytes:"B4P1" length:4];
  [result appendData:[B4ScopeHash(scope) dataUsingEncoding:NSUTF8StringEncoding]];
  [result appendBytes:iv length:16]; [result appendData:cipher];
  unsigned char mac[32]; CCHmac(kCCHmacAlgSHA256,(const char *)key.bytes+32,32,result.bytes,result.length,mac);
  [result appendBytes:mac length:32]; return result;
}
static NSData *B4Open(NSData *sealed, NSData *key, NSString *scope) {
  if (key.length!=64 || sealed.length<132 || sealed.length>6000200) return nil;
  const unsigned char *bytes=sealed.bytes; unsigned char mac[32];
  CCHmac(kCCHmacAlgSHA256,(const char *)key.bytes+32,32,bytes,sealed.length-32,mac);
  unsigned char diff=0; for(int i=0;i<32;i++) diff |= mac[i]^bytes[sealed.length-32+i];
  if(diff || memcmp(bytes,"B4P1",4) || memcmp(bytes+4,B4ScopeHash(scope).UTF8String,64)) return nil;
  NSUInteger cipherLength=sealed.length-116; NSMutableData *plain=[NSMutableData dataWithLength:cipherLength]; size_t length=0;
  if(CCCrypt(kCCDecrypt,kCCAlgorithmAES,kCCOptionPKCS7Padding,key.bytes,32,bytes+68,bytes+84,cipherLength,plain.mutableBytes,plain.length,&length)!=kCCSuccess) return nil;
  plain.length=length; return plain;
}
