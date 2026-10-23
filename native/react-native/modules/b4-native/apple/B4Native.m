// B4Native: small platform bridge shared by the iPadOS and macOS apps.
// Audio recording (AAC/M4A, matches the backend's {audio, mimeType: "audio/mp4"} contract),
// listening playback, simple preferences and cookie cleanup on sign-out.

#import <AVFoundation/AVFoundation.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

static const NSUInteger B4MaxAudioBytes = 14000000;

@interface B4Native : RCTEventEmitter <RCTBridgeModule, AVAudioRecorderDelegate>
@end

@implementation B4Native {
  AVAudioRecorder *_recorder;
  NSURL *_recordingURL;
  AVPlayer *_player;
  id _endObserver;
  id _failObserver;
  BOOL _hasListeners;
}

RCT_EXPORT_MODULE(B4Native)

+ (BOOL)requiresMainQueueSetup { return NO; }
- (dispatch_queue_t)methodQueue { return dispatch_get_main_queue(); }
- (NSArray<NSString *> *)supportedEvents {
  return @[ @"B4RecordingFinished", @"B4PlaybackEnded", @"B4PlaybackFailed", @"B4Interrupted" ];
}
- (void)startObserving { _hasListeners = YES; }
- (void)stopObserving { _hasListeners = NO; }
- (void)emit:(NSString *)name body:(id)body {
  if (_hasListeners) { [self sendEventWithName:name body:body]; }
}

- (instancetype)init {
  if ((self = [super init])) {
#if TARGET_OS_IOS
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(handleInterruption:)
                                                 name:AVAudioSessionInterruptionNotification
                                               object:nil];
#endif
  }
  return self;
}

- (void)invalidate {
  [self discardRecording];
  [self stopPlayer];
  [[NSNotificationCenter defaultCenter] removeObserver:self];
  [super invalidate];
}

#if TARGET_OS_IOS
- (void)handleInterruption:(NSNotification *)note {
  NSNumber *type = note.userInfo[AVAudioSessionInterruptionTypeKey];
  if (type.unsignedIntegerValue != AVAudioSessionInterruptionTypeBegan) { return; }
  BOOL wasRecording = _recorder.isRecording;
  if (wasRecording) { [_recorder stop]; }
  [_player pause];
  [self emit:@"B4Interrupted" body:@{ @"wasRecording" : @(wasRecording) }];
}
#endif

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
    [weakSelf emit:@"B4PlaybackFailed" body:@{ @"message" : error.localizedDescription ?: @"Ses oynatılamadı." }];
  }];
  _player = [AVPlayer playerWithPlayerItem:item];
  [_player play];
  resolve(nil);
}

RCT_EXPORT_METHOD(stopPlayback) { [self stopPlayer]; }

- (void)stopPlayer {
  [_player pause];
  _player = nil;
  if (_endObserver) { [[NSNotificationCenter defaultCenter] removeObserver:_endObserver]; _endObserver = nil; }
  if (_failObserver) { [[NSNotificationCenter defaultCenter] removeObserver:_failObserver]; _failObserver = nil; }
}

#pragma mark - Preferences (non-secret values only: backend address, last session id)

RCT_EXPORT_METHOD(getPref:(NSString *)key resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  resolve([[NSUserDefaults standardUserDefaults] stringForKey:[@"b4skills." stringByAppendingString:key]] ?: [NSNull null]);
}

RCT_EXPORT_METHOD(setPref:(NSString *)key value:(NSString *)value) {
  [[NSUserDefaults standardUserDefaults] setObject:value forKey:[@"b4skills." stringByAppendingString:key]];
}

RCT_EXPORT_METHOD(removePref:(NSString *)key) {
  [[NSUserDefaults standardUserDefaults] removeObjectForKey:[@"b4skills." stringByAppendingString:key]];
}

#pragma mark - Sign-out

RCT_EXPORT_METHOD(clearCookies:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  NSHTTPCookieStorage *storage = [NSHTTPCookieStorage sharedHTTPCookieStorage];
  for (NSHTTPCookie *cookie in [storage.cookies copy]) { [storage deleteCookie:cookie]; }
  [[NSURLCache sharedURLCache] removeAllCachedResponses];
  resolve(nil);
}

@end
