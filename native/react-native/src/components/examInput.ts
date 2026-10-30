import type { TextInputProps } from 'react-native';

/**
 * Props for every exam answer field (writing, blanks). Each system aid here would change the
 * language skill being measured. Native code additionally turns off Writing Tools, inline
 * predictions and smart punctuation on all text views (modules/b4-native/apple/B4ExamTextTraits.m).
 *
 * contextMenuHidden removes the edit menu (Look Up, Translate, Share, Writing Tools, Paste).
 * A hardware keyboard can still paste with ⌘V; paste policy belongs to the exam policy.
 */
export const examInputProps = {
  autoCorrect: false,
  spellCheck: false,
  autoComplete: 'off',
  importantForAutofill: 'no',
  textContentType: 'none',
  smartInsertDelete: false,
  contextMenuHidden: true,
  dataDetectorTypes: 'none',
} as const satisfies TextInputProps;
