jest.mock('../src/native', () => ({ B4Native: { getPref: jest.fn(), setPrefAsync: jest.fn() } }));

function setup() {
  let store!: typeof import('../src/i18n/store');
  let core!: typeof import('../src/i18n/core');
  let native!: typeof import('../src/native');
  jest.isolateModules(() => { store = require('../src/i18n/store'); core = require('../src/i18n/core'); native = require('../src/native'); });
  return { store, core, prefs: native.B4Native };
}
it('restores the saved language on launch', async () => {
  const { store, core, prefs } = setup();
  (prefs.getPref as jest.Mock).mockResolvedValue('ar');
  await store.hydrateLanguage(); expect(core.getLanguage()).toBe('ar');
  expect(prefs.getPref).toHaveBeenCalledWith('ui-language');
});
it('persists changes and keeps the old language if saving fails', async () => {
  const { store, core, prefs } = setup();
  (prefs.setPrefAsync as jest.Mock).mockResolvedValue(undefined);
  expect(await store.selectLanguage('en')).toBe(true);
  expect(prefs.setPrefAsync).toHaveBeenCalledWith('ui-language', 'en');
  (prefs.setPrefAsync as jest.Mock).mockRejectedValue(new Error('storage unavailable'));
  expect(await store.selectLanguage('ar')).toBe(false); expect(core.getLanguage()).toBe('en');
  expect(await store.selectLanguage('en-US' as any)).toBe(false);
});
it('does not overwrite a user selection when a slow hydration finishes later', async () => {
  const { store, core, prefs } = setup(); let restore!: (value: string) => void;
  (prefs.getPref as jest.Mock).mockReturnValue(new Promise(resolve => { restore = resolve; }));
  (prefs.setPrefAsync as jest.Mock).mockResolvedValue(undefined);
  const hydration = store.hydrateLanguage(); await store.selectLanguage('ar');
  restore('tr'); await hydration; expect(core.getLanguage()).toBe('ar');
});
