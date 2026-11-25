import React, { useCallback, useEffect, useState } from 'react';
import {
  SafeAreaView,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
View,
} from 'react-native';
import { AltcraftCore, type CategoryData } from '@altcraft/core';
import { CheckGlyph, MinusGlyph } from '../components/CheckGlyph';
import { ScreenHeader } from '../components/ScreenHeader';
import { SdkTests } from '../services/sdk_tests';
import {
  Store,
  SubscribeSettings,
  kApnsProvider,
  kFcmProvider,
  kHmsProvider,
  kRustoreProvider,
  ConfigData,
} from '../services/store';

const K_SUCCESS_SOFT = '#ADF7BD';
const K_ACCENT = '#8DBFFC';
const K_LINE = '#E0E0E0';

type ProviderDef = {
  displayName: string;
  icon: number;
  constName: string;
};

function showToast(message: string): void {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  }
}

/** SDK configuration screen: config, JWT and subscribe settings. */
export function ConfigScreen(): React.JSX.Element {
  const [apiUrl, setApiUrl] = useState('');
  const [rToken, setRToken] = useState('');
  const [jwtAnon, setJwtAnon] = useState('');
  const [jwtReg, setJwtReg] = useState('');
  const [cFieldsInput, setCFieldsInput] = useState('');
  const [pFieldsInput, setPFieldsInput] = useState('');
  const [catsInput, setCatsInput] = useState('');

  const [providerList, setProviderList] = useState<string[]>([]);
  const [sync, setSync] = useState(true);
  const [replace, setReplace] = useState(false);
  const [skipTriggers, setSkipTriggers] = useState(false);
  const [customFields, setCustomFields] = useState<Record<string, string>>({});
  const [profileFields, setProfileFields] = useState<Record<string, string>>({});
  const [cats, setCats] = useState<CategoryData[]>([]);

  const providers: ProviderDef[] =
    Platform.OS === 'ios'
      ? [
          { displayName: 'APNs', icon: require('../../assets/ic_apns.png'), constName: kApnsProvider },
          { displayName: 'FCM', icon: require('../../assets/ic_fcm.png'), constName: kFcmProvider },
          { displayName: 'HMS', icon: require('../../assets/ic_hms.png'), constName: kHmsProvider },
        ]
      : [
          { displayName: 'FCM', icon: require('../../assets/ic_fcm.png'), constName: kFcmProvider },
          { displayName: 'HMS', icon: require('../../assets/ic_hms.png'), constName: kHmsProvider },
          { displayName: 'Rustore', icon: require('../../assets/ic_rus.png'), constName: kRustoreProvider },
        ];

  useEffect(() => {
    void (async () => {
      const store = Store.instance;
      const config = await store.getConfig();
      const ss = await store.getSubscribeSettings();
      const savedJwtAnon = await store.getJwtAnon();
      const savedJwtReg = await store.getJwtReg();
      setApiUrl(config.apiUrl ?? '');
      setRToken(config.rToken ?? '');
      setProviderList([...config.providerPriorityList]);
      setJwtAnon(savedJwtAnon ?? '');
      setJwtReg(savedJwtReg ?? '');
      setSync(ss.sync);
      setReplace(ss.replace);
      setSkipTriggers(ss.skipTriggers);
      setCustomFields({ ...ss.customFields });
      setProfileFields({ ...ss.profileFields });
      setCats([...ss.cats]);
    })();
  }, []);

  const saveConfig = useCallback(async () => {
    const url = apiUrl.trim();
    if (url.length === 0) {
      showToast('API URL is not set');
      return;
    }
    const config = new ConfigData(url, rToken.trim(), providerList);
    await Store.instance.saveConfig(config);
    await AltcraftCore.unlockInitialOperationsInThisSession();
    await SdkTests.initializationSDK(config);
    showToast('Config saved');
  }, [apiUrl, rToken, providerList]);

  const removeConfig = useCallback(async () => {
    await Store.instance.saveConfig(new ConfigData());
    setApiUrl('');
    setRToken('');
    setProviderList([]);
  }, []);

  const saveJwt = useCallback(async () => {
    const anon = jwtAnon.trim();
    const reg = jwtReg.trim();
    if (anon.length === 0 && reg.length === 0) {
      showToast('At least one JWT must be set');
      return;
    }
    await Store.instance.saveJwtAnon(anon);
    await Store.instance.saveJwtReg(reg);
    showToast('JWT saved');
  }, [jwtAnon, jwtReg]);

  const removeJwt = useCallback(async () => {
    await Store.instance.removeJwts();
    await Store.instance.saveAuthStatus(false);
    setJwtAnon('');
    setJwtReg('');
    showToast('JWT cleared');
  }, []);

  const saveSubscribeSettings = useCallback(async () => {
    const settings = new SubscribeSettings(
      sync,
      replace,
      skipTriggers,
      { ...customFields },
      { ...profileFields },
      [...cats]
    );
    await Store.instance.saveSubscribeSettings(settings);
    showToast('Subscribe settings saved');
  }, [sync, replace, skipTriggers, customFields, profileFields, cats]);

  const resetSubscribeSettings = useCallback(async () => {
    await Store.instance.saveSubscribeSettings(new SubscribeSettings());
    setSync(true);
    setReplace(false);
    setSkipTriggers(false);
    setCustomFields({});
    setProfileFields({});
    setCats([]);
    setCFieldsInput('');
    setPFieldsInput('');
    setCatsInput('');
  }, []);

  const jwtHint = (jwt: string | null): string | null => {
    if (jwt == null || jwt.length < 40) return null;
    return `${jwt.substring(0, 17)}...${jwt.substring(jwt.length - 17)}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Section
          title="Config setting:"
          onRemove={() => void removeConfig()}
          onAdd={() => void saveConfig()}
          removeTestID="config_clear_button"
          addTestID="config_save_button"
        />
        <GradientDivider />
        <EditRow
          label="API url"
          value={apiUrl}
          onChangeText={setApiUrl}
          testID="config_api_url_input"
        />
        <EditRow
          label="RToken"
          value={rToken}
          onChangeText={setRToken}
          testID="config_rtoken_input"
        />
        <ProviderSelectionBox
          providers={providers}
          providerList={providerList}
          onAdd={(name) => {
            if (!providerList.includes(name)) {
              setProviderList([...providerList, name]);
            }
          }}
          onRemove={(name) => {
            setProviderList(providerList.filter((p) => p !== name));
          }}
        />

        <View style={styles.sectionGap} />

        <Section
          title="JWT setting:"
          onRemove={() => void removeJwt()}
          onAdd={() => void saveJwt()}
          removeTestID="jwt_clear_button"
          addTestID="jwt_save_button"
        />
        <GradientDivider />
        <EditRow
          label="Anon.JWT"
          value={jwtAnon}
          onChangeText={setJwtAnon}
          hint={jwtHint(jwtAnon) ?? undefined}
          testID="jwt_anon_input"
        />
        <EditRow
          label="Reg.JWT"
          value={jwtReg}
          onChangeText={setJwtReg}
          hint={jwtHint(jwtReg) ?? undefined}
          testID="jwt_reg_input"
        />

        <View style={styles.sectionGap} />

        <Section
          title="Subscribe setting:"
          onRemove={() => void resetSubscribeSettings()}
          onAdd={() => void saveSubscribeSettings()}
        />
        <GradientDivider />
        <SwitchRow
          label="sync"
          hint="It is necessary to give a synchronous response"
          value={sync}
          onChange={setSync}
        />
        <SwitchRow
          label="replace"
          hint="Suspends other subscriptions in the database"
          value={replace}
          onChange={setReplace}
        />
        <SwitchRow
          label="skipTriggers"
          hint="An instruction to ignore company triggers"
          value={skipTriggers}
          onChange={setSkipTriggers}
        />
        <Text style={styles.fieldsTitle}>Fields &amp; Cats values:</Text>
        <FieldsSection
          label="C.Fields"
          value={cFieldsInput}
          onChangeText={setCFieldsInput}
          fields={customFields}
          onAdd={(k, v) => setCustomFields({ ...customFields, [k]: v })}
          onRemove={(k) => {
            const next = { ...customFields };
            delete next[k];
            setCustomFields(next);
          }}
        />
        <View style={styles.smallGap} />
        <FieldsSection
          label="P.Fields"
          value={pFieldsInput}
          onChangeText={setPFieldsInput}
          fields={profileFields}
          onAdd={(k, v) => setProfileFields({ ...profileFields, [k]: v })}
          onRemove={(k) => {
            const next = { ...profileFields };
            delete next[k];
            setProfileFields(next);
          }}
        />
        <View style={styles.smallGap} />
        <CatsSection
          value={catsInput}
          onChangeText={setCatsInput}
          cats={cats}
          onAdd={(name) => setCats([...cats, { name }])}
          onRemove={(name) => setCats(cats.filter((c) => c.name !== name))}
        />

        <View style={styles.sectionGap} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section(props: {
  title: string;
  onRemove: () => void;
  onAdd: () => void;
  removeTestID?: string;
  addTestID?: string;
}) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{props.title}</Text>
      <TouchableOpacity
        style={[styles.circleButton, styles.removeButton]}
        onPress={props.onRemove}
        testID={props.removeTestID}
      >
        <MinusGlyph />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.circleButton, styles.addButton]}
        onPress={props.onAdd}
        testID={props.addTestID}
      >
        <CheckGlyph />
      </TouchableOpacity>
    </View>
  );
}

function GradientDivider() {
  return <View style={styles.gradientDivider} />;
}

function EditRow(props: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  hint?: string;
  testID?: string;
}) {
  return (
    <View style={styles.editRow}>
      <View style={styles.editRowInner}>
        <Text style={styles.editLabel}>{props.label}</Text>
        <TextInput
          style={styles.editInput}
          value={props.value}
          onChangeText={props.onChangeText}
          placeholder={props.hint}
          placeholderTextColor="#9E9E9E"
          autoCapitalize="none"
          autoCorrect={false}
          testID={props.testID}
        />
      </View>
      <View style={styles.editRowDivider} />
    </View>
  );
}

function ProviderSelectionBox(props: {
  providers: ProviderDef[];
  providerList: string[];
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
}) {
  const displayName = (name: string): ProviderDef =>
    props.providers.find((d) => d.constName === name) ?? {
      displayName: name,
      icon: require('../../assets/ic_menu_config.png'),
      constName: name,
    };

  return (
    <View style={styles.providerBox}>
      <Text style={styles.providerLabel}>Providers</Text>
      <View style={styles.providerCard}>
        {props.providerList.length > 0 ? (
          <View style={styles.chipWrap}>
            {props.providerList.map((p) => {
              const def = displayName(p);
              return (
                <View key={p} style={styles.chip}>
                  <Image source={def.icon} style={styles.chipIcon} />
                  <Text style={styles.chipText}>{def.displayName}</Text>
                  <TouchableOpacity onPress={() => props.onRemove(p)}>
                    <Text style={styles.chipClose}>✕</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        ) : null}
        <View style={styles.providerRow}>
          {props.providers.map((d) => (
            <TouchableOpacity
              key={d.constName}
              style={styles.providerButton}
              onPress={() => props.onAdd(d.constName)}
            >
              <Image source={d.icon} style={styles.chipIcon} />
              <Text numberOfLines={1} style={styles.providerButtonText}>
                {d.displayName}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

function SwitchRow(props: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const { label, hint, value, onChange } = props;
  return (
    <View style={styles.switchRow}>
      <TouchableOpacity
        style={[
          styles.switchTrack,
          { borderColor: value ? K_SUCCESS_SOFT : K_ACCENT },
        ]}
        onPress={() => onChange(!value)}
      >
        <View
          style={[
            styles.switchThumb,
            value
              ? { alignSelf: 'flex-end', borderColor: K_SUCCESS_SOFT }
              : { alignSelf: 'flex-start', borderColor: K_ACCENT },
          ]}
        />
      </TouchableOpacity>
      <View style={styles.switchTexts}>
        <Text style={styles.switchLabel}>{label}</Text>
        <Text style={styles.switchHint}>{hint}</Text>
      </View>
    </View>
  );
}

function FieldsSection(props: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  fields: Record<string, string>;
  onAdd: (key: string, value: string) => void;
  onRemove: (key: string) => void;
}) {
  const [keyInput, setKeyInput] = useState('');
  const [valueInput, setValueInput] = useState('');
  const keys = Object.keys(props.fields);

  return (
    <View>
      <EditRow label={props.label} value={props.value} onChangeText={props.onChangeText} hint="Key=Value" />
      {keys.length > 0 ? (
        <View style={styles.fieldsCard}>
          <View style={styles.chipWrap}>
            {keys.map((k) => (
              <View key={k} style={styles.fieldChip}>
                <Text style={styles.fieldChipText}>{k}</Text>
                <TouchableOpacity onPress={() => props.onRemove(k)}>
                  <Text style={styles.chipClose}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      ) : null}
      <View style={styles.addKeyValueBox}>
        <TextInput
          style={styles.addKeyValueInput}
          value={keyInput}
          onChangeText={setKeyInput}
          placeholder="Key"
          placeholderTextColor="#9E9E9E"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={styles.addKeyValueInput}
          value={valueInput}
          onChangeText={setValueInput}
          placeholder="Value"
          placeholderTextColor="#9E9E9E"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={styles.addCircleButton}
          onPress={() => {
            const k = keyInput.trim();
            const v = valueInput.trim();
            if (k.length > 0 && v.length > 0) props.onAdd(k, v);
            setKeyInput('');
            setValueInput('');
          }}
        >
          <Text style={styles.addCircleText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function CatsSection(props: {
  value: string;
  onChangeText: (text: string) => void;
  cats: CategoryData[];
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
}) {
  return (
    <View>
      <EditRow label="Cats" value={props.value} onChangeText={props.onChangeText} hint="Category name" />
      {props.cats.length > 0 ? (
        <View style={styles.fieldsCard}>
          <View style={styles.chipWrap}>
            {props.cats.map((c) => (
              <View key={c.name} style={styles.fieldChip}>
                <Text style={styles.fieldChipText}>{c.name ?? ''}</Text>
                <TouchableOpacity onPress={() => props.onRemove(c.name ?? '')}>
                  <Text style={styles.chipClose}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      ) : null}
      <View style={styles.catsRow}>
        <TextInput
          style={styles.catsInput}
          value={props.value}
          onChangeText={props.onChangeText}
          placeholder="Category name"
          placeholderTextColor="#9E9E9E"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={styles.addCircleButton}
          onPress={() => {
            const name = props.value.trim();
            if (name.length > 0) {
              props.onAdd(name);
              props.onChangeText('');
            }
          }}
        >
          <Text style={styles.addCircleText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  sectionGap: {
    height: 24,
  },
  smallGap: {
    height: 10,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  circleButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButton: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginRight: 8,
  },
  addButton: {
    backgroundColor: 'rgba(173,247,189,0.4)',
  },
  gradientDivider: {
    height: 2,
    marginVertical: 10,
    borderRadius: 1,
    backgroundColor: '#D9D9D9',
    borderLeftWidth: 0,
    opacity: 0.8,
  },
  editRow: {
    paddingVertical: 4,
  },
  editRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editLabel: {
    width: 80,
    fontSize: 10,
    color: '#000000',
  },
  editInput: {
    flex: 1,
    fontSize: 12,
    color: '#000000',
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  editRowDivider: {
    height: 1,
    backgroundColor: K_LINE,
  },
  providerBox: {
    marginTop: 10,
  },
  providerLabel: {
    fontSize: 8,
    color: '#9E9E9E',
  },
  providerCard: {
    marginTop: 6,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 1,
    shadowOffset: { width: 0, height: 0 },
    elevation: 1,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 1,
    shadowOffset: { width: 0, height: 0 },
    elevation: 1,
  },
  chipIcon: {
    width: 16,
    height: 16,
    marginRight: 4,
  },
  chipText: {
    fontSize: 12,
    color: '#000000',
    marginRight: 4,
  },
  chipClose: {
    fontSize: 12,
    color: '#000000',
  },
  providerRow: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
  },
  providerButton: {
    flex: 1,
    height: 40,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 1,
    shadowOffset: { width: 0, height: 0 },
    elevation: 1,
  },
  providerButtonText: {
    flexShrink: 1,
    fontSize: 12,
    color: '#000000',
    marginLeft: 6,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  switchTrack: {
    width: 60,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
    padding: 2,
    justifyContent: 'center',
  },
  switchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#000000',
    borderWidth: 1.5,
  },
  switchTexts: {
    flex: 1,
    marginLeft: 10,
  },
  switchLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#000000',
  },
  switchHint: {
    fontSize: 9.5,
    color: '#9E9E9E',
  },
  fieldsTitle: {
    marginTop: 14,
    marginBottom: 8,
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  fieldsCard: {
    marginTop: 6,
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 1,
    shadowOffset: { width: 0, height: 0 },
    elevation: 1,
  },
  fieldChip: {
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: K_LINE,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldChipText: {
    fontSize: 10,
    color: '#000000',
    marginRight: 4,
  },
  addKeyValueBox: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: K_LINE,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addKeyValueInput: {
    flex: 1,
    fontSize: 12,
    color: '#000000',
    paddingVertical: 4,
  },
  addCircleButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(173,247,189,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  addCircleText: {
    fontSize: 14,
    lineHeight: 16,
    color: '#000000',
  },
  catsRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  catsInput: {
    flex: 1,
    fontSize: 12,
    color: '#000000',
    borderWidth: 1,
    borderColor: K_LINE,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
