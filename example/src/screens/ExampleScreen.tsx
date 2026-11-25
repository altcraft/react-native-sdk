import React, { useCallback, useEffect, useState } from 'react';
import {
  SafeAreaView,
  ActivityIndicator,
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
View,
} from 'react-native';
import { AltcraftPush } from '@altcraft/push';
import { CheckGlyph, MinusGlyph } from '../components/CheckGlyph';
import { ScreenHeader } from '../components/ScreenHeader';
import {
  Store,
  NotificationData,
  kExampleBody,
  kExampleTitle,
} from '../services/store';

const K_LINE = '#E0E0E0';

/**
 * Example screen for configuring and displaying a test push notification.
 *
 * Mirrors Android Compose ExampleScreen:
 * - Altcraft header
 * - Notification preview card
 * - Scrollable notification settings
 * - Text, image and button settings
 * - Send push action
 */
export function ExampleScreen(): React.JSX.Element {
  const [title, setTitle] = useState(kExampleTitle);
  const [body, setBody] = useState(kExampleBody);
  const [smallUrl, setSmallUrl] = useState('');
  const [largeUrl, setLargeUrl] = useState('');
  const [buttons, setButtons] = useState<string[]>([]);
  const [isSending, setSending] = useState(false);

  const load = useCallback(async () => {
    const data = await Store.instance.getNotificationData();
    setTitle(data.title);
    setBody(data.body);
    setSmallUrl(data.smallImageUrl ?? '');
    setLargeUrl(data.largeImageUrl ?? '');
    setButtons([...data.buttons]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveAll = useCallback(
    async (
      nextTitle: string,
      nextBody: string,
      nextSmallUrl: string,
      nextLargeUrl: string,
      nextButtons: string[]
    ) => {
      const data = new NotificationData(
        nextTitle.trim(),
        nextBody.trim(),
        nextSmallUrl.trim(),
        nextLargeUrl.trim(),
        [...nextButtons]
      );
      await Store.instance.saveNotificationData(data);
      await load();
    },
    [load]
  );

  const sendPush = useCallback(async () => {
    if (isSending) return;
    setSending(true);
    try {
      const data = await Store.instance.getNotificationData();

      const jsonButtons = data.buttons.map((label) => ({
        label,
        link: '',
        action: 'open app',
      }));

      const pushMap: Record<string, string> = {
        _title: data.title,
        _body: data.body,
        _buttons: JSON.stringify(jsonButtons),
        ...(Platform.OS === 'android' ? { _uid: String(Date.now()) } : {}),
        _ac_push: 'Altcraft',
      };
      if (data.smallImageUrl != null) pushMap['_icon'] = data.smallImageUrl;
      if (data.largeImageUrl != null) {
        pushMap[Platform.OS === 'ios' ? '_media' : '_image'] =
          data.largeImageUrl;
      }

      await AltcraftPush.requestNotificationPermission();
      AltcraftPush.takePush(pushMap);
    } finally {
      setSending(false);
    }
  }, [isSending]);

  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;

  const previewTitle = title.length > 0 ? title : kExampleTitle;
  const previewBody = body.length > 0 ? body : kExampleBody;
  const smallImageUri = smallUrl.trim();
  const largeImageUri = largeUrl.trim();

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader />

      <View style={styles.previewGap} />

      {/* Notification preview stays outside the settings scroll area. */}
      <NotificationPreview
        time={time}
        title={previewTitle}
        body={previewBody}
        smallImageUri={smallImageUri}
        largeImageUri={largeImageUri}
        buttons={buttons}
      />

      <View style={styles.settingsGap} />

      {/* Scrollable notification settings. */}
      <View style={styles.settingsContainer}>
        <TextSetting
          title={title}
          body={body}
          onReset={async () => {
            setTitle(kExampleTitle);
            setBody(kExampleBody);
            await saveAll(kExampleTitle, kExampleBody, smallUrl, largeUrl, buttons);
          }}
          onSave={async () => {
            await saveAll(title, body, smallUrl, largeUrl, buttons);
          }}
          onTitleChange={setTitle}
          onBodyChange={setBody}
        />

        <View style={styles.sectionGap} />

        <ImageSetting
          smallUrl={smallUrl}
          largeUrl={largeUrl}
          onSmallUrlChange={setSmallUrl}
          onLargeUrlChange={setLargeUrl}
          onReset={async () => {
            setSmallUrl('');
            setLargeUrl('');
            await saveAll(title, body, '', '', buttons);
          }}
          onSave={async () => {
            await saveAll(title, body, smallUrl, largeUrl, buttons);
          }}
        />

        <View style={styles.sectionGap} />

        <ButtonsSetting
          buttons={buttons}
          onButtonsChange={setButtons}
          onReset={async () => {
            setButtons([]);
            await saveAll(title, body, smallUrl, largeUrl, []);
          }}
          onAdd={async () => {
            if (buttons.length >= 3) return;
            const next = [...buttons, ''];
            setButtons(next);
          }}
          onSaveButton={async (index, value) => {
            const next = [...buttons];
            if (index >= next.length) return;
            next[index] = value;
            setButtons(next);
            await saveAll(title, body, smallUrl, largeUrl, next);
          }}
          onRemoveButton={async (index) => {
            const next = [...buttons];
            if (index >= next.length) return;
            next.splice(index, 1);
            setButtons(next);
            await saveAll(title, body, smallUrl, largeUrl, next);
          }}
        />

        <View style={styles.sectionGap} />

        {/* Sends the configured notification. */}
        <TouchableOpacity
          style={styles.sendPill}
          activeOpacity={0.8}
          disabled={isSending}
          onPress={() => void sendPush()}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#9E9E9E" />
          ) : (
            <Text style={styles.sendText}>Send push</Text>
          )}
        </TouchableOpacity>

        <View style={styles.bottomGap} />
      </View>
    </SafeAreaView>
  );
}

/** Push notification preview matching Compose NotificationCard. */
function NotificationPreview(props: {
  time: string;
  title: string;
  body: string;
  smallImageUri: string;
  largeImageUri: string;
  buttons: string[];
}) {
  const { time, title, body, smallImageUri, largeImageUri, buttons } = props;
  const hasActions = largeImageUri.length > 0 || buttons.length > 0;

  return (
    <View style={styles.previewCard}>
      <View style={styles.previewTop}>
        <View style={styles.previewIconBox}>
          <Image
            source={require('../../assets/ic_altcraft_push_icon.jpg')}
            style={styles.previewIcon}
          />
        </View>
        <View style={styles.previewContent}>
          <View style={styles.previewMetaRow}>
            <Text style={styles.previewAppName} numberOfLines={1}>
              AltcraftMSDKv2
            </Text>
            <Text style={styles.previewTime}>{time}</Text>
          </View>
          <View style={styles.previewTitleRow}>
            <Text style={styles.previewTitle} numberOfLines={2}>
              {title}
            </Text>
            {smallImageUri.length > 0 ? (
              <Image
                source={{ uri: smallImageUri }}
                style={styles.previewSmallImage}
                resizeMode="contain"
              />
            ) : null}
            <Text style={styles.previewChevron}>›</Text>
          </View>
          <Text style={styles.previewBody}>{body}</Text>
          {largeImageUri.length > 0 ? (
            <Image
              source={{ uri: largeImageUri }}
              style={styles.previewLargeImage}
              resizeMode="cover"
            />
          ) : null}
        </View>
      </View>

      {hasActions ? (
        <View style={styles.previewButtonRow}>
          {buttons.map((label, index) => (
            <View key={index} style={styles.previewButtonWrap}>
              {index > 0 ? <View style={styles.previewButtonDivider} /> : null}
              <Text style={styles.previewButtonText} numberOfLines={1}>
                {label}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.previewBottomGap} />
      )}
    </View>
  );
}

/** Settings section heading with remove and add buttons. */
function SectionHeader(props: {
  title: string;
  onRemove: () => void;
  onAdd: () => void;
}) {
  return (
    <View>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>{props.title}</Text>
        <TouchableOpacity
          style={[styles.actionCircle, styles.actionRemove]}
          onPress={props.onRemove}
        >
          <MinusGlyph />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionCircle, styles.actionAdd]}
          onPress={props.onAdd}
        >
          <CheckGlyph />
        </TouchableOpacity>
      </View>
      <View style={styles.sectionAccent} />
    </View>
  );
}

/** One labeled editable field (EditTextRow). */
function EditRow(props: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  hint?: string;
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
        />
      </View>
      <View style={styles.editRowDivider} />
    </View>
  );
}

/** Notification text settings. */
function TextSetting(props: {
  title: string;
  body: string;
  onTitleChange: (v: string) => void;
  onBodyChange: (v: string) => void;
  onReset: () => void;
  onSave: () => void;
}) {
  return (
    <View>
      <SectionHeader title="Text setting:" onRemove={props.onReset} onAdd={props.onSave} />
      <View style={styles.settingsGapSmall} />
      <EditRow label="Title" value={props.title} onChangeText={props.onTitleChange} hint={kExampleTitle} />
      <View style={styles.editGap} />
      <EditRow label="Body" value={props.body} onChangeText={props.onBodyChange} hint={kExampleBody} />
    </View>
  );
}

/** Notification image URL settings. */
function ImageSetting(props: {
  smallUrl: string;
  largeUrl: string;
  onSmallUrlChange: (v: string) => void;
  onLargeUrlChange: (v: string) => void;
  onReset: () => void;
  onSave: () => void;
}) {
  return (
    <View>
      <SectionHeader title="Image setting:" onRemove={props.onReset} onAdd={props.onSave} />
      <View style={styles.settingsGapSmall} />
      <EditRow
        label="Small URL"
        value={props.smallUrl}
        onChangeText={props.onSmallUrlChange}
        hint="Enter small image URL"
      />
      <View style={styles.editGap} />
      <EditRow
        label="Large URL"
        value={props.largeUrl}
        onChangeText={props.onLargeUrlChange}
        hint="Enter large image URL"
      />
    </View>
  );
}

/** Editable notification action buttons (up to three). */
function ButtonsSetting(props: {
  buttons: string[];
  onButtonsChange: (buttons: string[]) => void;
  onReset: () => void;
  onAdd: () => void;
  onSaveButton: (index: number, value: string) => void;
  onRemoveButton: (index: number) => void;
}) {
  return (
    <View>
      <SectionHeader title="Buttons setting:" onRemove={props.onReset} onAdd={props.onAdd} />
      <View style={styles.settingsGapSmall} />
      {props.buttons.length > 0 ? (
        <View style={styles.buttonsRow}>
          {props.buttons.map((label, index) => (
            <View
              key={index}
              style={[
                styles.buttonItem,
                index > 0 ? { marginLeft: 8 } : null,
              ]}
            >
              <TextInput
                style={styles.buttonInput}
                value={label}
                onChangeText={(value) => {
                  const next = [...props.buttons];
                  if (index >= next.length) return;
                  next[index] = value;
                  props.onButtonsChange(next);
                }}
                onEndEditing={() => props.onSaveButton(index, props.buttons[index] ?? '')}
                placeholder="Button text"
                placeholderTextColor="#9E9E9E"
              />
              <TouchableOpacity onPress={() => props.onRemoveButton(index)}>
                <Text style={styles.buttonRemove}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  previewGap: {
    height: 35,
  },
  settingsGap: {
    height: 25,
  },
  settingsGapSmall: {
    height: 10,
  },
  settingsContainer: {
    flex: 1,
    paddingTop: 12,
  },
  sectionGap: {
    height: 16,
  },
  bottomGap: {
    height: 24,
  },
  editGap: {
    height: 7,
  },
  previewCard: {
    marginHorizontal: 15,
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  previewTop: {
    flexDirection: 'row',
    paddingLeft: 20,
    paddingTop: 15,
    paddingRight: 15,
  },
  previewIconBox: {
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  previewIcon: {
    width: 19,
    height: 19,
    borderRadius: 10,
  },
  previewContent: {
    flex: 1,
    marginLeft: 10,
  },
  previewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewAppName: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#9E9E9E',
  },
  previewTime: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9E9E9E',
    marginLeft: 5,
  },
  previewTitleRow: {
    marginTop: 3,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  previewTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  previewSmallImage: {
    width: 30,
    height: 30,
    borderRadius: 5,
    marginLeft: 10,
  },
  previewChevron: {
    fontSize: 14,
    color: '#9E9E9E',
    marginLeft: 8,
    marginTop: 10,
    transform: [{ rotate: '45deg' }],
  },
  previewBody: {
    marginTop: 3,
    fontSize: 12,
    color: '#000000',
  },
  previewLargeImage: {
    marginTop: 10,
    width: '100%',
    height: 150,
    borderRadius: 20,
  },
  previewButtonRow: {
    marginTop: 15,
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  previewBottomGap: {
    height: 15,
  },
  previewButtonWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewButtonDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(158,158,158,0.4)',
  },
  previewButtonText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    textAlign: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  actionCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRemove: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginRight: 10,
  },
  actionAdd: {
    backgroundColor: 'rgba(173,247,189,0.4)',
  },
  sectionAccent: {
    marginHorizontal: 15,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#D9D9D9',
    opacity: 0.8,
  },
  editRow: {
    paddingHorizontal: 15,
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
  buttonsRow: {
    flexDirection: 'row',
    paddingHorizontal: 15,
  },
  buttonItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  buttonInput: {
    flex: 1,
    fontSize: 14,
    color: '#000000',
    paddingVertical: 0,
  },
  buttonRemove: {
    fontSize: 14,
    color: '#000000',
    marginLeft: 4,
  },
  sendPill: {
    height: 30,
    marginHorizontal: 15,
    borderRadius: 5,
    backgroundColor: 'rgba(141,191,252,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: {
    fontSize: 12,
    color: '#9E9E9E',
  },
});
