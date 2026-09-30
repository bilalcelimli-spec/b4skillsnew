export const writingDraftKey = (sessionId: string, itemId: string) =>
  `writing-draft:${encodeURIComponent(sessionId)}:${encodeURIComponent(itemId)}`;
