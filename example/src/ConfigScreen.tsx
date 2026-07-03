import { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  Platform,
} from 'react-native';
import AltcraftSDK from '@altcraft/react-native-sdk';
import { Store } from './Store';
import type { ConfigData, SubscribeSettings, CategoryData } from './Store';
import { initializationSDK } from './SDKTests';

export default function ConfigScreen() {
  const [config, setConfig] = useState<ConfigData>({
    apiUrl: '',
    rToken: null,
    providerPriorityList: [],
  });
  const [apiUrl, setApiUrl] = useState('');
  const [rToken, setRToken] = useState('');
  const [providers, setProviders] = useState<string[]>([]);

  const [jwtAnon, setJwtAnon] = useState('');
  const [jwtReg, setJwtReg] = useState('');

  const [subSettings, setSubSettings] = useState<SubscribeSettings>({
    sync: true,
    replace: false,
    skipTriggers: false,
    customFields: {},
    profileFields: {},
    cats: [],
  });
  const [cfKey, setCfKey] = useState('');
  const [cfValue, setCfValue] = useState('');
  const [pfKey, setPfKey] = useState('');
  const [pfValue, setPfValue] = useState('');
  const [catName, setCatName] = useState('');

  useEffect(() => {
    (async () => {
      const c = await Store.getConfig();
      setConfig(c);
      setApiUrl(c.apiUrl);
      setRToken(c.rToken ?? '');
      setProviders(c.providerPriorityList);

      const ja = await Store.getJwtAnon();
      const jr = await Store.getJwtReg();
      setJwtAnon(ja);
      setJwtReg(jr);

      const ss = await Store.getSubscribeSettings();
      setSubSettings(ss);
    })();
  }, []);

  const saveConfig = useCallback(async () => {
    const newConfig: ConfigData = {
      apiUrl: apiUrl.trim() || config.apiUrl,
      rToken: rToken.trim() || null,
      providerPriorityList: providers,
    };
    setConfig(newConfig);
    await Store.saveConfig(newConfig);
    AltcraftSDK.unlockInitialOperationsInThisSession();
    await initializationSDK(newConfig);
  }, [apiUrl, rToken, providers, config.apiUrl]);

  const clearConfig = useCallback(async () => {
    const reset: ConfigData = {
      apiUrl: '',
      rToken: null,
      providerPriorityList: [],
    };
    setConfig(reset);
    setApiUrl('');
    setRToken('');
    setProviders([]);
    await Store.saveConfig(reset);
  }, []);

  const saveJwt = useCallback(async () => {
    await Store.saveJwtAnon(jwtAnon);
    await Store.saveJwtReg(jwtReg);
  }, [jwtAnon, jwtReg]);

  const clearJwt = useCallback(async () => {
    setJwtAnon('');
    setJwtReg('');
    await Store.saveJwtAnon('');
    await Store.saveJwtReg('');
    await Store.saveAuthStatus(false);
  }, []);

  const saveSubSettings = useCallback(async () => {
    await Store.saveSubscribeSettings(subSettings);
  }, [subSettings]);

  const clearSubSettings = useCallback(async () => {
    const reset: SubscribeSettings = {
      sync: true,
      replace: false,
      skipTriggers: false,
      customFields: {},
      profileFields: {},
      cats: [],
    };
    setSubSettings(reset);
    await Store.saveSubscribeSettings(reset);
  }, []);

  const addCustomField = useCallback(() => {
    if (!cfKey.trim()) return;
    setSubSettings((prev) => ({
      ...prev,
      customFields: { ...prev.customFields, [cfKey.trim()]: cfValue.trim() },
    }));
    setCfKey('');
    setCfValue('');
  }, [cfKey, cfValue]);

  const removeCustomField = useCallback((key: string) => {
    setSubSettings((prev) => {
      const next = { ...prev.customFields };
      delete next[key];
      return { ...prev, customFields: next };
    });
  }, []);

  const addProfileField = useCallback(() => {
    if (!pfKey.trim()) return;
    setSubSettings((prev) => ({
      ...prev,
      profileFields: { ...prev.profileFields, [pfKey.trim()]: pfValue.trim() },
    }));
    setPfKey('');
    setPfValue('');
  }, [pfKey, pfValue]);

  const removeProfileField = useCallback((key: string) => {
    setSubSettings((prev) => {
      const next = { ...prev.profileFields };
      delete next[key];
      return { ...prev, profileFields: next };
    });
  }, []);

  const addCategory = useCallback(() => {
    if (!catName.trim()) return;
    setSubSettings((prev) => ({
      ...prev,
      cats: [...prev.cats, { name: catName.trim() }],
    }));
    setCatName('');
  }, [catName]);

  const removeCategory = useCallback((idx: number) => {
    setSubSettings((prev) => ({
      ...prev,
      cats: prev.cats.filter((_, i) => i !== idx),
    }));
  }, []);

  const toggleProvider = useCallback((p: string) => {
    setProviders((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }, []);

  const androidProviders = [
    'android-firebase',
    'android-hms',
    'android-rustore',
  ];
  const iosProviders = ['ios-apns', 'ios-firebase', 'ios-hms'];
  const availableProviders =
    Platform.OS === 'android' ? androidProviders : iosProviders;

  return (
    <ScrollView style={styles.container}>
      {/* Config */}
      <Section title="Config">
        <TextInput
          placeholder="API URL"
          style={styles.input}
          value={apiUrl}
          onChangeText={setApiUrl}
        />
        <TextInput
          placeholder="RToken"
          style={[styles.input, { marginTop: 4 }]}
          value={rToken}
          onChangeText={setRToken}
        />
        <View style={styles.chipRow}>
          {availableProviders.map((p) => (
            <Pressable
              key={p}
              onPress={() => toggleProvider(p)}
              style={[
                styles.chip,
                providers.includes(p) ? styles.chipActive : null,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  providers.includes(p) ? styles.chipTextActive : null,
                ]}
              >
                {p}
              </Text>
            </Pressable>
          ))}
        </View>
        <BtnRow
          leftLabel="Save"
          leftAction={saveConfig}
          rightLabel="Clear"
          rightAction={clearConfig}
        />
      </Section>

      {/* JWT */}
      <Section title="JWT">
        <TextInput
          placeholder="Anon JWT"
          style={styles.input}
          value={jwtAnon}
          onChangeText={setJwtAnon}
          multiline
        />
        <TextInput
          placeholder="Registered JWT"
          style={[styles.input, { marginTop: 4 }]}
          value={jwtReg}
          onChangeText={setJwtReg}
          multiline
        />
        <BtnRow
          leftLabel="Save"
          leftAction={saveJwt}
          rightLabel="Clear"
          rightAction={clearJwt}
        />
      </Section>

      {/* Subscribe Settings */}
      <Section title="Subscribe Settings">
        <ToggleRow
          label="Sync"
          value={subSettings.sync}
          onChange={(v) => setSubSettings((p) => ({ ...p, sync: v }))}
        />
        <ToggleRow
          label="Replace"
          value={subSettings.replace}
          onChange={(v) => setSubSettings((p) => ({ ...p, replace: v }))}
        />
        <ToggleRow
          label="Skip Triggers"
          value={subSettings.skipTriggers}
          onChange={(v) => setSubSettings((p) => ({ ...p, skipTriggers: v }))}
        />

        <Text style={styles.subTitle}>Custom Fields</Text>
        <FieldAdder
          keyVal={cfKey}
          setKeyVal={setCfKey}
          valVal={cfValue}
          setValVal={setCfValue}
          onAdd={addCustomField}
          items={Object.entries(subSettings.customFields)}
          onRemove={removeCustomField}
        />

        <Text style={styles.subTitle}>Profile Fields</Text>
        <FieldAdder
          keyVal={pfKey}
          setKeyVal={setPfKey}
          valVal={pfValue}
          setValVal={setPfValue}
          onAdd={addProfileField}
          items={Object.entries(subSettings.profileFields)}
          onRemove={removeProfileField}
        />

        <Text style={styles.subTitle}>Categories</Text>
        <CatAdder
          name={catName}
          setName={setCatName}
          onAdd={addCategory}
          cats={subSettings.cats}
          onRemove={removeCategory}
        />

        <BtnRow
          leftLabel="Save"
          leftAction={saveSubSettings}
          rightLabel="Clear"
          rightAction={clearSubSettings}
        />
      </Section>
    </ScrollView>
  );
}

/* ---- Small components ---- */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function BtnRow({
  leftLabel,
  leftAction,
  rightLabel,
  rightAction,
}: {
  leftLabel: string;
  leftAction: () => void;
  rightLabel: string;
  rightAction: () => void;
}) {
  return (
    <View style={styles.btnRow}>
      <Pressable
        style={[styles.smallBtn, styles.btnGreen]}
        onPress={leftAction}
      >
        <Text style={styles.smallBtnText}>{leftLabel}</Text>
      </Pressable>
      <Pressable style={[styles.smallBtn, styles.btnRed]} onPress={rightAction}>
        <Text style={styles.smallBtnText}>{rightLabel}</Text>
      </Pressable>
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Pressable style={styles.toggleRow} onPress={() => onChange(!value)}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <View style={[styles.toggleTrack, value ? styles.trackOn : null]}>
        <View style={[styles.toggleThumb, value ? styles.thumbOn : null]} />
      </View>
    </Pressable>
  );
}

function FieldAdder({
  keyVal,
  setKeyVal,
  valVal,
  setValVal,
  onAdd,
  items,
  onRemove,
}: {
  keyVal: string;
  setKeyVal: (v: string) => void;
  valVal: string;
  setValVal: (v: string) => void;
  onAdd: () => void;
  items: [string, string][];
  onRemove: (key: string) => void;
}) {
  return (
    <View style={{ marginTop: 4 }}>
      {items.map(([k, v]) => (
        <View key={k} style={styles.fieldChip}>
          <Text style={styles.fieldChipText}>
            {k} = {v}
          </Text>
          <Text style={styles.fieldChipX} onPress={() => onRemove(k)}>
            ✕
          </Text>
        </View>
      ))}
      <View style={styles.adderRow}>
        <TextInput
          placeholder="Key"
          style={[styles.adderInput, { flex: 1 }]}
          value={keyVal}
          onChangeText={setKeyVal}
        />
        <TextInput
          placeholder="Value"
          style={[styles.adderInput, { flex: 1 }]}
          value={valVal}
          onChangeText={setValVal}
        />
        <Pressable style={styles.addBtn} onPress={onAdd}>
          <Text style={styles.addBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function CatAdder({
  name,
  setName,
  onAdd,
  cats,
  onRemove,
}: {
  name: string;
  setName: (v: string) => void;
  onAdd: () => void;
  cats: CategoryData[];
  onRemove: (idx: number) => void;
}) {
  return (
    <View style={{ marginTop: 4 }}>
      {cats.map((c, i) => (
        <View key={i} style={styles.fieldChip}>
          <Text style={styles.fieldChipText}>{c.name}</Text>
          <Text style={styles.fieldChipX} onPress={() => onRemove(i)}>
            ✕
          </Text>
        </View>
      ))}
      <View style={styles.adderRow}>
        <TextInput
          placeholder="Category name"
          style={[styles.adderInput, { flex: 1 }]}
          value={name}
          onChangeText={setName}
        />
        <Pressable style={styles.addBtn} onPress={onAdd}>
          <Text style={styles.addBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const cardShadow = {
  shadowColor: '#000' as any,
  shadowOpacity: 0.25,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 4 },
  elevation: 6,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: '#fff',
  },
  section: {
    ...cardShadow,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontWeight: '800',
    fontSize: 15,
    marginBottom: 8,
    color: '#000',
  },
  input: {
    ...cardShadow,
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    fontFamily: 'Menlo',
    backgroundColor: '#fff',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  chip: {
    ...cardShadow,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: '#fff' },
  chipText: { fontSize: 11, fontFamily: 'Menlo', color: '#000' },
  chipTextActive: { fontWeight: '700', color: '#000' },
  btnRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  smallBtn: {
    ...cardShadow,
    flex: 1,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnGreen: { backgroundColor: '#fff' },
  btnRed: { backgroundColor: '#fff' },
  smallBtnText: { fontWeight: '700', fontSize: 12, color: '#000' },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  toggleLabel: { fontSize: 13, fontWeight: '600', color: '#000' },
  toggleTrack: {
    width: 40,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ccc',
    paddingHorizontal: 2,
  },
  trackOn: { backgroundColor: '#ADF7BD' },
  toggleThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
    marginTop: 2,
  },
  thumbOn: { marginLeft: 20 },
  subTitle: {
    fontWeight: '700',
    fontSize: 12,
    marginTop: 8,
    marginBottom: 4,
    color: '#000',
  },
  fieldChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...cardShadow,
    borderRadius: 10,
    padding: 8,
    marginBottom: 4,
    backgroundColor: '#fff',
  },
  fieldChipText: { fontSize: 11, fontFamily: 'Menlo', color: '#333' },
  fieldChipX: { color: '#FF6E7F', fontWeight: '800', fontSize: 14 },
  adderRow: { flexDirection: 'row', gap: 4, marginTop: 4 },
  adderInput: {
    ...cardShadow,
    borderRadius: 8,
    padding: 8,
    fontSize: 12,
    fontFamily: 'Menlo',
    backgroundColor: '#fff',
  },
  addBtn: {
    ...cardShadow,
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  addBtnText: { fontWeight: '800', fontSize: 16, color: '#000' },
});
