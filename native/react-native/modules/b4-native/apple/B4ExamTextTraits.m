// Every text field in B4Skills is part of an English exam or its sign-in. System writing aids
// would change the skill being measured, so they are switched off on React Native's own text
// views whenever one gains focus:
//   - Writing Tools (Apple Intelligence) in the keyboard and the edit menu
//   - inline predictions (grey completion text)
//   - smart quotes / dashes and, on macOS, spelling correction, text replacement and completion
// autoCorrect, spellCheck and the edit menu (Look Up, Translate, Share) are switched off from JS
// through TextInput props (src/components/examInput.ts). Dictation has no public switch.
#import <Foundation/Foundation.h>
#import <objc/runtime.h>
#import <TargetConditionals.h>
#if TARGET_OS_OSX
#import <AppKit/AppKit.h>
#else
#import <UIKit/UIKit.h>
#endif

#if TARGET_OS_OSX
static void B4QuietTextView(NSTextView *view) {
  if (![view isKindOfClass:[NSTextView class]]) return;
  view.automaticQuoteSubstitutionEnabled = NO;
  view.automaticDashSubstitutionEnabled = NO;
  view.automaticTextReplacementEnabled = NO;
  view.automaticSpellingCorrectionEnabled = NO;
  view.automaticTextCompletionEnabled = NO;
  view.continuousSpellCheckingEnabled = NO;
  view.grammarCheckingEnabled = NO;
  view.inlinePredictionType = NSTextInputTraitTypeNo;
  if (@available(macOS 15.0, *)) view.writingToolsBehavior = NSWritingToolsBehaviorNone;
}
#else
static void B4QuietTraits(id<UITextInputTraits> input) {
  if ([input respondsToSelector:@selector(setSmartQuotesType:)]) input.smartQuotesType = UITextSmartQuotesTypeNo;
  if ([input respondsToSelector:@selector(setSmartDashesType:)]) input.smartDashesType = UITextSmartDashesTypeNo;
  if (@available(iOS 17.0, *)) {
    if ([input respondsToSelector:@selector(setInlinePredictionType:)]) input.inlinePredictionType = UITextInlinePredictionTypeNo;
  }
  if (@available(iOS 18.0, *)) {
    if ([input respondsToSelector:@selector(setWritingToolsBehavior:)]) input.writingToolsBehavior = UIWritingToolsBehaviorNone;
  }
}
#endif

/// Wraps -becomeFirstResponder of one class. Traits are read when the keyboard attaches, so iOS
/// applies them first; AppKit only creates a text field's editor during the call, so macOS
/// applies them after.
static BOOL B4HookFocus(NSString *className) {
  Class cls = NSClassFromString(className);
  if (!cls) return NO;
  SEL selector = @selector(becomeFirstResponder);
  Method method = class_getInstanceMethod(cls, selector);
  if (!method) return NO;
  BOOL (*original)(id, SEL) = (BOOL (*)(id, SEL))method_getImplementation(method);
  IMP replacement = imp_implementationWithBlock(^BOOL(id view) {
#if TARGET_OS_OSX
    BOOL focused = original(view, selector);
    if (focused) {
      if ([view isKindOfClass:[NSTextView class]]) B4QuietTextView(view);
      else if ([view respondsToSelector:@selector(currentEditor)]) B4QuietTextView((NSTextView *)[view currentEditor]);
#if DEBUG
      NSTextView *editor = [view isKindOfClass:[NSTextView class]] ? view : (NSTextView *)[view currentEditor];
      if (@available(macOS 15.0, *)) {
        NSLog(@"B4ExamTextTraits %@ writingTools=%ld inlinePrediction=%ld smartQuotes=%d autocorrect=%d", NSStringFromClass([view class]),
              (long)editor.writingToolsBehavior, (long)editor.inlinePredictionType,
              editor.automaticQuoteSubstitutionEnabled, editor.automaticSpellingCorrectionEnabled);
      }
#endif
    }
    return focused;
#else
    if ([view conformsToProtocol:@protocol(UITextInputTraits)]) B4QuietTraits(view);
#if DEBUG
    if (@available(iOS 18.0, *)) {
      NSLog(@"B4ExamTextTraits %@ writingTools=%ld inlinePrediction=%ld smartQuotes=%ld", NSStringFromClass([view class]),
            (long)[(id<UITextInputTraits>)view writingToolsBehavior], (long)[(id<UITextInputTraits>)view inlinePredictionType],
            (long)[(id<UITextInputTraits>)view smartQuotesType]);
    }
#endif
    return original(view, selector);
#endif
  });
  // An inherited method gets a class-level override that calls the inherited implementation.
  if (!class_addMethod(cls, selector, replacement, method_getTypeEncoding(method))) {
    method_setImplementation(method, replacement);
  }
  return YES;
}

@interface B4ExamTextTraitsLock : NSObject
@end
@implementation B4ExamTextTraitsLock
@end

void B4InstallExamTextTraits(void) {
  // Each class is hooked exactly once, even if only one was loaded on the first attempt.
  static BOOL field = NO, view = NO;
  @synchronized ([B4ExamTextTraitsLock class]) {
    if (!field) field = B4HookFocus(@"RCTUITextField");
    if (!view) view = B4HookFocus(@"RCTUITextView");
  }
}

@interface B4ExamTextTraits : NSObject
@end

@implementation B4ExamTextTraits
+ (void)load { B4InstallExamTextTraits(); }
@end
