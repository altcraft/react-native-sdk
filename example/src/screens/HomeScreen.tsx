import React, { useCallback, useEffect, useState } from 'react';
import {
  SafeAreaView,
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
View,
} from 'react-native';
import { AltcraftCore, type SdkEvent } from '@altcraft/core';
import { AppState } from '../services/app_state';
import { SdkTests } from '../services/sdk_tests';
import {
  kApnsProvider,
  kEmptyValueUi,
  kFcmProvider,
  kHmsProvider,
  kRustoreProvider,
  kSubscribed,
  kSuspended,
  kUnsubscribed,
} from '../services/store';

const K_SUCCESS = '#33FF5F';
const K_ERROR = '#FF6E7F';
const K_SUSPENDED = '#FFD700';
const K_ACCENT = '#8DBFFC';
const K_LINE = '#E2E8F0';

/** Altcraft SDK module versions linked by the example app. */
const SDK_MODULE_VERSIONS =
  'core: 1.0.0\npush: 1.0.0\ninapp: 1.0.0\ntarget: 1.0.0\nprofile: 1.0.0';

type ModuleDef = {
  name: string;
  icon: number;
  iconSize: number;
  providerConst: string;
  priority: string[];
};

type ActivePanel = 'subscribe' | 'profile' | 'target' | null;

function modulesForPlatform(): ModuleDef[] {
  if (Platform.OS === 'ios') {
    return [
      {
        name: 'apns',
        icon: require('../../assets/ic_apns.png'),
        iconSize: 22,
        providerConst: kApnsProvider,
        priority: [kApnsProvider, kFcmProvider, kHmsProvider],
      },
      {
        name: 'fcm',
        icon: require('../../assets/ic_fcm.png'),
        iconSize: 19,
        providerConst: kFcmProvider,
        priority: [kFcmProvider, kHmsProvider, kApnsProvider],
      },
      {
        name: 'hms',
        icon: require('../../assets/ic_hms.png'),
        iconSize: 25,
        providerConst: kHmsProvider,
        priority: [kHmsProvider, kFcmProvider, kApnsProvider],
      },
    ];
  }
  return [
    {
      name: 'fcm',
      icon: require('../../assets/ic_fcm.png'),
      iconSize: 19,
      providerConst: kFcmProvider,
      priority: [kFcmProvider, kHmsProvider, kRustoreProvider],
    },
    {
      name: 'hms',
      icon: require('../../assets/ic_hms.png'),
      iconSize: 25,
      providerConst: kHmsProvider,
      priority: [kHmsProvider, kFcmProvider, kRustoreProvider],
    },
    {
      name: 'rustore',
      icon: require('../../assets/ic_rus.png'),
      iconSize: 22,
      providerConst: kRustoreProvider,
      priority: [kRustoreProvider, kFcmProvider, kHmsProvider],
    },
  ];
}

/** Main dashboard screen containing the SDK information,
 * action buttons and the recent event timeline. */
export function HomeScreen(): React.JSX.Element {
  const [, setTick] = useState(0);
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(
    null
  );
  const [profileLoading, setProfileLoading] = useState(false);
  const [sid, setSid] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    const unsubscribe = AppState.instance.subscribe(() => setTick((t) => t + 1));
    return unsubscribe;
  }, []);

  const state = AppState.instance;
  const modules = modulesForPlatform();

  const togglePanel = useCallback(
    async (panel: ActivePanel) => {
      if (activePanel === panel) {
        setActivePanel(null);
        return;
      }

      setActivePanel(panel);

      if (panel === 'profile') {
        setProfileLoading(true);
        const data = await SdkTests.doGetProfileStatus();
        setProfileData(data);
        setProfileLoading(false);
      }
    },
    [activePanel]
  );

  const onClear = useCallback(async () => {
    setActivePanel(null);
    setProfileData(null);
    AppState.instance.clearEvents();
    await SdkTests.doClear();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <InfoCard state={state} modules={modules} />

        <Text style={styles.actionsTitle}>Actions:</Text>

        <View style={styles.actionRow}>
          <ActionButton
            label="Subscribe"
            icon="subscribe"
            onPress={() => void togglePanel('subscribe')}
          />
          <ActionButton
            label="Profile"
            icon="profile"
            onPress={() => void togglePanel('profile')}
          />
          <ActionButton
            label="Target"
            icon="target"
            onPress={() => void togglePanel('target')}
          />
          <ActionButton
            label="Clear"
            icon="clear"
            testID="home_clear_config_button"
            onPress={() => void onClear()}
          />
        </View>

        {activePanel === 'subscribe' ? (
          <SubBox onClose={() => setActivePanel(null)} />
        ) : activePanel === 'profile' ? (
          <ProfileBox
            loading={profileLoading}
            data={profileData}
            onClose={() => setActivePanel(null)}
          />
        ) : activePanel === 'target' ? (
          <MobileEventBox
            sid={sid}
            name={name}
            onSidChange={setSid}
            onNameChange={setName}
            onClose={() => setActivePanel(null)}
          />
        ) : (
          <EventsSection events={state.events} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------- Info header ----------------

function InfoCard(props: { state: AppState; modules: ModuleDef[] }) {
  const { state, modules } = props;

  const token = state.token;
  const tokenBody =
    token == null || token.length === 0
      ? kEmptyValueUi
      : token.substring(Math.max(0, token.length - 10));

  const provider = state.provider;
  const effectiveProvider =
    provider != null && isKnownProvider(provider) ? provider : null;

  const tokenCardTitle = tokenCardTitleFor(provider);
  const tokenIcon = tokenIconFor(provider);
  const updateTime = formatDate(state.tokenUpdateTime);

  return (
    <View style={styles.infoCard}>
      <View style={styles.logoTop} />
      <View style={styles.logoRow}>
        <Image
          source={require('../../assets/ic_altcraft.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      <View style={styles.logoBottom} />

      <View style={styles.infoRow}>
        <View style={styles.moduleColumn}>
          {modules.map((module) => (
            <ModuleCard
              key={module.name}
              def={module}
              isOn={
                module.providerConst === effectiveProvider ||
                (effectiveProvider?.includes(
                  module.providerConst.split('-').pop() ?? ''
                ) ?? false)
              }
            />
          ))}
        </View>

        <View style={styles.infoColumn}>
          <View style={styles.tokenRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <InfoItemCard title={tokenCardTitle} body={tokenBody} icon={tokenIcon} />
              <InfoItemCard
                title="platform:"
                body="React Native"
                icon={require('../../assets/ic_os.png')}
                iconSize={28}
              />
              <InfoItemCard
                title="update time:"
                body={updateTime}
                icon={require('../../assets/ic_time_icon.png')}
              />
              <InfoItemCard
                title="version:"
                body={SDK_MODULE_VERSIONS}
                icon={require('../../assets/ic_info_setting2.png')}
                bodyLines={5}
                bodyFontSize={10}
              />
            </ScrollView>
          </View>

          <View style={styles.statusRow}>
            <StatusCardsRow>
              <StatusCard
                icon={require('../../assets/ic_menu_example.png')}
                iconSize={22}
                iconAlpha={0.5}
                badge={state.inAppStatus === kSubscribed}
                testID="home_inapp_subscription_button"
                onPress={async () => {
                  if (state.inAppStatus === kSubscribed) {
                    await SdkTests.doInAppUnsubscribe();
                  } else {
                    await SdkTests.doInAppSubscribe();
                  }
                }}
              />
              <StatusCard
                icon={require('../../assets/ic_bell_3.png')}
                iconSize={20}
                iconAlpha={0.7}
                badge={state.status === kSubscribed}
                onPress={async () => {
                  if (state.status === kSubscribed) {
                    await SdkTests.doPushUnSubscribe();
                  } else {
                    await SdkTests.doPushSubscribe();
                  }
                }}
              />
              <StatusCard
                icon={require('../../assets/ic_fingerprint.png')}
                iconSize={25}
                authDot={state.authStatus}
                testID="home_auth_button"
                onPress={async () => {
                  if (state.authStatus) {
                    AltcraftCore.logOut();
                  } else {
                    AltcraftCore.authenticate();
                  }
                }}
              />
              <StatusCard
                icon={require('../../assets/ic_github.png')}
                iconSize={20}
                onPress={() =>
                  void openUrl('https://github.com/altcraft/android-sdk')
                }
              />
            </StatusCardsRow>
          </View>

          <View style={styles.statusRow}>
            <StatusCardsRow>
              <StatusCard invisible />
              <StatusCard invisible />
              <StatusCard invisible />
              <StatusCard
                icon={require('../../assets/ic_altcraft_push_icon.jpg')}
                iconSize={27}
                onPress={() =>
                  void openUrl(
                    'https://guides.altcraft.com/developer-guide/sdk/mobile/android/'
                  )
                }
              />
            </StatusCardsRow>
          </View>
        </View>
      </View>

      <View style={styles.subscribeStatusPosition}>
        <Text style={styles.subscribeStatusText}>Subscribe status:</Text>
        <StatusIndicator status={state.status} radius={15} />
      </View>
    </View>
  );
}

function isKnownProvider(provider: string): boolean {
  return (
    provider === kFcmProvider ||
    provider === kHmsProvider ||
    provider === kRustoreProvider ||
    provider === kApnsProvider
  );
}

function tokenCardTitleFor(provider: string | null): string {
  if (provider === kFcmProvider) return 'fcm token:';
  if (provider === kHmsProvider) return 'hms token:';
  if (provider === kRustoreProvider) return 'rustore token:';
  if (provider === kApnsProvider) return 'apns token:';
  return 'no providers:';
}

function tokenIconFor(provider: string | null): number {
  if (provider === kHmsProvider) return require('../../assets/ic_hms_logo_2.png');
  if (provider === kRustoreProvider) return require('../../assets/ic_rus.png');
  if (provider === kApnsProvider) return require('../../assets/ic_apns.png');
  return require('../../assets/ic_fcm.png');
}

function formatDate(timestamp: string | null): string {
  if (timestamp == null || timestamp.length === 0) return '—';
  const datePart = timestamp.split(' ')[0] ?? '';
  const parts = datePart.split('-');
  if (parts.length < 3) return datePart;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

async function openUrl(url: string): Promise<void> {
  try {
    await Linking.openURL(url);
  } catch {
    // ignore
  }
}

/** One push provider card in the left column. */
function ModuleCard(props: { def: ModuleDef; isOn: boolean }) {
  const { def, isOn } = props;
  return (
    <TouchableOpacity
      style={styles.moduleCardOuter}
      activeOpacity={0.9}
      onPress={() => void SdkTests.doUpdateProvider(def.priority)}
    >
      <View style={styles.moduleCard}>
        <View style={styles.moduleIconCircle}>
          <Image
            source={def.icon}
            style={{ width: def.iconSize, height: def.iconSize }}
            resizeMode="contain"
          />
        </View>
        <View style={styles.moduleTexts}>
          <Text style={styles.moduleName} numberOfLines={1}>
            {def.name}
          </Text>
          <View style={styles.moduleStatusRow}>
            <Text style={styles.moduleStatusText}>{isOn ? 'on' : 'off'}</Text>
            <StatusIndicator
              status={isOn ? kSubscribed : kUnsubscribed}
              radius={7}
            />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

/** One information card for token, date or SDK version. */
function InfoItemCard(props: {
  title: string;
  body: string;
  icon: number;
  iconSize?: number;
  bodyLines?: number;
  bodyFontSize?: number;
}) {
  const { title, body, icon } = props;
  const iconSize = props.iconSize ?? 20;
  const bodyLines = props.bodyLines ?? 2;
  return (
    <View style={styles.infoItemOuter}>
      <View style={styles.infoItemCard}>
        <View style={styles.infoItemHeader}>
          <View style={styles.infoItemIconCircle}>
            <Image
              source={icon}
              style={{ width: iconSize, height: iconSize }}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.infoItemTitle} numberOfLines={1}>
            {title}
          </Text>
        </View>
        <View style={styles.infoItemBodyWrap}>
          <Text
            style={[
              styles.infoItemBody,
              props.bodyFontSize != null
                ? { fontSize: props.bodyFontSize }
                : null,
            ]}
            numberOfLines={bodyLines}
          >
            {body}
          </Text>
        </View>
      </View>
    </View>
  );
}

/** Status shortcut button (InApp, Push, Auth, GitHub, website). */
function StatusCard(props: {
  icon?: number;
  iconSize?: number;
  iconAlpha?: number;
  badge?: boolean;
  authDot?: boolean;
  invisible?: boolean;
  testID?: string;
  onPress?: () => void;
}) {
  const {
    icon,
    iconSize = 20,
    iconAlpha = 1,
    badge = false,
    authDot = false,
  } = props;

  if (props.invisible) {
    return <View style={styles.statusCardInvisible} />;
  }

  return (
    <TouchableOpacity
      style={styles.statusCardOuter}
      activeOpacity={0.9}
      onPress={props.onPress}
      testID={props.testID}
    >
      <View style={styles.statusCard}>
        <View
          style={{
            width: iconSize,
            height: iconSize,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {authDot ? <View style={styles.authDot} /> : null}
          {icon != null ? (
            <Image
              source={icon}
              style={{ width: iconSize, height: iconSize, opacity: iconAlpha }}
              resizeMode="contain"
            />
          ) : null}
          {badge ? (
            <View style={styles.badgeOuter}>
              <View style={styles.badgeInner}>
                <Text style={styles.badgeCheck}>✓</Text>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

/** One transparent row of four status button slots. */
function StatusCardsRow(props: { children: React.ReactNode[] }) {
  return (
    <View style={styles.statusCardsRow}>
      <View style={styles.statusCardsLeft}>
        <View style={styles.statusCardSlot}>{props.children[0]}</View>
        <View style={styles.statusCardSlot}>{props.children[1]}</View>
      </View>
      <View style={styles.statusCardsRight}>
        <View style={styles.statusCardSlot}>{props.children[2]}</View>
        <View style={styles.statusCardSlot}>{props.children[3]}</View>
      </View>
    </View>
  );
}

/** Provider or subscription status indicator. */
function StatusIndicator(props: { status: string; radius: number }) {
  const { status, radius } = props;
  const size = { width: radius, height: radius, borderRadius: radius / 2 };

  if (status === kSubscribed) {
    return <View style={[size, styles.indicatorSubscribed]} />;
  }
  if (status === kSuspended) {
    return <View style={[size, styles.indicatorSuspended]} />;
  }
  return <View style={[size, styles.indicatorUnsubscribed]} />;
}

// ---------------- Action buttons ----------------

type ActionIcon = 'subscribe' | 'profile' | 'target' | 'clear';

/** Primary action button matching Android Compose. */
function ActionButton(props: {
  label: string;
  icon: ActionIcon;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <View style={styles.actionButtonOuter}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={props.onPress}
        testID={props.testID}
      >
        <View style={styles.actionButtonOuterCircle}>
          <View style={styles.actionButtonInnerCircle}>
            <ActionIconView icon={props.icon} />
          </View>
        </View>
      </TouchableOpacity>
      <Text style={styles.actionButtonLabel} numberOfLines={2}>
        {props.label}
      </Text>
    </View>
  );
}

/** View-based action icons mirroring the Compose CustomPaint icons. */
function ActionIconView(props: { icon: ActionIcon }) {
  const { icon } = props;

  if (icon === 'subscribe') {
    return (
      <View style={styles.iconBox}>
        <View style={styles.iconPlusH} />
        <View style={styles.iconPlusV} />
      </View>
    );
  }

  if (icon === 'profile') {
    return (
      <View style={styles.iconBox}>
        <View style={styles.profileDot} />
        <View style={styles.profileV} />
      </View>
    );
  }

  if (icon === 'target') {
    return (
      <View style={styles.iconBox}>
        <View style={styles.targetTop} />
        <View style={styles.targetBottom} />
      </View>
    );
  }

  return (
    <View style={styles.iconBox}>
      <View style={styles.clearLine1} />
      <View style={styles.clearLine2} />
    </View>
  );
}

// ---------------- Panels ----------------

/** Creates a tinted informational strip with an optional action. */
function SectionInfo(props: {
  text: string;
  bg?: string;
  icon?: 'close' | 'arrow';
  onPress?: () => void;
}) {
  const bg = props.bg ?? 'rgba(173,247,189,0.2)';
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={props.onPress}>
      <View style={[styles.sectionInfo, { backgroundColor: bg }]}>
        {props.icon === 'close' ? (
          <Text style={styles.sectionInfoIcon}>✕</Text>
        ) : null}
        {props.icon === 'arrow' ? (
          <Text style={styles.sectionInfoIcon}>↗</Text>
        ) : null}
        <Text style={styles.sectionInfoText} numberOfLines={1}>
          {props.text}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function SectionTitle(props: { text: string }) {
  return <Text style={styles.sectionTitle}>{props.text}</Text>;
}

/** Push and In-App subscription management panel. */
function SubBox(props: { onClose: () => void }) {
  const close = props.onClose;
  return (
    <View>
      <SectionTitle text="Subscribe to:" />
      <View style={styles.subBoxCard}>
        <VerticalLabel text="push" bg="rgba(51,255,95,0.1)" gap="right" />
        <View style={styles.subActionColumn}>
          <SubActionButton
            text="Subscribe"
            iconBg="rgba(51,255,95,0.1)"
            icon="plus"
            onPress={async () => {
              await SdkTests.doPushSubscribe();
              close();
            }}
          />
          <SubActionButton
            text="Unsubscribe"
            iconBg="rgba(0,0,0,0.1)"
            icon="x"
            onPress={async () => {
              await SdkTests.doPushUnSubscribe();
              close();
            }}
          />
        </View>
        <VerticalLabel text="inapp" bg="rgba(141,191,252,0.1)" gap="both" />
        <View style={styles.subActionColumn}>
          <SubActionButton
            text="Subscribe"
            iconBg="rgba(141,191,252,0.1)"
            icon="plus"
            onPress={async () => {
              await SdkTests.doInAppSubscribe();
              close();
            }}
          />
          <SubActionButton
            text="Unsubscribe"
            iconBg="rgba(0,0,0,0.1)"
            icon="x"
            onPress={async () => {
              await SdkTests.doInAppUnsubscribe();
              close();
            }}
          />
        </View>
        <View style={styles.loginColumn}>
          <SubActionButton
            text="Log In"
            iconBg="rgba(0,0,0,0.7)"
            icon="check-in"
            iconSize={23}
            textSize={10}
            onPress={async () => {
              await SdkTests.doLogin();
              close();
            }}
          />
          <SubActionButton
            text="Log Out"
            iconBg="rgba(0,0,0,0.7)"
            icon="check-out"
            iconSize={23}
            textSize={10}
            onPress={async () => {
              await SdkTests.doLogout();
              close();
            }}
          />
        </View>
      </View>
      <View style={styles.subInfoGap} />
      <SectionInfo
        text="Managing a push subscription. Click to close"
        onPress={close}
      />
      <View style={styles.subBottomGap} />
    </View>
  );
}

/** Vertical single-character label strip. Mirrors VerticalLabel. */
function VerticalLabel(props: {
  text: string;
  bg: string;
  gap: 'right' | 'both';
}) {
  return (
    <View
      style={[
        styles.verticalLabel,
        { backgroundColor: props.bg },
        props.gap === 'right'
          ? styles.verticalLabelGapRight
          : styles.verticalLabelGapBoth,
      ]}
    >
      {props.text.split('').map((ch, i) => (
        <Text key={`${ch}-${i}`} style={styles.verticalLabelChar}>
          {ch}
        </Text>
      ))}
    </View>
  );
}

/** Wide white action card with a circular icon and a caption. Mirrors SubActionButton. */
function SubActionButton(props: {
  text: string;
  iconBg: string;
  icon: 'plus' | 'x' | 'check-in' | 'check-out';
  iconSize?: number;
  textSize?: number;
  onPress: () => Promise<void> | void;
}) {
  const iconSize = props.iconSize ?? 20;
  const textSize = props.textSize ?? 8;
  return (
    <TouchableOpacity
      style={styles.subActionButton}
      activeOpacity={0.85}
      onPress={() => void props.onPress()}
    >
      <View
        style={[
          styles.subActionIconCircle,
          { backgroundColor: props.iconBg, width: iconSize, height: iconSize },
        ]}
      >
        {props.icon === 'plus' ? <PlusGlyph /> : null}
        {props.icon === 'x' ? <XGlyph /> : null}
        {props.icon === 'check-in' ? <CheckArrowGlyph direction="in" /> : null}
        {props.icon === 'check-out' ? <CheckArrowGlyph direction="out" /> : null}
      </View>
      <View style={styles.subActionGap} />
      <Text style={[styles.subActionText, { fontSize: textSize }]} numberOfLines={1}>
        {props.text}
      </Text>
    </TouchableOpacity>
  );
}

/** Small plus glyph drawn with two bars. Mirrors PlusIcon. */
function PlusGlyph() {
  return (
    <View style={styles.glyphBox}>
      <View style={styles.glyphBarH} />
      <View style={styles.glyphBarV} />
    </View>
  );
}

/** Small x glyph drawn with two rotated bars. Mirrors XShapedIcon. */
function XGlyph() {
  return (
    <View style={styles.glyphBox}>
      <View style={[styles.glyphBarH, styles.glyphRotated45]} />
      <View style={[styles.glyphBarH, styles.glyphRotatedM45]} />
    </View>
  );
}

/** Wide V arrowhead drawn with two bars, rotated ±90. Mirrors CommonIcon. */
function CheckArrowGlyph(props: { direction: 'in' | 'out' }) {
  return (
    <View
      style={[
        styles.checkArrowBox,
        {
          transform: [
            { rotate: props.direction === 'in' ? '-90deg' : '90deg' },
          ],
        },
      ]}
    >
      <View style={[styles.checkArrowArm, styles.checkArrowArmL]} />
      <View style={[styles.checkArrowArm, styles.checkArrowArmR]} />
    </View>
  );
}

/** Profile panel. Mirrors ProfileComponents.ProfileBox. */
function ProfileBox(props: {
  loading: boolean;
  data: Record<string, unknown> | null;
  onClose: () => void;
}) {
  return (
    <View>
      <SectionTitle text="Profile info:" />
      <View style={styles.profileCard}>
        {props.loading ? (
          <ActivityIndicator
            style={styles.profileLoader}
            size="small"
            color="#9E9E9E"
          />
        ) : (
          <ProfileContent data={props.data} />
        )}
      </View>
      <View style={styles.profileCloseGap} />
      <SectionInfo
        text="Click to close"
        bg="rgba(141,191,252,0.2)"
        icon="close"
        onPress={props.onClose}
      />
      <View style={styles.profileBottomGap} />
    </View>
  );
}

/** Profile information rows. */
function ProfileContent(props: { data: Record<string, unknown> | null }) {
  const response = props.data?.['response'] as
    | Record<string, unknown>
    | undefined;
  const profile = response?.['profile'] as
    | Record<string, unknown>
    | undefined;

  if (profile == null) {
    const errorText =
      response != null && response['error_text'] != null
        ? String(response['error_text'])
        : null;
    return (
      <Text style={styles.profileEmpty}>
        {errorText == null || errorText.length === 0
          ? 'Profile data is null'
          : errorText}
      </Text>
    );
  }

  const subscription = profile['subscription'] as
    | Record<string, unknown>
    | undefined;

  const rows: Array<[string, string]> = [
    ['ID', profileValue('ID', profile['id'])],
    ['Status', profileValue('Status', profile['status'])],
    ['Is Test', profileValue('Is Test', profile['is_test'])],
  ];

  const cats =
    subscription != null && Array.isArray(subscription['cats'])
      ? (subscription['cats'] as Array<Record<string, unknown>>)
      : [];
  const fields =
    subscription != null && subscription['fields'] != null
      ? (subscription['fields'] as Record<string, unknown>)
      : null;

  return (
    <ScrollView style={styles.profileScroll}>
      {rows.map(([label, value]) => (
        <ProfileRow key={label} label={label} value={value} />
      ))}

      {subscription != null ? (
        <>
          <View style={styles.profileDividerGap} />
          <View style={styles.profileDivider} />
          <Text style={styles.profileSectionLabel}>Subscription:</Text>
          <ProfileRow
            label="Subscription ID"
            value={profileValue('Subscription ID', subscription['subscriptionId'])}
          />
          <ProfileRow
            label="Hash ID"
            value={profileValue('Hash ID', subscription['hashId'])}
          />
          <ProfileRow
            label="Provider"
            value={profileValue('Provider', subscription['provider'])}
          />
          <ProfileRow
            label="Status"
            value={profileValue('Status', subscription['status'])}
          />

          {cats.length > 0 ? (
            <>
              <View style={styles.profileDividerGap} />
              <View style={styles.profileDivider} />
              <Text style={styles.profileSectionLabel}>Categories:</Text>
              {cats.map((category, index) => (
                <View key={index}>
                  <ProfileRow
                    label="Name"
                    value={profileValue('Name', category['name'])}
                  />
                  <ProfileRow
                    label="Title"
                    value={profileValue('Title', category['title'])}
                  />
                  <ProfileRow
                    label="Steady"
                    value={profileValue('Steady', category['steady'])}
                  />
                  <ProfileRow
                    label="Active"
                    value={profileValue('Active', category['active'])}
                  />
                  <View style={styles.profileCatGap} />
                </View>
              ))}
            </>
          ) : null}

          {fields != null ? (
            <>
              <View style={styles.profileDividerGap} />
              <View style={styles.profileDivider} />
              <Text style={styles.profileSectionLabel}>Fields:</Text>
              {Object.keys(fields).map((key) => (
                <ProfileRow
                  key={key}
                  label={key}
                  value={fields[key] != null ? String(fields[key]) : 'null'}
                />
              ))}
            </>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}

/** Truncates long subscription IDs to the first and last 15 characters. */
function profileValue(label: string, value: unknown): string {
  const text = value != null ? String(value) : null;
  if (label === 'Subscription ID' && text != null && text.length > 30) {
    return `${text.substring(0, 15)}...${text.substring(text.length - 15)}`;
  }
  return text ?? 'null';
}

/** SpaceBetween layout with 10sp gray label and black value. */
function ProfileRow(props: { label: string; value: string }) {
  return (
    <View style={styles.profileRow}>
      <Text style={styles.profileRowLabel}>{props.label}</Text>
      <Text style={styles.profileRowValue} numberOfLines={2}>
        {props.value}
      </Text>
    </View>
  );
}

/** Mobile event input form. */
function MobileEventBox(props: {
  sid: string;
  name: string;
  onSidChange: (v: string) => void;
  onNameChange: (v: string) => void;
  onClose: () => void;
}) {
  return (
    <View>
      <SectionTitle text="Mobile Event:" />
      <View style={styles.mobileEventCard}>
        <View style={styles.textFieldRow}>
          <Text style={styles.textFieldLabel}>sid</Text>
          <TextInput
            style={styles.textFieldInput}
            value={props.sid}
            onChangeText={props.onSidChange}
            placeholder="Enter value"
            placeholderTextColor="#9E9E9E"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        <View style={styles.textFieldDivider} />
        <View style={styles.textFieldRow}>
          <Text style={styles.textFieldLabel}>name</Text>
          <TextInput
            style={styles.textFieldInput}
            value={props.name}
            onChangeText={props.onNameChange}
            placeholder="Enter value"
            placeholderTextColor="#9E9E9E"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>
      <SectionInfo
        text="Click to send"
        bg="rgba(173,247,189,0.2)"
        icon="arrow"
        onPress={() => {
          const s = props.sid.trim();
          const n = props.name.trim();
          if (s.length === 0 || n.length === 0) return;
          void SdkTests.doSendMobileEvent(s, n);
        }}
      />
      <SectionInfo
        text="Click to close"
        bg="rgba(141,191,252,0.2)"
        icon="close"
        onPress={props.onClose}
      />
    </View>
  );
}

/** Recent SDK events section. */
function EventsSection(props: { events: SdkEvent[] }) {
  const events = props.events;
  const count = Math.min(events.length, 5);

  return (
    <View>
      <SectionTitle text="Main events:" />
      {events.length === 0 ? (
        <Text style={styles.eventsEmpty}>No events yet</Text>
      ) : (
        <View style={styles.eventsList}>
          {Array.from({ length: count }, (_, index) => {
            const event = events[events.length - 1 - index];
            if (!event) {
              return null;
            }
            return (
              <EventCard
                key={index}
                ev={event}
                isFirst={index === 0}
                isLast={index === count - 1}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

/** Displays an SDK event using the Android Compose timeline layout. */
function EventCard(props: { ev: SdkEvent; isFirst: boolean; isLast: boolean }) {
  const { ev, isFirst, isLast } = props;

  const isProviderSet = (ev.message ?? '').startsWith('push provider set -');

  const dotColor = isProviderSet
    ? K_SUCCESS
    : ev.type === 'error' || ev.type === 'retryError'
      ? K_ERROR
      : ev.code != null
        ? (ev.code >= 200 && ev.code <= 299) || ev.code === 304
          ? K_SUCCESS
          : K_ERROR
        : '#000000';

  let badgeText: string | null = null;
  if (isProviderSet) {
    const token = (ev.value as Record<string, unknown> | null | undefined)?.[
      'token'
    ];
    const tokenText = token != null ? String(token) : '';
    if (tokenText.trim().length > 0) {
      badgeText = tokenText.substring(Math.max(0, tokenText.length - 3));
    }
  } else if (ev.code != null) {
    badgeText = String(ev.code);
  }

  const timestamp = (ev.timestamp ?? '').trim();
  const parts = timestamp.split(/\s+/);
  const date = timestamp.length === 0 ? '--' : (parts[0] ?? '--');
  const time = parts.length > 1 ? parts.slice(1).join(' ') : '--';

  return (
    <View>
      <View style={styles.eventCard}>
        <View style={styles.eventDotColumn}>
          {!isFirst ? <View style={styles.eventLineTop} /> : null}
          {!isLast ? <View style={styles.eventLineBottom} /> : null}
          <View style={[styles.eventDot, { backgroundColor: dotColor }]} />
        </View>
        <View style={styles.eventTimeColumn}>
          <Text style={styles.eventDate} numberOfLines={1}>
            {date}
          </Text>
          <Text style={styles.eventTime} numberOfLines={1}>
            {time}
          </Text>
        </View>
        <View style={styles.eventContent}>
          <Text style={styles.eventFunction} numberOfLines={1}>
            {(ev.function ?? '').length === 0 ? ev.type : ev.function}
          </Text>
          <Text style={styles.eventMessage} numberOfLines={1}>
            {(ev.message ?? '').length === 0 ? 'SDK event' : ev.message}
          </Text>
        </View>
        {badgeText != null ? (
          <View
            style={[styles.eventBadge, { backgroundColor: withAlpha(dotColor, 0.2) }]}
          >
            <Text style={styles.eventBadgeText}>{badgeText}</Text>
          </View>
        ) : (
          <Text style={styles.eventChevron}>›</Text>
        )}
      </View>
      {!isLast ? <View style={styles.eventSeparator} /> : null}
    </View>
  );
}

/** Converts #RRGGBB into rgba() with the given alpha. */
function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
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
    paddingBottom: 16,
  },
  // InfoCard
  infoCard: {
    height: 320,
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  logoTop: {
    height: 16,
  },
  logoRow: {
    paddingLeft: 16,
  },
  logo: {
    width: 80,
    height: 20,
  },
  logoBottom: {
    height: 11,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  moduleColumn: {
    paddingLeft: 10,
  },
  infoColumn: {
    flex: 1,
    marginLeft: 10,
  },
  tokenRow: {
    height: 135,
    width: '100%',
  },
  statusRow: {
    height: 65,
  },
  moduleCardOuter: {
    width: 90,
    height: 66,
    paddingTop: 7,
    paddingLeft: 3,
  },
  moduleCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    flexDirection: 'row',
    paddingTop: 5,
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  moduleIconCircle: {
    width: 37,
    height: 37,
    borderRadius: 19,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 5,
  },
  moduleTexts: {
    flex: 1,
    marginLeft: 10,
  },
  moduleName: {
    marginTop: 10,
    fontSize: 9,
    fontWeight: 'bold',
    color: '#000000',
  },
  moduleStatusRow: {
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
  },
  moduleStatusText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#000000',
    marginRight: 10,
  },
  infoItemOuter: {
    width: 137,
    height: 135,
    paddingTop: 7,
    paddingLeft: 8,
    paddingRight: 7,
    paddingBottom: 4,
  },
  infoItemCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  infoItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 5,
    paddingTop: 5,
    paddingRight: 4,
  },
  infoItemIconCircle: {
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoItemTitle: {
    flex: 1,
    fontSize: 11,
    color: '#000000',
    marginLeft: 10,
  },
  infoItemBodyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoItemBody: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
    marginTop: -10,
  },
  statusCardsRow: {
    flex: 1,
    flexDirection: 'row',
    paddingLeft: 7,
    paddingTop: 3,
    paddingRight: 5,
  },
  statusCardsLeft: {
    flex: 200,
    flexDirection: 'row',
  },
  statusCardsRight: {
    flex: 185,
    flexDirection: 'row',
  },
  statusCardSlot: {
    flex: 1,
  },
  statusCardOuter: {
    flex: 1,
    padding: 3,
  },
  statusCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  statusCardInvisible: {
    flex: 1,
  },
  authDot: {
    position: 'absolute',
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: 'rgba(173,247,189,0.5)',
  },
  badgeOuter: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCheck: {
    fontSize: 7,
    lineHeight: 8,
    color: '#FFFFFF',
  },
  subscribeStatusPosition: {
    position: 'absolute',
    left: 15,
    bottom: 17,
    flexDirection: 'row',
    alignItems: 'center',
  },
  subscribeStatusText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
    marginRight: 8,
  },
  indicatorSubscribed: {
    backgroundColor: K_SUCCESS,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  indicatorSuspended: {
    backgroundColor: K_SUSPENDED,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  indicatorUnsubscribed: {
    backgroundColor: K_ERROR,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  // Actions
  actionsTitle: {
    marginLeft: 15,
    marginTop: 20,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  actionRow: {
    marginTop: 12,
    paddingHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButtonOuter: {
    width: 90,
    paddingVertical: 8,
    alignItems: 'center',
  },
  actionButtonOuterCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  actionButtonInnerCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonLabel: {
    marginTop: 4,
    width: 70,
    fontSize: 10,
    lineHeight: 10,
    color: '#000000',
    textAlign: 'center',
  },
  iconBox: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPlusH: {
    position: 'absolute',
    width: 12,
    height: 3,
    borderRadius: 2,
    backgroundColor: K_SUCCESS,
  },
  iconPlusV: {
    position: 'absolute',
    width: 3,
    height: 12,
    borderRadius: 2,
    backgroundColor: K_SUCCESS,
  },
  profileDot: {
    position: 'absolute',
    top: 1,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  profileV: {
    position: 'absolute',
    bottom: 2,
    width: 12,
    height: 8,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderColor: 'transparent',
    borderBottomColor: K_ACCENT,
    borderRadius: 2,
  },
  targetTop: {
    position: 'absolute',
    top: 2,
    width: 15,
    height: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderColor: K_ACCENT,
  },
  targetBottom: {
    position: 'absolute',
    bottom: 2,
    width: 15,
    height: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderColor: '#FFFFFF',
  },
  clearLine1: {
    position: 'absolute',
    width: 14,
    height: 3,
    borderRadius: 2,
    backgroundColor: K_ACCENT,
    transform: [{ rotate: '45deg' }],
  },
  clearLine2: {
    position: 'absolute',
    width: 14,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '-45deg' }],
  },
  // Section helpers
  sectionTitle: {
    marginLeft: 15,
    marginTop: 20,
    marginBottom: 10,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  sectionInfo: {
    marginHorizontal: 15,
    marginVertical: 6,
    height: 25,
    borderRadius: 5,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionInfoIcon: {
    fontSize: 11,
    color: 'rgba(0,0,0,0.5)',
    marginRight: 4,
  },
  sectionInfoText: {
    flex: 1,
    fontSize: 12,
    color: '#9E9E9E',
  },
  // SubBox
  subBoxCard: {
    marginHorizontal: 10,
    height: 130,
    flexDirection: 'row',
  },
  verticalLabel: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  verticalLabelGapRight: {
    flex: 1,
    marginRight: 2.5,
  },
  verticalLabelGapBoth: {
    flex: 1,
    marginHorizontal: 2.5,
  },
  verticalLabelChar: {
    fontSize: 10,
    lineHeight: 10,
    color: '#000000',
    textAlign: 'center',
  },
  subActionColumn: {
    flex: 2,
    justifyContent: 'space-between',
  },
  subActionButton: {
    flex: 1,
    marginHorizontal: 2.5,
    marginVertical: 2,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  subActionIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subActionGap: {
    height: 2,
  },
  subActionText: {
    color: '#000000',
    lineHeight: 9,
  },
  glyphBox: {
    width: 10,
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphBarH: {
    position: 'absolute',
    width: 10,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#000000',
  },
  glyphBarV: {
    position: 'absolute',
    width: 2,
    height: 10,
    borderRadius: 1,
    backgroundColor: '#000000',
  },
  glyphRotated45: {
    transform: [{ rotate: '45deg' }],
  },
  glyphRotatedM45: {
    transform: [{ rotate: '-45deg' }],
  },
  checkArrowBox: {
    width: 17,
    height: 17,
  },
  checkArrowArm: {
    position: 'absolute',
    width: 7.5,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
  },
  checkArrowArmL: {
    left: 1.8,
    top: 12.2,
    transform: [{ rotate: '35.5deg' }],
  },
  checkArrowArmR: {
    left: 7.8,
    top: 12.2,
    transform: [{ rotate: '-35.5deg' }],
  },
  loginColumn: {
    width: 88.5,
    marginLeft: 2.5,
    justifyContent: 'space-between',
  },
  subInfoGap: {
    height: 15,
  },
  subBottomGap: {
    height: 10,
  },
  // ProfileBox
  profileCard: {
    marginHorizontal: 15,
    height: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  profileLoader: {
    marginTop: 160,
  },
  profileScroll: {
    flex: 1,
  },
  profileEmpty: {
    marginTop: 150,
    textAlign: 'center',
    fontSize: 12,
    color: '#9E9E9E',
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  profileRowLabel: {
    fontSize: 12,
    color: '#9E9E9E',
  },
  profileRowValue: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'right',
    marginLeft: 12,
  },
  profileDivider: {
    height: 1,
    backgroundColor: K_LINE,
    marginVertical: 6,
  },
  profileDividerGap: {
    height: 4,
  },
  profileSectionLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 4,
  },
  profileCatGap: {
    height: 6,
  },
  profileCloseGap: {
    height: 6,
  },
  profileBottomGap: {
    height: 10,
  },
  // MobileEventBox
  mobileEventCard: {
    marginHorizontal: 15,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  textFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
  },
  textFieldLabel: {
    width: 60,
    fontSize: 12,
    color: '#9E9E9E',
  },
  textFieldInput: {
    flex: 1,
    fontSize: 13,
    color: '#000000',
    paddingVertical: 0,
  },
  textFieldDivider: {
    height: 1,
    backgroundColor: K_LINE,
  },
  // Events
  eventsEmpty: {
    marginLeft: 15,
    fontSize: 12,
    color: '#9E9E9E',
  },
  eventsList: {
    marginHorizontal: 15,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
  },
  eventDotColumn: {
    width: 14,
    height: '100%',
    alignItems: 'center',
  },
  eventLineTop: {
    position: 'absolute',
    top: 0,
    width: 1,
    height: '50%',
    backgroundColor: K_LINE,
  },
  eventLineBottom: {
    position: 'absolute',
    bottom: 0,
    width: 1,
    height: '50%',
    backgroundColor: K_LINE,
  },
  eventDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    marginTop: 27,
  },
  eventTimeColumn: {
    width: 78,
    marginLeft: 10,
  },
  eventDate: {
    fontSize: 11,
    fontWeight: '600',
    color: '#000000',
  },
  eventTime: {
    fontSize: 10,
    color: '#9E9E9E',
  },
  eventContent: {
    flex: 1,
    marginLeft: 8,
  },
  eventFunction: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
  },
  eventMessage: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  eventBadge: {
    minWidth: 34,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  eventBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000000',
  },
  eventChevron: {
    fontSize: 16,
    color: '#9E9E9E',
  },
  eventSeparator: {
    height: 1,
    backgroundColor: K_LINE,
    marginLeft: 24,
  },
});

export default HomeScreen;