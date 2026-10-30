#import "../../modules/b4-native/apple/B4FramePhoto.h"
int main() { @autoreleasepool {
  NSCAssert(!B4FrameJPEG(NULL),@"no camera buffer");
  CVPixelBufferRef pixel=NULL;
  NSCAssert(CVPixelBufferCreate(kCFAllocatorDefault,8,6,kCVPixelFormatType_32BGRA,NULL,&pixel)==kCVReturnSuccess,@"synthetic frame");
  CVPixelBufferLockBaseAddress(pixel,0);
  unsigned char *base=CVPixelBufferGetBaseAddress(pixel); size_t stride=CVPixelBufferGetBytesPerRow(pixel);
  for(int y=0;y<6;y++) for(int x=0;x<8;x++) { unsigned char *p=base+y*stride+x*4; p[0]=30; p[1]=60; p[2]=210; p[3]=255; }
  CVPixelBufferUnlockBaseAddress(pixel,0);
  NSData *jpeg=B4FrameJPEG(pixel); CVPixelBufferRelease(pixel);
  NSCAssert(jpeg.length>0,@"owned JPEG survives release of camera buffer");
  CGImageSourceRef source=CGImageSourceCreateWithData((__bridge CFDataRef)jpeg,NULL);
  NSCAssert(source && CGImageSourceGetCount(source)==1,@"real JPEG decode");
  CGImageRef image=CGImageSourceCreateImageAtIndex(source,0,NULL);
  NSCAssert(CGImageGetWidth(image)==8 && CGImageGetHeight(image)==6,@"frame dimensions");
  NSDictionary *props=CFBridgingRelease(CGImageSourceCopyPropertiesAtIndex(source,0,NULL));
  NSCAssert(!props[(__bridge id)kCGImagePropertyGPSDictionary] && !props[(__bridge id)kCGImagePropertyExifDictionary][(__bridge id)kCGImagePropertyExifDateTimeOriginal] && !props[(__bridge id)kCGImagePropertyExifDictionary][(__bridge id)kCGImagePropertyExifUserComment],@"no private metadata");
  CGColorSpaceRef rgb=CGColorSpaceCreateDeviceRGB();
  CGContextRef rendered=CGBitmapContextCreate(NULL,8,6,8,8*4,rgb,kCGImageAlphaPremultipliedLast|kCGBitmapByteOrder32Big);
  CGContextDrawImage(rendered,CGRectMake(0,0,8,6),image);
  unsigned char *color=CGBitmapContextGetData(rendered);
  NSCAssert(color[0]>180 && color[1]>35 && color[1]<85 && color[2]<60,@"BGRA interpreted as correct RGB colors");
  CGContextRelease(rendered); CGColorSpaceRelease(rgb);
  CGImageRelease(image); CFRelease(source);
  CVPixelBufferRef invalid=NULL; CVPixelBufferCreate(kCFAllocatorDefault,8,6,kCVPixelFormatType_32ARGB,NULL,&invalid);
  NSCAssert(!B4FrameJPEG(invalid),@"wrong pixel format rejected"); CVPixelBufferRelease(invalid);
  puts("Frame photo: synthetic BGRA, owned bytes after buffer release, JPEG decode, dimensions, metadata and invalid-format rejection PASS");
} return 0; }
