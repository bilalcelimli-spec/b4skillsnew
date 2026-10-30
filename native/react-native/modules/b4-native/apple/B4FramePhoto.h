#import <Foundation/Foundation.h>
#import <CoreVideo/CoreVideo.h>
#import <CoreGraphics/CoreGraphics.h>
#import <ImageIO/ImageIO.h>
// Mac camera outputs already deliver upright BGRA frames. Copy ownership before
// releasing the sample buffer; no file, microphone input or video recording.
static NSData *B4FrameJPEG(CVPixelBufferRef pixel) {
  if (!pixel || CVPixelBufferGetPixelFormatType(pixel) != kCVPixelFormatType_32BGRA) return nil;
  size_t width=CVPixelBufferGetWidth(pixel), height=CVPixelBufferGetHeight(pixel), stride=CVPixelBufferGetBytesPerRow(pixel);
  if (!width || !height || width>8192 || height>8192 || stride<width*4 || stride>32768 || height*stride>32000000) return nil;
  if (CVPixelBufferLockBaseAddress(pixel,kCVPixelBufferLock_ReadOnly)!=kCVReturnSuccess) return nil;
  void *base=CVPixelBufferGetBaseAddress(pixel);
  NSData *copy=base ? [NSData dataWithBytes:base length:height*stride] : nil;
  CVPixelBufferUnlockBaseAddress(pixel,kCVPixelBufferLock_ReadOnly);
  if (!copy) return nil;
  CGDataProviderRef provider=CGDataProviderCreateWithCFData((__bridge CFDataRef)copy);
  CGColorSpaceRef space=CGColorSpaceCreateDeviceRGB();
  CGImageRef image=CGImageCreate(width,height,8,32,stride,space,kCGBitmapByteOrder32Little|kCGImageAlphaNoneSkipFirst,provider,NULL,NO,kCGRenderingIntentDefault);
  CGColorSpaceRelease(space); CGDataProviderRelease(provider);
  if (!image) return nil;
  NSMutableData *jpeg=[NSMutableData data];
  CGImageDestinationRef dest=CGImageDestinationCreateWithData((__bridge CFMutableDataRef)jpeg,CFSTR("public.jpeg"),1,NULL);
  BOOL valid=NO;
  if(dest) { CGImageDestinationAddImage(dest,image,(__bridge CFDictionaryRef)@{(__bridge id)kCGImageDestinationLossyCompressionQuality:@0.85}); valid=CGImageDestinationFinalize(dest); CFRelease(dest); }
  CGImageRelease(image); return valid ? jpeg : nil;
}
