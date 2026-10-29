// Debug QA entry: the wide-layout sidebar at the height of a landscape 11-inch iPad (834 pt),
// in the states that crowd it. Regression check for 1.0.0 (7), where the camera panel pushed
// the account and sign-out section off the screen. Bundled only by a disposable harness build.
import React from 'react';
import { AppRegistry, ScrollView, StyleSheet, View } from 'react-native';
import { Sidebar } from '../../App';
import { Text } from '../../src/i18n/Text';

const candidate = { uid: 'qa', displayName: 'Ayşe Yılmaz', email: 'ayse.yilmaz@example.test' };
const examStore = { phase: 'item', item: { id: 'qa', skill: 'READING' }, answered: 12, candidate, busy: false } as any;
const readyStore = { phase: 'ready', item: null, answered: 0, candidate, busy: false } as any;
const monitor = (status: string, detail: string | null = null) =>
  ({ status, faceCount: null, warning: null, detail, baselineSent: false, retry: async () => {} }) as any;

const HEIGHT = 834;
const columns: Array<[string, any, any]> = [
  ['Sınav · kamera kapalı (build 7)', examStore, monitor('off')],
  ['Sınav · kamera kullanılamıyor', examStore, monitor('unavailable', 'Kamera açılamadı.')],
  ['Sınav öncesi', readyStore, null],
];

function SidebarHarness() {
  return (
    <ScrollView horizontal style={styles.page} contentContainerStyle={styles.row}>
      {columns.map(([label, store, m]) => (
        <View key={label} style={styles.column}>
          <Text style={styles.label}>{label}</Text>
          {/* Row, as the app root is: the sidebar stretches to the full height. */}
          <View style={styles.frame}>
            <Sidebar store={store} onSheet={() => {}} topInset={24} monitor={m} />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fff' },
  row: { padding: 8, gap: 8 },
  column: { width: 272 },
  label: { fontSize: 11, color: '#333', marginBottom: 4 },
  frame: { height: HEIGHT, flexDirection: 'row', borderWidth: 1, borderColor: '#f00' },
});
AppRegistry.registerComponent('B4Skills', () => SidebarHarness);
