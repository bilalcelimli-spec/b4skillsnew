// B4Native: small platform bridge shared by the iPadOS and macOS apps.
// Audio recording (AAC/M4A, matches the backend's {audio, mimeType: "audio/mp4"} contract),
// listening playback, simple preferences and cookie cleanup on sign-out.

#import <AVFoundation/AVFoundation.h>
#import <Security/Security.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <React/RCTViewManager.h>
#import <Vision/Vision.h>
#import <ImageIO/ImageIO.h>
#import <CommonCrypto/CommonDigest.h>
#import "B4PhotoVault.h"
#import "B4FramePhoto.h"
#if TARGET_OS_OSX
#import <AppKit/AppKit.h>
#else
#import <UIKit/UIKit.h>
#endif

static AVCaptureSession *B4PreviewSession;
#if TARGET_OS_IOS
// AVFoundation accounts for the front sensor's mount and mirroring. Keep buffers
// upright for Vision instead of guessing an EXIF rotation for each camera model.
static AVCaptureVideoOrientation B4VideoOrientation(void) {
  switch (UIDevice.currentDevice.orientation) {
    case UIDeviceOrientationPortrait: return AVCaptureVideoOrientationPortrait;
    case UIDeviceOrientationPortraitUpsideDown: return AVCaptureVideoOrientationPortraitUpsideDown;
    case UIDeviceOrientationLandscapeLeft: return AVCaptureVideoOrientationLandscapeRight;
    case UIDeviceOrientationLandscapeRight: return AVCaptureVideoOrientationLandscapeLeft;
    default: {
      for (UIScene *scene in UIApplication.sharedApplication.connectedScenes)
        if ([scene isKindOfClass:UIWindowScene.class] && ((UIWindowScene *)scene).interfaceOrientation != UIInterfaceOrientationUnknown)
          return (AVCaptureVideoOrientation)((UIWindowScene *)scene).interfaceOrientation;
      return AVCaptureVideoOrientationPortrait;
    }
  }
}
#endif

#if TARGET_OS_OSX
@interface B4CameraView : NSView
#else
@interface B4CameraView : UIView
#endif
@property(nonatomic, strong) AVCaptureVideoPreviewLayer *preview;
@end
@implementation B4CameraView
- (instancetype)initWithFrame:(CGRect)frame {
  if ((self = [super initWithFrame:frame])) {
#if TARGET_OS_OSX
    self.wantsLayer = YES;
#endif
    self.preview = [AVCaptureVideoPreviewLayer layerWithSession:B4PreviewSession];
    self.preview.videoGravity = AVLayerVideoGravityResizeAspectFill;
    [self.layer addSublayer:self.preview];
  }
  return self;
}
#if TARGET_OS_OSX
- (void)layout { [super layout]; self.preview.frame = self.bounds; }
#else
- (void)layoutSubviews {
  [super layoutSubviews]; self.preview.frame = self.bounds;
  if (self.preview.connection.isVideoOrientationSupported) self.preview.connection.videoOrientation = B4VideoOrientation();
}
#endif
@end
@interface B4CameraPreviewManager : RCTViewManager @end
@implementation B4CameraPreviewManager
RCT_EXPORT_MODULE(B4CameraPreview)
+ (BOOL)requiresMainQueueSetup { return YES; }
#if TARGET_OS_OSX
- (NSView *)view { return [B4CameraView new]; }
#else
- (UIView *)view { return [B4CameraView new]; }
#endif
@end

static const NSUInteger B4MaxAudioBytes = 14000000;

void B4InstallExamTextTraits(void);

@interface B4Native : RCTEventEmitter <RCTBridgeModule, AVAudioRecorderDelegate, AVCapturePhotoCaptureDelegate, AVCaptureVideoDataOutputSampleBufferDelegate>
@end

@implementation B4Native {
  AVAudioRecorder *_recorder;
  NSURL *_recordingURL;
  AVPlayer *_player;
  id _endObserver;
  id _failObserver;
  RCTPromiseResolveBlock _playResolve;
  RCTPromiseRejectBlock _playReject;
  dispatch_block_t _playTimeout;
  BOOL _observingPlayer;
  BOOL _hasListeners;
  AVCaptureSession *_cameraSession;
  AVCapturePhotoOutput *_photoOutput;
  dispatch_queue_t _cameraQueue;
  dispatch_queue_t _faceQueue;
  dispatch_queue_t _vaultQueue;
  AVCaptureVideoDataOutput *_faceOutput;
  NSTimeInterval _lastFaceSample;
  NSUInteger _cameraGeneration;
  BOOL _cameraStarting;
  BOOL _framePhotoRequested;
  AVCaptureVideoDataOutput *_framePhotoOutput;
  NSUInteger _framePhotoGeneration;
  RCTPromiseResolveBlock _photoResolve;
  RCTPromiseRejectBlock _photoReject;
  NSArray<id> *_cameraObservers;
}

RCT_EXPORT_MODULE(B4Native)

+ (BOOL)requiresMainQueueSetup { return YES; }
- (dispatch_queue_t)methodQueue { return dispatch_get_main_queue(); }
- (NSArray<NSString *> *)supportedEvents {
  return @[ @"B4RecordingFinished", @"B4PlaybackEnded", @"B4PlaybackFailed", @"B4Interrupted", @"B4FaceCount", @"B4CameraState" ];
}
- (void)startObserving { _hasListeners = YES; }
- (void)stopObserving { _hasListeners = NO; }
- (void)emit:(NSString *)name body:(id)body {
  if (_hasListeners) { [self sendEventWithName:name body:body]; }
}

- (instancetype)init {
  if ((self = [super init])) {
    // Exam text views may live in a framework loaded after +load ran; installing twice is a no-op.
    B4InstallExamTextTraits();
    _cameraQueue = dispatch_queue_create("com.b4skills.camera", DISPATCH_QUEUE_SERIAL);
    _faceQueue = dispatch_queue_create("com.b4skills.faces", DISPATCH_QUEUE_SERIAL);
    _vaultQueue = dispatch_queue_create("com.b4skills.photo-vault", DISPATCH_QUEUE_SERIAL);
#if TARGET_OS_IOS
    [UIDevice.currentDevice beginGeneratingDeviceOrientationNotifications];
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(cameraOrientationChanged:) name:UIDeviceOrientationDidChangeNotification object:nil];
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(handleInterruption:)
                                                 name:AVAudioSessionInterruptionNotification
                                               object:nil];
#endif
  }
  return self;
}

- (void)invalidate {
  [self stopCamera];
#if TARGET_OS_IOS
  [UIDevice.currentDevice endGeneratingDeviceOrientationNotifications];
#endif
  [self discardRecording];
  [self stopPlayer];
  [[NSNotificationCenter defaultCenter] removeObserver:self];
  [super invalidate];
}

#if TARGET_OS_IOS
- (void)cameraOrientationChanged:(NSNotification *)note {
  dispatch_async(dispatch_get_main_queue(), ^{
    AVCaptureVideoOrientation orientation = B4VideoOrientation();
    NSArray *outputs = self->_cameraSession.outputs;
    dispatch_async(self->_cameraQueue, ^{
      for (AVCaptureOutput *output in outputs) {
        AVCaptureConnection *connection = [output connectionWithMediaType:AVMediaTypeVideo];
        if (connection.isVideoOrientationSupported) connection.videoOrientation = orientation;
      }
    });
  });
}
- (void)handleInterruption:(NSNotification *)note {
  NSNumber *type = note.userInfo[AVAudioSessionInterruptionTypeKey];
  if (type.unsignedIntegerValue != AVAudioSessionInterruptionTypeBegan) { return; }
  BOOL wasRecording = _recorder.isRecording;
  if (wasRecording) { [_recorder stop]; }
  [self stopPlayer];
  [self emit:@"B4Interrupted" body:@{ @"wasRecording" : @(wasRecording) }];
}
#endif

#pragma mark - Candidate-controlled camera pilot (video only; no ambient audio)

RCT_EXPORT_METHOD(startCamera:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  if (_cameraSession || _cameraStarting) { reject(@"camera_busy", @"Kamera zaten kullanımda.", nil); return; }
#if TARGET_OS_OSX
  AVCaptureDevice *available = [AVCaptureDevice defaultDeviceWithMediaType:AVMediaTypeVideo];
#else
  AVCaptureDevice *available = [AVCaptureDevice defaultDeviceWithDeviceType:AVCaptureDeviceTypeBuiltInWideAngleCamera mediaType:AVMediaTypeVideo position:AVCaptureDevicePositionFront];
#endif
  if (!available) { reject(@"camera_unavailable", @"Kullanılabilir kamera bulunamadı. Simülatörde fiziksel kamera doğrulaması yapılamaz.", nil); return; }
  _cameraStarting = YES;
  NSUInteger generation = ++_cameraGeneration;
  void (^open)(BOOL) = ^(BOOL granted) {
    dispatch_async(dispatch_get_main_queue(), ^{
      if (generation != self->_cameraGeneration) { reject(@"camera_cancelled", @"Kamera kontrolü iptal edildi.", nil); return; }
      if (!granted) { self->_cameraStarting = NO; reject(@"camera_denied", @"Kamera izni verilmedi. Sistem ayarlarından kontrol edin.", nil); return; }
#if TARGET_OS_OSX
      AVCaptureDevice *device = [AVCaptureDevice defaultDeviceWithMediaType:AVMediaTypeVideo];
#else
      AVCaptureDevice *device = [AVCaptureDevice defaultDeviceWithDeviceType:AVCaptureDeviceTypeBuiltInWideAngleCamera mediaType:AVMediaTypeVideo position:AVCaptureDevicePositionFront];
#endif
      NSError *error = nil;
      AVCaptureDeviceInput *input = device ? [AVCaptureDeviceInput deviceInputWithDevice:device error:&error] : nil;
      AVCaptureSession *session = [AVCaptureSession new];
#if TARGET_OS_OSX
      if ([session canSetSessionPreset:AVCaptureSessionPreset1280x720]) session.sessionPreset = AVCaptureSessionPreset1280x720;
      else session.sessionPreset = AVCaptureSessionPresetHigh;
#else
      session.sessionPreset = AVCaptureSessionPresetPhoto;
#endif
#if TARGET_OS_IOS
      session.automaticallyConfiguresApplicationAudioSession = NO;
      // Keep the camera in Split View, Slide Over and Stage Manager windows (iPadOS 16+, no entitlement).
      if (session.isMultitaskingCameraAccessSupported) session.multitaskingCameraAccessEnabled = YES;
#endif
#if TARGET_OS_OSX
      AVCapturePhotoOutput *output = nil; // Tundra still capture is not supported by every Mac camera.
#else
      AVCapturePhotoOutput *output = [AVCapturePhotoOutput new];
#endif
      if (!input || ![session canAddInput:input]) { self->_cameraStarting = NO; reject(@"camera_unavailable", @"Kullanılabilir kamera bulunamadı.", error); return; }
      [session addInput:input];
      if (output && ![session canAddOutput:output]) { self->_cameraStarting = NO; reject(@"camera_unavailable", @"Kamera fotoğraf çekimini desteklemiyor.", nil); return; }
      if (output) [session addOutput:output];
      AVCaptureVideoDataOutput *faces = [AVCaptureVideoDataOutput new];
      faces.alwaysDiscardsLateVideoFrames = YES;
      faces.videoSettings = @{(id)kCVPixelBufferPixelFormatTypeKey: @(kCVPixelFormatType_32BGRA)};
      if (![session canAddOutput:faces]) { self->_cameraStarting = NO; reject(@"camera_unavailable", @"Sürekli yüz kontrolü başlatılamadı.", nil); return; }
      [session addOutput:faces];
#if TARGET_OS_IOS
      for (AVCaptureOutput *cameraOutput in @[output, faces]) {
        AVCaptureConnection *connection = [cameraOutput connectionWithMediaType:AVMediaTypeVideo];
        if (connection.isVideoOrientationSupported) connection.videoOrientation = B4VideoOrientation();
      }
#endif
      [faces setSampleBufferDelegate:self queue:self->_faceQueue];
      self->_faceOutput = faces;

      self->_cameraSession = session; self->_photoOutput = output; B4PreviewSession = session;
      [self observeCameraSession:session generation:generation];
      dispatch_async(self->_cameraQueue, ^{
        [session startRunning];
        dispatch_async(dispatch_get_main_queue(), ^{
          if (generation != self->_cameraGeneration) { reject(@"camera_cancelled", @"Kamera kontrolü iptal edildi.", nil); return; }
          self->_cameraStarting = NO;
          if (!session.isRunning) { [self stopCamera]; reject(@"camera_unavailable", @"Kamera başlatılamadı.", nil); return; }
          resolve(@(generation));
        });
      });
    });
  };
  AVAuthorizationStatus status = [AVCaptureDevice authorizationStatusForMediaType:AVMediaTypeVideo];
  if (status == AVAuthorizationStatusNotDetermined) [AVCaptureDevice requestAccessForMediaType:AVMediaTypeVideo completionHandler:open];
  else open(status == AVAuthorizationStatusAuthorized);
}

// Tell JS when the system takes the camera away (another app, window layout, hardware error)
// and when it comes back, so the exam monitor never shows a frozen "active" preview.
- (void)observeCameraSession:(AVCaptureSession *)session generation:(NSUInteger)generation {
  [self removeCameraObservers];
  NSNotificationCenter *center = [NSNotificationCenter defaultCenter];
  __weak B4Native *weakSelf = self;
  void (^send)(NSString *) = ^(NSString *state) {
    B4Native *strongSelf = weakSelf;
    if (!strongSelf || generation != strongSelf->_cameraGeneration) return;
    [strongSelf emit:@"B4CameraState" body:@{ @"state" : state, @"runId" : @(generation) }];
  };
  NSMutableArray *observers = [NSMutableArray array];
#if TARGET_OS_IOS
  [observers addObject:[center addObserverForName:AVCaptureSessionWasInterruptedNotification object:session queue:NSOperationQueue.mainQueue usingBlock:^(NSNotification *note) { send(@"interrupted"); }]];
  [observers addObject:[center addObserverForName:AVCaptureSessionInterruptionEndedNotification object:session queue:NSOperationQueue.mainQueue usingBlock:^(NSNotification *note) { send(@"resumed"); }]];
#endif
  [observers addObject:[center addObserverForName:AVCaptureSessionRuntimeErrorNotification object:session queue:NSOperationQueue.mainQueue usingBlock:^(NSNotification *note) { send(@"failed"); }]];
  _cameraObservers = observers;
}

- (void)removeCameraObservers {
  for (id observer in _cameraObservers) [[NSNotificationCenter defaultCenter] removeObserver:observer];
  _cameraObservers = nil;
}

RCT_EXPORT_METHOD(stopCamera) {
  ++_cameraGeneration; _cameraStarting = NO;
  [self removeCameraObservers];
  @synchronized(self) { _framePhotoRequested = NO; _framePhotoOutput = nil; }
  AVCaptureSession *session = _cameraSession;
  _cameraSession = nil; _photoOutput = nil; B4PreviewSession = nil;
  [_faceOutput setSampleBufferDelegate:nil queue:NULL]; _faceOutput = nil;
  if (_photoReject) _photoReject(@"camera_cancelled", @"Fotoğraf çekimi kesildi.", nil);
  _photoResolve = nil; _photoReject = nil;
  if (session) dispatch_async(_cameraQueue, ^{ [session stopRunning]; });
}

// Vision processes one frame per second on a serial queue; video frames never leave this method.
- (void)captureOutput:(AVCaptureOutput *)output didOutputSampleBuffer:(CMSampleBufferRef)buffer fromConnection:(AVCaptureConnection *)connection {
#if TARGET_OS_OSX
  BOOL requested; NSUInteger generation;
  @synchronized(self) { requested = _framePhotoRequested && output == _framePhotoOutput; generation = _framePhotoGeneration; if (requested) _framePhotoRequested = NO; }
  if (requested) [self processCameraSource:B4FrameJPEG(CMSampleBufferGetImageBuffer(buffer)) generation:generation error:nil];
#endif
  NSTimeInterval now = NSProcessInfo.processInfo.systemUptime;
  if (now - _lastFaceSample < 1) return;
  _lastFaceSample = now;
  VNDetectFaceRectanglesRequest *request = [VNDetectFaceRectanglesRequest new];
  NSError *error = nil;
  BOOL ok = [[[VNImageRequestHandler alloc] initWithCMSampleBuffer:buffer options:@{}] performRequests:@[request] error:&error];
  id count = ok ? @(request.results.count) : NSNull.null;
  dispatch_async(dispatch_get_main_queue(), ^{
    if (output != self->_faceOutput || !self->_cameraSession.isRunning) return;
    [self emit:@"B4FaceCount" body:@{@"count":count, @"monotonicMs":@(now*1000), @"runId":@(self->_cameraGeneration)}];
  });
}

#pragma mark - Bounded encrypted photo storage
- (NSURL *)photoURL:(NSString *)scope error:(NSError **)error {
  if (![scope hasPrefix:@"photo."] || scope.length > 2048) return nil;
  NSURL *root = [[[NSFileManager defaultManager] URLsForDirectory:NSApplicationSupportDirectory inDomains:NSUserDomainMask] firstObject];
  NSURL *dir = [root URLByAppendingPathComponent:@"B4SkillsPhotoVault" isDirectory:YES];
  if (![[NSFileManager defaultManager] createDirectoryAtURL:dir withIntermediateDirectories:YES attributes:@{NSFilePosixPermissions:@0700} error:error]) return nil;
  if (![dir setResourceValue:@YES forKey:NSURLIsExcludedFromBackupKey error:error]) return nil;
  return [dir URLByAppendingPathComponent:[B4ScopeHash(scope) stringByAppendingString:@".b4p"]];
}
- (NSData *)photoKey:(NSString *)scope create:(BOOL)create {
  NSDictionary *query = @{(__bridge id)kSecClass:(__bridge id)kSecClassGenericPassword,
    (__bridge id)kSecAttrService:@"com.b4skills.assessment.photo-vault", (__bridge id)kSecAttrAccount:B4ScopeHash(scope)};
  NSMutableDictionary *read = [query mutableCopy]; read[(__bridge id)kSecReturnData]=@YES;
  CFTypeRef found=NULL; OSStatus status=SecItemCopyMatching((__bridge CFDictionaryRef)read,&found);
  if(status==errSecSuccess) return CFBridgingRelease(found);
  if(status!=errSecItemNotFound || !create) return nil;
  NSMutableData *key=[NSMutableData dataWithLength:64];
  if(SecRandomCopyBytes(kSecRandomDefault,64,key.mutableBytes)!=errSecSuccess) return nil;
  NSMutableDictionary *add=[query mutableCopy]; add[(__bridge id)kSecValueData]=key;
#if TARGET_OS_IOS
  add[(__bridge id)kSecAttrAccessible]=(__bridge id)kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly;
#endif
  if(SecItemAdd((__bridge CFDictionaryRef)add,NULL)!=errSecSuccess) return nil;
  return key;
}
RCT_EXPORT_METHOD(photoRead:(NSString *)scope resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  dispatch_async(_vaultQueue, ^{
    NSError *error=nil; NSURL *url=[self photoURL:scope error:&error];
    if(!url) { reject(@"photo_storage",@"Şifreli fotoğraf deposu açılamadı.",error); return; }
    if(![[NSFileManager defaultManager] fileExistsAtPath:url.path]) { resolve(NSNull.null); return; }
    NSNumber *size=nil; [url getResourceValue:&size forKey:NSURLFileSizeKey error:&error];
    if(!size || size.unsignedLongLongValue>6000200) { reject(@"photo_storage",@"Fotoğraf deposunun boyutu geçersiz.",error); return; }
    NSData *sealed=[NSData dataWithContentsOfURL:url options:0 error:&error];
    NSData *plain=sealed ? B4Open(sealed,[self photoKey:scope create:NO],scope) : nil;
    NSString *value=plain ? [[NSString alloc] initWithData:plain encoding:NSUTF8StringEncoding] : nil;
    if(!value) { reject(@"photo_storage",@"Şifreli fotoğraf deposu doğrulanamadı. Kayıtların üzerine yazılmadı.",error); return; }
    resolve(value);
  });
}
RCT_EXPORT_METHOD(photoWrite:(NSString *)scope value:(NSString *)value resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  dispatch_async(_vaultQueue, ^{
    NSError *error=nil; NSURL *url=[self photoURL:scope error:&error];
    NSData *plain=[value dataUsingEncoding:NSUTF8StringEncoding];
    BOOL exists=url && [[NSFileManager defaultManager] fileExistsAtPath:url.path];
    NSData *key=[self photoKey:scope create:!exists];
    if(exists) {
      NSNumber *size=nil; [url getResourceValue:&size forKey:NSURLFileSizeKey error:&error];
      NSData *old=(size && size.unsignedLongLongValue<=6000200) ? [NSData dataWithContentsOfURL:url] : nil;
      if(!old || !B4Open(old,key,scope)) { reject(@"photo_storage",@"Şifreli fotoğraf deposu doğrulanamadı. Kayıtların üzerine yazılmadı.",error); return; }
    }
    NSData *sealed=url && plain ? B4Seal(plain,key,scope) : nil;
    NSDataWritingOptions options=NSDataWritingAtomic;
#if TARGET_OS_IOS
    options |= NSDataWritingFileProtectionCompleteUntilFirstUserAuthentication;
#endif
    if(!sealed || ![sealed writeToURL:url options:options error:&error] || ![[NSFileManager defaultManager] setAttributes:@{NSFilePosixPermissions:@0600} ofItemAtPath:url.path error:&error]) {
      reject(@"photo_storage",@"Fotoğraf şifreli olarak kaydedilemedi. Yeniden deneyin.",error); return;
    }
    resolve(nil);
  });
}

RCT_EXPORT_METHOD(captureCamera:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  if (!_cameraSession.isRunning || _photoResolve) { reject(@"camera_not_ready", @"Kamera fotoğraf için hazır değil.", nil); return; }
  _photoResolve = resolve; _photoReject = reject;
#if TARGET_OS_OSX
  @synchronized(self) { _framePhotoRequested = YES; _framePhotoOutput = _faceOutput; _framePhotoGeneration = _cameraGeneration; }
#else
  AVCapturePhotoOutput *output = _photoOutput;
  dispatch_async(_cameraQueue, ^{
    AVCapturePhotoSettings *settings = [AVCapturePhotoSettings photoSettingsWithFormat:@{AVVideoCodecKey: AVVideoCodecTypeJPEG}];
    @try { [output capturePhotoWithSettings:settings delegate:self]; }
    @catch (NSException *exception) {
      dispatch_async(dispatch_get_main_queue(), ^{
        if (output != self->_photoOutput || !self->_photoReject) return;
        self->_photoReject(@"camera_photo", @"Bu kamera fotoğraf çekimini tamamlayamadı. Kamerayı yeniden açın.", nil);
        self->_photoResolve=nil; self->_photoReject=nil;
      });
    }
  });
#endif
}

- (void)photoOutput:(AVCapturePhotoOutput *)output didFinishProcessingPhoto:(AVCapturePhoto *)photo error:(NSError *)error {
  dispatch_async(dispatch_get_main_queue(), ^{
  // An old capture may finish after stop + reopen; it must never resolve the new request.
  if (output != self->_photoOutput || !self->_photoResolve) return;
  NSUInteger generation = self->_cameraGeneration;
  [self processCameraSource:error ? nil : [photo fileDataRepresentation] generation:generation error:error];
  });
}

- (void)processCameraSource:(NSData *)source generation:(NSUInteger)generation error:(NSError *)error {
  dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
    // Re-encode a bounded upright image without EXIF/location metadata.
    CGImageSourceRef input = source ? CGImageSourceCreateWithData((__bridge CFDataRef)source, NULL) : NULL;
    NSDictionary *options = @{(__bridge id)kCGImageSourceCreateThumbnailFromImageAlways: @YES,
      (__bridge id)kCGImageSourceCreateThumbnailWithTransform: @YES, (__bridge id)kCGImageSourceThumbnailMaxPixelSize: @1024};
    CGImageRef image = input ? CGImageSourceCreateThumbnailAtIndex(input, 0, (__bridge CFDictionaryRef)options) : NULL;
    if (input) CFRelease(input);
    NSMutableData *jpeg = [NSMutableData data];
    CGImageDestinationRef destination = image ? CGImageDestinationCreateWithData((__bridge CFMutableDataRef)jpeg, CFSTR("public.jpeg"), 1, NULL) : NULL;
    BOOL valid = NO;
    if (destination) {
      CGImageDestinationAddImage(destination, image, (__bridge CFDictionaryRef)@{(__bridge id)kCGImageDestinationLossyCompressionQuality: @0.75});
      valid = CGImageDestinationFinalize(destination); CFRelease(destination);
    }
    VNDetectFaceRectanglesRequest *faces = [VNDetectFaceRectanglesRequest new];
    NSError *visionError = nil;
    BOOL detected = image && [[[VNImageRequestHandler alloc] initWithCGImage:image options:@{}] performRequests:@[faces] error:&visionError];
    if (image) CGImageRelease(image);
    unsigned char digest[CC_SHA256_DIGEST_LENGTH]; CC_SHA256(jpeg.bytes, (CC_LONG)jpeg.length, digest);
    NSMutableString *hash = [NSMutableString string]; for (NSUInteger i=0; i<CC_SHA256_DIGEST_LENGTH; i++) [hash appendFormat:@"%02x", digest[i]];
    NSString *capturedAt = [[NSISO8601DateFormatter new] stringFromDate:[NSDate date]];
    dispatch_async(dispatch_get_main_queue(), ^{
      if (generation != self->_cameraGeneration || !self->_photoResolve) return;
      RCTPromiseResolveBlock done = self->_photoResolve; RCTPromiseRejectBlock failed = self->_photoReject;
      self->_photoResolve = nil; self->_photoReject = nil;
      if (!valid || !detected || jpeg.length == 0 || jpeg.length > 1000000) { failed(@"camera_photo", @"Fotoğraf veya yüz sayımı tamamlanamadı. Yeniden deneyin.", error ?: visionError); return; }
      done(@{@"base64": [jpeg base64EncodedStringWithOptions:0], @"bytes": @(jpeg.length), @"sha256": hash,
        @"faceCount": @(faces.results.count), @"capturedAt": capturedAt});
    });
  });
}

#pragma mark - Microphone

- (void)requestPermission:(void (^)(BOOL granted))done {
#if TARGET_OS_IOS
  if (@available(iOS 17.0, *)) {
    [AVAudioApplication requestRecordPermissionWithCompletionHandler:^(BOOL granted) {
      dispatch_async(dispatch_get_main_queue(), ^{ done(granted); });
    }];
  } else {
    [[AVAudioSession sharedInstance] requestRecordPermission:^(BOOL granted) {
      dispatch_async(dispatch_get_main_queue(), ^{ done(granted); });
    }];
  }
#else
  switch ([AVCaptureDevice authorizationStatusForMediaType:AVMediaTypeAudio]) {
    case AVAuthorizationStatusAuthorized: done(YES); return;
    case AVAuthorizationStatusDenied:
    case AVAuthorizationStatusRestricted: done(NO); return;
    default:
      [AVCaptureDevice requestAccessForMediaType:AVMediaTypeAudio completionHandler:^(BOOL granted) {
        dispatch_async(dispatch_get_main_queue(), ^{ done(granted); });
      }];
  }
#endif
}

RCT_EXPORT_METHOD(requestMicrophone:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  [self requestPermission:^(BOOL granted) { resolve(@(granted)); }];
}

RCT_EXPORT_METHOD(startRecording:(double)maxSeconds
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  [self requestPermission:^(BOOL granted) {
    if (!granted) {
      reject(@"mic_denied", @"Mikrofon izni verilmedi. Sistem Ayarları'ndan B4Skills için mikrofonu açın.", nil);
      return;
    }
    [self discardRecording];
    [self stopPlayer];
    NSError *error = nil;
#if TARGET_OS_IOS
    AVAudioSession *session = [AVAudioSession sharedInstance];
    [session setCategory:AVAudioSessionCategoryPlayAndRecord
                    mode:AVAudioSessionModeDefault
                 options:AVAudioSessionCategoryOptionDefaultToSpeaker | AVAudioSessionCategoryOptionAllowBluetoothHFP
                   error:&error];
    if (!error) { [session setActive:YES error:&error]; }
    if (error) { reject(@"session", error.localizedDescription, error); return; }
#endif
    NSString *name = [[NSUUID UUID].UUIDString stringByAppendingPathExtension:@"m4a"];
    self->_recordingURL = [NSURL fileURLWithPath:[NSTemporaryDirectory() stringByAppendingPathComponent:name]];
    NSDictionary *settings = @{
      AVFormatIDKey : @(kAudioFormatMPEG4AAC),
      AVSampleRateKey : @44100,
      AVNumberOfChannelsKey : @1,
      AVEncoderAudioQualityKey : @(AVAudioQualityHigh),
      AVEncoderBitRateKey : @64000,
    };
    AVAudioRecorder *recorder = [[AVAudioRecorder alloc] initWithURL:self->_recordingURL settings:settings error:&error];
    if (!recorder) { reject(@"recorder", error.localizedDescription ?: @"Kayıt başlatılamadı.", error); return; }
    recorder.delegate = self;
    recorder.meteringEnabled = YES;
    double limit = maxSeconds > 0 ? MIN(maxSeconds, 600) : 180;
    if (![recorder recordForDuration:limit]) { reject(@"recorder", @"Kayıt başlatılamadı.", nil); return; }
    self->_recorder = recorder;
    resolve(nil);
  }];
}

RCT_EXPORT_METHOD(stopRecording:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  if (!_recordingURL) { reject(@"no_recording", @"Kayıt bulunamadı.", nil); return; }
  NSTimeInterval duration = _recorder.currentTime;
  [_recorder stop];
  [self deactivateSession];
  NSData *data = [NSData dataWithContentsOfURL:_recordingURL];
  [[NSFileManager defaultManager] removeItemAtURL:_recordingURL error:nil];
  _recordingURL = nil;
  _recorder = nil;
  if (data.length == 0 || data.length > B4MaxAudioBytes) {
    reject(@"empty", @"Ses kaydı okunamadı. Yeniden kaydedin.", nil);
    return;
  }
  resolve(@{
    @"base64" : [data base64EncodedStringWithOptions:0],
    @"bytes" : @(data.length),
    @"durationMs" : @((NSInteger)(duration * 1000)),
  });
}

RCT_EXPORT_METHOD(cancelRecording) { [self discardRecording]; }

RCT_EXPORT_METHOD(recordingLevel:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  if (!_recorder.isRecording) { resolve(@{ @"level" : @0, @"seconds" : @0 }); return; }
  [_recorder updateMeters];
  float db = [_recorder averagePowerForChannel:0];
  double level = MAX(0.0, MIN(1.0, pow(10.0, db / 20.0) * 1.6));
  resolve(@{ @"level" : @(level), @"seconds" : @(_recorder.currentTime) });
}

- (void)audioRecorderDidFinishRecording:(AVAudioRecorder *)recorder successfully:(BOOL)flag {
  if (recorder != _recorder) { return; }
  [self emit:@"B4RecordingFinished" body:@{ @"successfully" : @(flag) }];
}

- (void)discardRecording {
  if (_recorder) { _recorder.delegate = nil; [_recorder stop]; _recorder = nil; }
  if (_recordingURL) { [[NSFileManager defaultManager] removeItemAtURL:_recordingURL error:nil]; _recordingURL = nil; }
  [self deactivateSession];
}

- (void)deactivateSession {
#if TARGET_OS_IOS
  [[AVAudioSession sharedInstance] setActive:NO withOptions:AVAudioSessionSetActiveOptionNotifyOthersOnDeactivation error:nil];
#endif
}

#pragma mark - Playback

RCT_EXPORT_METHOD(play:(NSString *)urlString resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  NSURL *url = [NSURL URLWithString:urlString];
  if (!url || !([url.scheme isEqualToString:@"https"] || [url.scheme isEqualToString:@"http"])) {
    reject(@"url", @"Ses adresi geçersiz.", nil);
    return;
  }
  if (_recorder.isRecording) { reject(@"busy", @"Kayıt sürerken dinleme başlatılamaz.", nil); return; }
  [self stopPlayer];
#if TARGET_OS_IOS
  [[AVAudioSession sharedInstance] setCategory:AVAudioSessionCategoryPlayback error:nil];
  [[AVAudioSession sharedInstance] setActive:YES error:nil];
#endif
  // Send the same session cookies the API uses, in case media is served behind auth.
  NSArray *cookies = [[NSHTTPCookieStorage sharedHTTPCookieStorage] cookiesForURL:url] ?: @[];
  AVURLAsset *asset = [AVURLAsset URLAssetWithURL:url options:@{ AVURLAssetHTTPCookiesKey : cookies }];
  AVPlayerItem *item = [AVPlayerItem playerItemWithAsset:asset];
  __weak B4Native *weakSelf = self;
  _endObserver = [[NSNotificationCenter defaultCenter] addObserverForName:AVPlayerItemDidPlayToEndTimeNotification
                                                                   object:item
                                                                    queue:[NSOperationQueue mainQueue]
                                                               usingBlock:^(NSNotification *note) {
    [weakSelf emit:@"B4PlaybackEnded" body:@{}];
  }];
  _failObserver = [[NSNotificationCenter defaultCenter] addObserverForName:AVPlayerItemFailedToPlayToEndTimeNotification
                                                                    object:item
                                                                     queue:[NSOperationQueue mainQueue]
                                                                usingBlock:^(NSNotification *note) {
    NSError *error = note.userInfo[AVPlayerItemFailedToPlayToEndTimeErrorKey];
    [weakSelf failPlayback:error.localizedDescription ?: @"Ses oynatılamadı."];
  }];
  _player = [AVPlayer playerWithPlayerItem:item];
  _playResolve = resolve;
  _playReject = reject;
  _observingPlayer = YES;
  [item addObserver:self forKeyPath:@"status" options:NSKeyValueObservingOptionNew context:nil];
  [_player addObserver:self forKeyPath:@"timeControlStatus" options:NSKeyValueObservingOptionNew context:nil];
  _playTimeout = dispatch_block_create(0, ^{
    [weakSelf failPlayback:@"Ses yüklenemedi. Bağlantınızı kontrol edip yeniden deneyin. Dinleme hakkınız korunuyor."];
  });
  dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 20 * NSEC_PER_SEC), dispatch_get_main_queue(), _playTimeout);
  [_player play];
  // Resolve only once AVPlayer actually starts; constructing a player is not a played attempt.
}

- (void)observeValueForKeyPath:(NSString *)keyPath ofObject:(id)object
                       change:(NSDictionary<NSKeyValueChangeKey,id> *)change context:(void *)context {
  if (![NSThread isMainThread]) {
    dispatch_async(dispatch_get_main_queue(), ^{
      [self observeValueForKeyPath:keyPath ofObject:object change:change context:context];
    });
    return;
  }
  if ([keyPath isEqualToString:@"status"]) {
    if (object == _player.currentItem && _player.currentItem.status == AVPlayerItemStatusFailed) {
      [self failPlayback:_player.currentItem.error.localizedDescription ?: @"Ses yüklenemedi."];
    }
    return;
  }
  if ([keyPath isEqualToString:@"timeControlStatus"]) {
    if (object == _player && _player.timeControlStatus == AVPlayerTimeControlStatusPlaying && _playResolve) {
      if (_playTimeout) { dispatch_block_cancel(_playTimeout); _playTimeout = nil; }
      RCTPromiseResolveBlock resolve = _playResolve;
      _playResolve = nil; _playReject = nil;
      resolve(nil);
    }
    return;
  }
  [super observeValueForKeyPath:keyPath ofObject:object change:change context:context];
}

- (void)failPlayback:(NSString *)message {
  RCTPromiseRejectBlock reject = _playReject;
  _playReject = nil; _playResolve = nil;
  [self stopPlayer];
  if (reject) { reject(@"playback_failed", message, nil); }
  else { [self emit:@"B4PlaybackFailed" body:@{ @"message" : message }]; }
}

RCT_EXPORT_METHOD(stopPlayback) { [self stopPlayer]; }

- (void)stopPlayer {
  if (_playTimeout) { dispatch_block_cancel(_playTimeout); _playTimeout = nil; }
  if (_observingPlayer) {
    [_player.currentItem removeObserver:self forKeyPath:@"status"];
    [_player removeObserver:self forKeyPath:@"timeControlStatus"];
    _observingPlayer = NO;
  }
  RCTPromiseRejectBlock reject = _playReject;
  _playReject = nil; _playResolve = nil;
  [_player pause];
  _player = nil;
  if (_endObserver) { [[NSNotificationCenter defaultCenter] removeObserver:_endObserver]; _endObserver = nil; }
  if (_failObserver) { [[NSNotificationCenter defaultCenter] removeObserver:_failObserver]; _failObserver = nil; }
  if (reject) { reject(@"playback_cancelled", @"Dinleme iptal edildi.", nil); }
}

#pragma mark - Preferences (non-secret values only: backend address, last session id)

RCT_EXPORT_METHOD(getPref:(NSString *)key resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  resolve([[NSUserDefaults standardUserDefaults] stringForKey:[@"b4skills." stringByAppendingString:key]] ?: [NSNull null]);
}

RCT_EXPORT_METHOD(setPref:(NSString *)key value:(NSString *)value) {
  [[NSUserDefaults standardUserDefaults] setObject:value forKey:[@"b4skills." stringByAppendingString:key]];
}

RCT_EXPORT_METHOD(setPrefAsync:(NSString *)key value:(NSString *)value
                  resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  [[NSUserDefaults standardUserDefaults] setObject:value forKey:[@"b4skills." stringByAppendingString:key]];
  resolve(nil);
}

RCT_EXPORT_METHOD(newRequestId:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  resolve([NSUUID UUID].UUIDString);
}

RCT_EXPORT_METHOD(removePref:(NSString *)key) {
  [[NSUserDefaults standardUserDefaults] removeObjectForKey:[@"b4skills." stringByAppendingString:key]];
}

#pragma mark - Sign-out

// OS-encrypted event storage. No plaintext preferences fallback.
- (NSMutableDictionary *)secureQuery:(NSString *)key {
  return [@{(__bridge id)kSecClass: (__bridge id)kSecClassGenericPassword,
            (__bridge id)kSecAttrService: @"com.b4skills.assessment.proctoring",
            (__bridge id)kSecAttrAccount: key} mutableCopy];
}

RCT_EXPORT_METHOD(secureRead:(NSString *)key resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  if (![key hasPrefix:@"proctoring."] || key.length > 2048) { reject(@"secure_key", @"Invalid storage key", nil); return; }
  dispatch_async(dispatch_get_global_queue(QOS_CLASS_UTILITY, 0), ^{
    NSMutableDictionary *query = [self secureQuery:key];
    query[(__bridge id)kSecReturnData] = @YES;
    CFTypeRef result = NULL;
    OSStatus status = SecItemCopyMatching((__bridge CFDictionaryRef)query, &result);
    if (status == errSecItemNotFound) { resolve(nil); return; }
    if (status != errSecSuccess) { reject(@"secure_read", @"Secure event storage is unavailable", nil); return; }
    NSData *data = CFBridgingRelease(result);
    NSString *value = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
    if (!value) { reject(@"secure_read", @"Invalid secure event data", nil); return; }
    resolve(value);
  });
}

RCT_EXPORT_METHOD(secureWrite:(NSString *)key value:(NSString *)value resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  NSData *data = [value dataUsingEncoding:NSUTF8StringEncoding];
  if (![key hasPrefix:@"proctoring."] || key.length > 2048 || data.length > 128000) { reject(@"secure_write", @"Event storage limit exceeded", nil); return; }
  dispatch_async(dispatch_get_global_queue(QOS_CLASS_UTILITY, 0), ^{
    NSMutableDictionary *query = [self secureQuery:key];
    OSStatus status = SecItemUpdate((__bridge CFDictionaryRef)query, (__bridge CFDictionaryRef)@{(__bridge id)kSecValueData: data});
    if (status == errSecItemNotFound) {
      query[(__bridge id)kSecValueData] = data;
#if !TARGET_OS_OSX
      query[(__bridge id)kSecAttrAccessible] = (__bridge id)kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly;
#endif
      status = SecItemAdd((__bridge CFDictionaryRef)query, NULL);
    }
    if (status != errSecSuccess) { reject(@"secure_write", @"Secure event data could not be saved", nil); return; }
    resolve(nil);
  });
}

RCT_EXPORT_METHOD(clearCookies:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  NSHTTPCookieStorage *storage = [NSHTTPCookieStorage sharedHTTPCookieStorage];
  for (NSHTTPCookie *cookie in [storage.cookies copy]) { [storage deleteCookie:cookie]; }
  [[NSURLCache sharedURLCache] removeAllCachedResponses];
  resolve(nil);
}

@end

#if TARGET_OS_OSX
#import <AppKit/AppKit.h>
#import <React/RCTViewManager.h>
#import <React/RCTUIManager.h>
#import <React/RCTConvert.h>

// Use NSSecureTextField itself, not an NSSecureTextFieldCell in a plain text field.
// AppKit's secure field editor requires the correct owning control when refocused.
@interface B4PasswordField : NSSecureTextField
@property (nonatomic, copy) void (^accessibilityEdit)(void);
@end
@implementation B4PasswordField
- (void)setAccessibilityValue:(id)value {
  [super setAccessibilityValue:value];
  if (self.accessibilityEdit) self.accessibilityEdit();
}
@end

@interface B4PasswordView : NSView <NSTextFieldDelegate>
@property (nonatomic, strong) B4PasswordField *field;
@property (nonatomic, copy) RCTDirectEventBlock onPasswordChange;
@property (nonatomic, copy) RCTDirectEventBlock onPasswordFocus;
@property (nonatomic, copy) RCTDirectEventBlock onPasswordBlur;
@property (nonatomic, copy) RCTDirectEventBlock onPasswordSubmit;
@property (nonatomic, copy) NSString *value;
@property (nonatomic, copy) NSString *placeholder;
@end

@implementation B4PasswordView
- (instancetype)initWithFrame:(NSRect)frame {
  if ((self = [super initWithFrame:frame])) {
    _field = [[B4PasswordField alloc] initWithFrame:self.bounds];
    _field.delegate = self;
    _field.bordered = NO;
    _field.drawsBackground = NO;
    _field.focusRingType = NSFocusRingTypeNone;
    _field.font = [NSFont systemFontOfSize:15];
    _field.textColor = [NSColor colorWithSRGBRed:0.12 green:0.09 blue:0.14 alpha:1];
    _field.cell.usesSingleLineMode = YES;
    __weak B4PasswordView *weakSelf = self;
    _field.accessibilityEdit = ^{ [weakSelf changed]; };
    [self addSubview:_field];
  }
  return self;
}
- (void)layout { [super layout]; self.field.frame = self.bounds; }
- (void)setValue:(NSString *)value {
  _value = [value copy];
  if (![self.field.stringValue isEqualToString:value ?: @""]) self.field.stringValue = value ?: @"";
}
- (void)setPlaceholder:(NSString *)placeholder { _placeholder = [placeholder copy]; self.field.placeholderString = placeholder; }
- (void)setAccessibilityLabel:(NSString *)label { [super setAccessibilityLabel:label]; self.field.accessibilityLabel = label; }
- (void)changed { if (self.onPasswordChange) self.onPasswordChange(@{ @"text": self.field.stringValue }); }
- (void)controlTextDidChange:(NSNotification *)note { [self changed]; }
- (void)controlTextDidBeginEditing:(NSNotification *)note { if (self.onPasswordFocus) self.onPasswordFocus(@{}); }
- (void)controlTextDidEndEditing:(NSNotification *)note { if (self.onPasswordBlur) self.onPasswordBlur(@{}); }
- (BOOL)control:(NSControl *)control textView:(NSTextView *)editor doCommandBySelector:(SEL)selector {
  if (selector == @selector(insertNewline:)) {
    if (self.onPasswordSubmit) self.onPasswordSubmit(@{});
    return YES;
  }
  return NO;
}
@end

@interface B4SecureFieldManager : RCTViewManager
@end
@implementation B4SecureFieldManager
RCT_EXPORT_MODULE(B4SecureField)
- (NSView *)view { return [B4PasswordView new]; }
RCT_EXPORT_VIEW_PROPERTY(value, NSString)
RCT_EXPORT_VIEW_PROPERTY(placeholder, NSString)
RCT_EXPORT_VIEW_PROPERTY(onPasswordChange, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onPasswordFocus, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onPasswordBlur, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onPasswordSubmit, RCTDirectEventBlock)
RCT_EXPORT_METHOD(focus:(nonnull NSNumber *)tag) {
  [self.bridge.uiManager addUIBlock:^(__unused RCTUIManager *manager, NSDictionary<NSNumber *, NSView *> *registry) {
    B4PasswordView *view = (B4PasswordView *)registry[tag];
    if ([view isKindOfClass:B4PasswordView.class]) [view.window makeFirstResponder:view.field];
  }];
}
@end
#endif
