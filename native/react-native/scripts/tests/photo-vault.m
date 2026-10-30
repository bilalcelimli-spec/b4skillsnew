#import "../../modules/b4-native/apple/B4PhotoVault.h"
int main() { @autoreleasepool {
  NSMutableData *key=[NSMutableData dataWithLength:64]; NSCAssert(SecRandomCopyBytes(kSecRandomDefault,64,key.mutableBytes)==errSecSuccess,@"random");
  NSData *plain=[@"{\"base64\":\"synthetic-sensitive-image\",\"version\":1}" dataUsingEncoding:NSUTF8StringEncoding];
  NSData *a=B4Seal(plain,key,@"photo.backend.userA"), *b=B4Seal(plain,key,@"photo.backend.userA");
  NSCAssert(a && b && ![a isEqual:b],@"fresh IV");
  NSCAssert([B4Open(a,key,@"photo.backend.userA") isEqual:plain],@"roundtrip");
  NSCAssert(!B4Open(a,key,@"photo.backend.userB"),@"account binding");
  NSCAssert([a rangeOfData:plain options:0 range:NSMakeRange(0,a.length)].location==NSNotFound,@"plaintext absent");
  for(NSUInteger i=0;i<a.length;i++) { NSMutableData *tampered=[a mutableCopy]; ((unsigned char *)tampered.mutableBytes)[i]^=1; NSCAssert(!B4Open(tampered,key,@"photo.backend.userA"),@"tamper rejected"); }
  NSCAssert(!B4Open([a subdataWithRange:NSMakeRange(0,a.length-1)],key,@"photo.backend.userA"),@"truncation");
  NSMutableData *other=[key mutableCopy]; ((unsigned char *)other.mutableBytes)[63]^=1;
  NSCAssert(!B4Open(a,other,@"photo.backend.userA"),@"wrong authentication key");
  for(NSNumber *length in @[@0,@1,@15,@16,@17,@1000000]) { NSData *p=[NSMutableData dataWithLength:length.unsignedIntegerValue]; NSCAssert([B4Open(B4Seal(p,key,@"photo.test"),key,@"photo.test") isEqual:p],@"boundary"); }
  NSCAssert(!B4Seal([NSMutableData dataWithLength:6000001],key,@"photo.test"),@"size bound");
  puts("Photo vault: roundtrip, fresh IV, every-byte tamper, account binding, wrong key, truncation and size boundaries PASS");
} return 0; }
