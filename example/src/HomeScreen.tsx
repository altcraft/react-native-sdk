import { useCallback, useEffect, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
} from 'react-native';
import AltcraftSDK from '@altcraft/react-native-sdk';
import { Store } from './Store';
import {
  initializationSDK,
  doPushSubscribe,
  doPushSuspend,
  doPushUnSubscribe,
  doLogin,
  doLogout,
  doGetProfileStatus,
  doForcedTokenUpdate,
  doClear,
  doSendMobileEvent,
  doUpdateProfile,
  type SdkEventItem,
} from './SDKTests';
import { Push } from './Push';

function renderProfileField(label: string, value: unknown) {
  if (value === undefined || value === null) return null;
  return (
    <Text style={styles.mono}>
      {label}: {typeof value === 'boolean' ? String(value) : String(value)}
    </Text>
  );
}

export default function HomeScreen() {
  const [token, setToken] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [events, setEvents] = useState<SdkEventItem[]>([]);
  const [showSubscribe, setShowSubscribe] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profileData, setProfileData] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  // Mobile Event state
  const [showMobileEvent, setShowMobileEvent] = useState(false);
  const [meEventName, setMeEventName] = useState('');

  // Profile Fields state
  const [showProfileFields, setShowProfileFields] = useState(false);
  const [pfKey, setPfKey] = useState('');
  const [pfValue, setPfValue] = useState('');
  const [pfFields, setPfFields] = useState<Record<string, string>>({});

  // Token Actions state
  const [showTokenActions, setShowTokenActions] = useState(false);

  useEffect(() => {
    Push.registerFCMPushTokenSync();
    Push.registerFCMBackgroundPush();
    Push.registerFCMForegroundPush();

    let cancelled = false;

    const handler = (event: any) => {
      if (!event) return;
      const item: SdkEventItem = {
        function: event.function ?? '',
        code: event.code ?? null,
        message: event.message ?? '',
        type: event.type ?? 'event',
        value: event.value ?? null,
        timestamp: Date.now(),
      };

      setEvents((prev) => {
        const next = [...prev, item];
        if (next.length > 200) next.splice(0, next.length - 200);
        Store.saveEventList(next);
        return next;
      });

      if (event.code === 201 || event.code === 233) {
        const val = event.value as any;
        if (val?.provider && val?.token) {
          setProvider(val.provider);
          setToken(val.token);
          Store.saveTokenData(val.provider, val.token);
        }
      }
    };

    AltcraftSDK.subscribeToEvents(handler);

    (async () => {
      try {
        const config = await Store.getConfig();
        await initializationSDK(config);

        const ev = await Store.getEventList();

        const tokenData = await AltcraftSDK.getPushToken();
        const tk = tokenData?.token ?? (await Store.getToken());
        const pr = tokenData?.provider ?? (await Store.getProvider());

        if (tokenData?.provider && tokenData?.token) {
          Store.saveTokenData(tokenData.provider, tokenData.token);
        }

        if (!cancelled) {
          setToken(tk);
          setProvider(pr);
          setEvents((prev) => {
            if (prev.length === 0) return ev;
            const evIds = new Set(ev.map((e) => e.timestamp));
            const prevNotInEv = prev.filter((p) => !evIds.has(p.timestamp));
            return [...ev, ...prevNotInEv];
          });
        }
      } catch (e) {
        if (!cancelled) console.warn('[init] error:', e);
      }
    })();

    return () => {
      cancelled = true;
      AltcraftSDK.unsubscribeFromEvent(handler);
    };
  }, []);

  const run = useCallback(async (label: string, fn: () => Promise<void>) => {
    setLoading(label);
    try {
      await fn();
    } catch (e) {
      console.warn(`[${label}] error:`, e);
    } finally {
      setLoading(null);
    }
  }, []);

  const tokenDisplay = token
    ? token.length > 16
      ? `${token.slice(0, 6)}…${token.slice(-10)}`
      : token
    : '—';

  const sendMobileEvent = useCallback(async () => {
    setLoading('mobileEvent');
    try {
      await doSendMobileEvent(
        meEventName.trim() || `rn_${Platform.OS}_event`,
        null,
        null,
        null,
        null,
        null,
        null,
        null
      );
    } catch (e) {
      console.warn('[sendMobileEvent] error:', e);
    } finally {
      setLoading(null);
    }
  }, [meEventName]);

  const addPfField = useCallback(() => {
    if (!pfKey.trim()) return;
    setPfFields((prev) => ({ ...prev, [pfKey.trim()]: pfValue.trim() }));
    setPfKey('');
    setPfValue('');
  }, [pfKey, pfValue]);

  const removePfField = useCallback((key: string) => {
    setPfFields((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const sendProfileFields = useCallback(async () => {
    setLoading('profileFields');
    try {
      await doUpdateProfile(
        Object.keys(pfFields).length > 0 ? pfFields : null,
        null
      );
    } catch (e) {
      console.warn('[sendProfileFields] error:', e);
    } finally {
      setLoading(null);
    }
  }, [pfFields]);

  return (
    <ScrollView style={styles.container}>
      {/* Provider + Token */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Connection</Text>
        <View style={styles.row}>
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>Provider</Text>
            <Text style={styles.chipValue}>{provider ?? '—'}</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipLabel}>Token</Text>
            <Text style={styles.chipValue}>{tokenDisplay}</Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Text style={styles.actionsTitle}>Actions:</Text>
        <View style={styles.actionRow}>
          <Pressable
            style={[
              styles.actionBtn,
              loading ? styles.disabled : null,
              showSubscribe ? styles.actionBtnSubscribe : null,
            ]}
            disabled={!!loading}
            onPress={() => setShowSubscribe((v) => !v)}
          >
            <Text style={styles.actionBtnText}>Subscribe</Text>
          </Pressable>
          <Pressable
            style={[
              styles.actionBtn,
              loading ? styles.disabled : null,
              showProfile ? styles.actionBtnActive : null,
            ]}
            disabled={!!loading}
            onPress={() =>
              run('profile', async () => {
                setShowProfile((v) => !v);
                const data = await doGetProfileStatus();
                setProfileData(data);
              })
            }
          >
            <Text style={styles.actionBtnText}>Profile</Text>
          </Pressable>
        </View>
        <View style={styles.actionRow}>
          <Pressable
            style={[
              styles.actionBtn,
              loading ? styles.disabled : null,
              showTokenActions ? styles.actionBtnActive : null,
            ]}
            disabled={!!loading}
            onPress={() => setShowTokenActions((v) => !v)}
          >
            <Text style={styles.actionBtnText}>Update Token</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, loading ? styles.disabled : null]}
            disabled={!!loading}
            onPress={() =>
              run('clear', async () => {
                await doClear();
                setToken(null);
                setProvider(null);
                setEvents([]);
                setProfileData(null);
                setShowProfile(false);
                setShowSubscribe(false);
                await Store.clearAll();
              })
            }
          >
            <Text style={styles.actionBtnText}>Clear</Text>
          </Pressable>
        </View>
        <View style={styles.actionRow}>
          <Pressable
            style={[
              styles.actionBtn,
              loading ? styles.disabled : null,
              showMobileEvent ? styles.actionBtnActive : null,
            ]}
            disabled={!!loading}
            onPress={() => setShowMobileEvent((v) => !v)}
          >
            <Text style={styles.actionBtnText}>Mobile Event</Text>
          </Pressable>
          <Pressable
            style={[
              styles.actionBtn,
              loading ? styles.disabled : null,
              showProfileFields ? styles.actionBtnActive : null,
            ]}
            disabled={!!loading}
            onPress={() => setShowProfileFields((v) => !v)}
          >
            <Text style={styles.actionBtnText}>Profile Fields</Text>
          </Pressable>
        </View>
        {loading ? <Text style={styles.loading}>{loading}…</Text> : null}
      </View>

      {/* Token Actions Panel */}
      {showTokenActions ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Token Actions</Text>
          <View style={styles.actionRow}>
            <Pressable
              style={[
                styles.subBtn,
                styles.subGreen,
                loading ? styles.disabled : null,
              ]}
              disabled={!!loading}
              onPress={() =>
                run('token', async () => {
                  await doForcedTokenUpdate();
                  setShowTokenActions(false);
                })
              }
            >
              <Text style={styles.subBtnText}>Forced Token Update</Text>
            </Pressable>
          </View>
          <View style={{ marginTop: 8 }} />
          <View style={styles.actionRow}>
            {Platform.OS === 'android' ? (
              <>
                <Pressable
                  style={[
                    styles.subBtn,
                    styles.subBlue,
                    loading ? styles.disabled : null,
                  ]}
                  disabled={!!loading}
                  onPress={() => {
                    AltcraftSDK.changePushProviderPriorityList([
                      'android-firebase',
                    ]);
                    setShowTokenActions(false);
                  }}
                >
                  <Text style={styles.subBtnText}>FCM</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.subBtn,
                    styles.subBlue,
                    loading ? styles.disabled : null,
                  ]}
                  disabled={!!loading}
                  onPress={() => {
                    AltcraftSDK.changePushProviderPriorityList([
                      'android-huawei',
                    ]);
                    setShowTokenActions(false);
                  }}
                >
                  <Text style={styles.subBtnText}>HMS</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.subBtn,
                    styles.subBlue,
                    loading ? styles.disabled : null,
                  ]}
                  disabled={!!loading}
                  onPress={() => {
                    AltcraftSDK.changePushProviderPriorityList([
                      'android-rustore',
                    ]);
                    setShowTokenActions(false);
                  }}
                >
                  <Text style={styles.subBtnText}>RUSTORE</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  style={[
                    styles.subBtn,
                    styles.subBlue,
                    loading ? styles.disabled : null,
                  ]}
                  disabled={!!loading}
                  onPress={() => {
                    AltcraftSDK.changePushProviderPriorityList(['ios-apns']);
                    setShowTokenActions(false);
                  }}
                >
                  <Text style={styles.subBtnText}>APNS</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.subBtn,
                    styles.subBlue,
                    loading ? styles.disabled : null,
                  ]}
                  disabled={!!loading}
                  onPress={() => {
                    AltcraftSDK.changePushProviderPriorityList([
                      'ios-firebase',
                    ]);
                    setShowTokenActions(false);
                  }}
                >
                  <Text style={styles.subBtnText}>FCM</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.subBtn,
                    styles.subBlue,
                    loading ? styles.disabled : null,
                  ]}
                  disabled={!!loading}
                  onPress={() => {
                    AltcraftSDK.changePushProviderPriorityList(['ios-hms']);
                    setShowTokenActions(false);
                  }}
                >
                  <Text style={styles.subBtnText}>HMS</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      ) : null}

      {/* Subscribe Panel */}
      {showSubscribe ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Subscribe Actions</Text>
          <View style={styles.actionRow}>
            <Pressable
              style={[
                styles.subBtn,
                styles.subGreen,
                loading ? styles.disabled : null,
              ]}
              disabled={!!loading}
              onPress={() =>
                run('subscribe', async () => {
                  await doPushSubscribe();
                  setShowSubscribe(false);
                })
              }
            >
              <Text style={styles.subBtnText}>Subscribe</Text>
            </Pressable>
            <Pressable
              style={[
                styles.subBtn,
                styles.subYellow,
                loading ? styles.disabled : null,
              ]}
              disabled={!!loading}
              onPress={() =>
                run('suspend', async () => {
                  await doPushSuspend();
                  setShowSubscribe(false);
                })
              }
            >
              <Text style={styles.subBtnText}>Suspend</Text>
            </Pressable>
          </View>
          <View style={styles.actionRow}>
            <Pressable
              style={[
                styles.subBtn,
                styles.subRed,
                loading ? styles.disabled : null,
              ]}
              disabled={!!loading}
              onPress={() =>
                run('unsubscribe', async () => {
                  await doPushUnSubscribe();
                  setShowSubscribe(false);
                })
              }
            >
              <Text style={styles.subBtnText}>Unsubscribe</Text>
            </Pressable>
            <Pressable
              style={[
                styles.subBtn,
                styles.subBlue,
                loading ? styles.disabled : null,
              ]}
              disabled={!!loading}
              onPress={() =>
                run('login', async () => {
                  await doLogin();
                  setShowSubscribe(false);
                })
              }
            >
              <Text style={styles.subBtnText}>Log In</Text>
            </Pressable>
          </View>
          <View style={styles.actionRow}>
            <Pressable
              style={[
                styles.subBtn,
                styles.subGray,
                loading ? styles.disabled : null,
              ]}
              disabled={!!loading}
              onPress={() =>
                run('logout', async () => {
                  await doLogout();
                  setShowSubscribe(false);
                })
              }
            >
              <Text style={styles.subBtnText}>Log Out</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Mobile Event Panel */}
      {showMobileEvent ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Mobile Event</Text>
          <TextInput
            placeholder="Event name"
            style={styles.input}
            value={meEventName}
            onChangeText={setMeEventName}
          />
          <Pressable
            style={[
              styles.subBtn,
              styles.subBlue,
              loading ? styles.disabled : null,
              { marginTop: 6 },
            ]}
            disabled={!!loading}
            onPress={async () => {
              await sendMobileEvent();
              setShowMobileEvent(false);
            }}
          >
            <Text style={styles.subBtnText}>Send</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Profile Fields Panel */}
      {showProfileFields ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Profile Fields</Text>
          {Object.entries(pfFields).map(([k, v]) => (
            <View key={k} style={styles.fieldChip}>
              <Text style={styles.fieldChipText}>
                {k} = {v}
              </Text>
              <Text style={styles.fieldChipX} onPress={() => removePfField(k)}>
                ✕
              </Text>
            </View>
          ))}
          <View style={styles.adderRow}>
            <TextInput
              placeholder="Key"
              style={[styles.adderInput, { flex: 1 }]}
              value={pfKey}
              onChangeText={setPfKey}
            />
            <TextInput
              placeholder="Value"
              style={[styles.adderInput, { flex: 1 }]}
              value={pfValue}
              onChangeText={setPfValue}
            />
            <Pressable style={styles.addBtn} onPress={addPfField}>
              <Text style={styles.addBtnText}>+</Text>
            </Pressable>
          </View>
          <Pressable
            style={[
              styles.subBtn,
              styles.subGreen,
              loading ? styles.disabled : null,
              { marginTop: 6 },
            ]}
            disabled={!!loading}
            onPress={async () => {
              await sendProfileFields();
              setShowProfileFields(false);
            }}
          >
            <Text style={styles.subBtnText}>Update</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Profile Panel */}
      {showProfile ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Profile Data</Text>
          {profileData ? (
            <>
              {renderProfileField('ID', (profileData as any).id)}
              {renderProfileField('Status', (profileData as any).status)}
              {renderProfileField('isTest', (profileData as any).isTest)}
              {(profileData as any).subscription ? (
                <View style={{ marginTop: 6 }}>
                  <Text style={styles.profileSectionTitle}>Subscription</Text>
                  {renderProfileField(
                    '  type',
                    (profileData as any).subscription?.type
                  )}
                  {renderProfileField(
                    '  status',
                    (profileData as any).subscription?.status
                  )}
                  {renderProfileField(
                    '  provider',
                    (profileData as any).subscription?.provider
                  )}
                  {renderProfileField(
                    '  email',
                    (profileData as any).subscription?.email
                  )}
                  {renderProfileField(
                    '  phone',
                    (profileData as any).subscription?.phone
                  )}
                  {renderProfileField(
                    '  channel',
                    (profileData as any).subscription?.channel
                  )}
                  {renderProfileField(
                    '  priority',
                    (profileData as any).subscription?.priority
                  )}
                  {(profileData as any).subscription?.cats?.length > 0 ? (
                    <Text style={styles.mono}>
                      {' '}
                      cats: {(profileData as any).subscription.cats.join(', ')}
                    </Text>
                  ) : null}
                  {(profileData as any).subscription?.custom_fields
                    ? Object.entries(
                        (profileData as any).subscription
                          .custom_fields as Record<string, string>
                      ).map(([k, v]) => (
                        <Text key={k} style={styles.mono}>
                          {' '}
                          cf: {k} = {v}
                        </Text>
                      ))
                    : null}
                </View>
              ) : (
                <Text style={[styles.mono, { color: '#999', marginTop: 4 }]}>
                  No subscription
                </Text>
              )}
              {(profileData as any).profile_fields
                ? Object.entries(
                    (profileData as any).profile_fields as Record<
                      string,
                      string
                    >
                  ).map(([k, v]) => (
                    <Text key={k} style={styles.mono}>
                      pf: {k} = {v}
                    </Text>
                  ))
                : null}
            </>
          ) : (
            <Text style={styles.mono}>No data</Text>
          )}
        </View>
      ) : null}

      {/* Recent Events */}
      {events.length > 0 ? (
        <View style={styles.events}>
          <Text style={styles.eventsTitle}>Recent Events</Text>
          <View style={styles.eventsCard}>
            {events
              .slice(-5)
              .reverse()
              .map((ev, i, arr) => {
                const statusColor = getEventStatusColor(ev);
                const badgeText = getEventBadgeText(ev);
                const dateStr = new Date(ev.timestamp).toLocaleDateString(
                  'en-GB',
                  {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  }
                );
                const timeStr = new Date(ev.timestamp).toLocaleTimeString(
                  'en-GB',
                  {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                  }
                );

                return (
                  <View key={i}>
                    <View style={styles.eventRow}>
                      {/* Timeline indicator */}
                      <View style={styles.timelineCol}>
                        {i > 0 ? <View style={styles.timelineLineTop} /> : null}
                        <View
                          style={[
                            styles.timelineDot,
                            { backgroundColor: statusColor },
                          ]}
                        />
                        {i < arr.length - 1 ? (
                          <View style={styles.timelineLineBottom} />
                        ) : null}
                      </View>

                      {/* Date / Time */}
                      <View style={styles.dateTimeCol}>
                        <Text style={styles.eventDate}>{dateStr}</Text>
                        <Text style={styles.eventTime}>{timeStr}</Text>
                      </View>

                      {/* Function + Message */}
                      <View style={styles.eventBody}>
                        <Text style={styles.eventFn} numberOfLines={1}>
                          {ev.function}
                        </Text>
                        <Text style={styles.eventMsg} numberOfLines={1}>
                          {ev.message || 'SDK event'}
                        </Text>
                      </View>

                      {/* Status badge */}
                      <View style={styles.badgeCol}>
                        {badgeText != null ? (
                          <View
                            style={[
                              styles.statusBadge,
                              { backgroundColor: statusColor + '33' },
                            ]}
                          >
                            <Text style={styles.statusBadgeText}>
                              {badgeText}
                            </Text>
                          </View>
                        ) : (
                          <Text style={styles.eventArrow}>›</Text>
                        )}
                      </View>
                    </View>

                    {/* Separator */}
                    {i < arr.length - 1 ? (
                      <View style={styles.eventSeparator} />
                    ) : null}
                  </View>
                );
              })}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

function getEventStatusColor(ev: SdkEventItem): string {
  if (ev.code === 233) return '#33FF5F';
  if (ev.type === 'error') return '#FF6E7F';
  if (ev.type === 'retryError') return '#FF6E7F';
  const code = ev.code;
  if (code != null && ((code >= 200 && code <= 299) || code === 304))
    return '#33FF5F';
  return '#000000';
}

function getEventBadgeText(ev: SdkEventItem): string | null {
  if (ev.code === 233) {
    const token = (ev.value as any)?.token;
    if (typeof token === 'string' && token.length > 0) {
      return token.slice(-3);
    }
    return null;
  }
  return ev.code != null ? String(ev.code) : null;
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
  card: {
    ...cardShadow,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  cardTitle: {
    fontWeight: '800',
    marginBottom: 8,
    fontSize: 15,
    color: '#000',
  },
  row: { flexDirection: 'row', gap: 8 },
  chip: {
    ...cardShadow,
    flex: 1,
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#fff',
  },
  chipLabel: { fontSize: 10, color: '#808080', marginBottom: 2 },
  chipValue: {
    fontSize: 12,
    fontFamily: 'Menlo',
    fontWeight: '600',
    color: '#000',
  },
  actions: { marginBottom: 16 },
  actionsTitle: {
    fontWeight: '800',
    marginBottom: 8,
    fontSize: 14,
    color: '#000',
  },
  actionRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  actionBtn: {
    ...cardShadow,
    flex: 1,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  actionBtnActive: { backgroundColor: '#fff' },
  actionBtnSubscribe: { backgroundColor: '#d3f5da' },
  actionBtnText: { fontWeight: '700', fontSize: 11, color: '#000' },
  disabled: { opacity: 0.4 },
  loading: {
    textAlign: 'center',
    marginTop: 4,
    color: '#808080',
    fontSize: 12,
  },
  panel: {
    ...cardShadow,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  panelTitle: {
    fontWeight: '800',
    marginBottom: 8,
    fontSize: 14,
    color: '#000',
  },
  subBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    ...cardShadow,
  },
  subGreen: { backgroundColor: '#fff' },
  subYellow: { backgroundColor: '#fff' },
  subRed: { backgroundColor: '#fff' },
  subBlue: { backgroundColor: '#fff' },
  subGray: { backgroundColor: '#fff' },
  subBtnText: { fontWeight: '700', fontSize: 12, color: '#000' },
  mono: { fontFamily: 'Menlo', fontSize: 11, color: '#333' },
  profileSectionTitle: {
    fontWeight: '700',
    fontSize: 12,
    marginTop: 4,
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
  adderRow: { flexDirection: 'row', gap: 4, marginTop: 6 },
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
  events: { marginBottom: 16 },
  eventsTitle: {
    fontWeight: '800',
    marginBottom: 8,
    fontSize: 14,
    color: '#000',
  },
  eventsCard: {
    backgroundColor: '#fff',
    paddingHorizontal: 7,
    paddingTop: 5,
    maxHeight: 270,
  },
  eventRow: { flexDirection: 'row', minHeight: 54, alignItems: 'center' },
  timelineCol: {
    width: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineLineTop: {
    width: 1,
    height: 27,
    backgroundColor: '#E2E8F0',
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
  },
  timelineLineBottom: {
    width: 1,
    height: 27,
    backgroundColor: '#E2E8F0',
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
  },
  timelineDot: { width: 9, height: 9, borderRadius: 4.5 },
  dateTimeCol: { width: 72, paddingHorizontal: 5 },
  eventDate: { color: '#475569', fontSize: 8.5, fontWeight: '700' },
  eventTime: { color: '#0F172A', fontSize: 8.5, fontWeight: '700' },
  eventBody: { flex: 1, paddingVertical: 8 },
  eventFn: { color: '#0F172A', fontSize: 10, fontWeight: '700' },
  eventMsg: { color: '#475569', fontSize: 9, marginTop: 1 },
  badgeCol: { width: 50, alignItems: 'flex-end' },
  statusBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  statusBadgeText: { color: '#000', fontSize: 10, fontWeight: '700' },
  eventArrow: { color: '#475569', fontSize: 20 },
  eventSeparator: {
    height: 1,
    backgroundColor: '#E2E8F0',
    opacity: 0.7,
    marginLeft: 92,
  },


});
