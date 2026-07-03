import { useCallback, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  Image,
} from 'react-native';
import { doTakePush, doIsAltcraftPush } from './SDKTests';

export default function ExampleScreen() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [buttons, setButtons] = useState('');
  const [acPushKey, setAcPushKey] = useState('_ac_push');
  const [acPushValue, setAcPushValue] = useState('1');
  const [result, setResult] = useState('');

  const sendPush = useCallback(() => {
    const msg: Record<string, string> = {};
    if (acPushKey.trim()) msg[acPushKey.trim()] = acPushValue.trim();
    if (title.trim()) msg.title = title.trim();
    if (body.trim()) msg.body = body.trim();
    if (imageUrl.trim()) msg.image_url = imageUrl.trim();
    if (buttons.trim()) msg.buttons = buttons.trim();

    doTakePush(msg);
    setResult(`Sent: ${JSON.stringify(msg)}`);
  }, [title, body, imageUrl, buttons, acPushKey, acPushValue]);

  const checkPush = useCallback(() => {
    const msg: Record<string, string> = {};
    if (acPushKey.trim()) msg[acPushKey.trim()] = acPushValue.trim();
    const isAlt = doIsAltcraftPush(msg);
    setResult(`isAltcraftPush: ${isAlt}`);
  }, [acPushKey, acPushValue]);

  const btnList = buttons.trim()
    ? buttons
        .split(',')
        .map((b) => b.trim())
        .filter(Boolean)
    : [];

  return (
    <ScrollView style={styles.container}>
      {/* Preview Card */}
      <View style={styles.preview}>
        <Text style={styles.previewTitle}>{title || 'Notification Title'}</Text>
        <Text style={styles.previewBody}>
          {body || 'Notification body text will appear here…'}
        </Text>
        {imageUrl.trim() ? (
          <Image
            source={{ uri: imageUrl.trim() }}
            style={styles.previewImage}
            resizeMode="cover"
          />
        ) : null}
        {btnList.length > 0 ? (
          <View style={styles.previewBtnRow}>
            {btnList.map((b, i) => (
              <View key={i} style={styles.previewBtn}>
                <Text style={styles.previewBtnText}>{b}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Push Settings</Text>
        <TextInput
          placeholder="Title"
          style={styles.input}
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          placeholder="Body"
          style={[styles.input, { marginTop: 4 }]}
          value={body}
          onChangeText={setBody}
          multiline
        />
        <TextInput
          placeholder="Image URL"
          style={[styles.input, { marginTop: 4 }]}
          value={imageUrl}
          onChangeText={setImageUrl}
        />
        <TextInput
          placeholder="Buttons (comma-separated)"
          style={[styles.input, { marginTop: 4 }]}
          value={buttons}
          onChangeText={setButtons}
        />
      </View>

      {/* Altcraft Key */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Altcraft Push Key</Text>
        <View style={styles.keyRow}>
          <TextInput
            placeholder="Key"
            style={[styles.input, { flex: 1 }]}
            value={acPushKey}
            onChangeText={setAcPushKey}
          />
          <TextInput
            placeholder="Value"
            style={[styles.input, { flex: 1, marginLeft: 4 }]}
            value={acPushValue}
            onChangeText={setAcPushValue}
          />
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionRow}>
        <Pressable
          style={[styles.actionBtn, styles.btnBlue]}
          onPress={sendPush}
        >
          <Text style={styles.actionBtnText}>Send Push</Text>
        </Pressable>
        <Pressable
          style={[styles.actionBtn, styles.btnGreen]}
          onPress={checkPush}
        >
          <Text style={styles.actionBtnText}>Check</Text>
        </Pressable>
      </View>

      {result ? <Text style={styles.result}>{result}</Text> : null}
    </ScrollView>
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
  preview: {
    ...cardShadow,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  previewTitle: {
    fontWeight: '800',
    fontSize: 16,
    marginBottom: 4,
    color: '#000',
  },
  previewBody: { fontSize: 13, color: '#666', marginBottom: 8 },
  previewImage: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    marginBottom: 8,
  },
  previewBtnRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  previewBtn: {
    ...cardShadow,
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  previewBtnText: { fontWeight: '700', fontSize: 12, color: '#000' },
  section: {
    ...cardShadow,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontWeight: '800',
    fontSize: 14,
    marginBottom: 6,
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
  keyRow: { flexDirection: 'row' },
  actionRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  actionBtn: {
    ...cardShadow,
    flex: 1,
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
  },
  btnBlue: { backgroundColor: '#fff' },
  btnGreen: { backgroundColor: '#fff' },
  actionBtnText: { fontWeight: '700', fontSize: 13, color: '#000' },
  result: { fontFamily: 'Menlo', fontSize: 11, color: '#666' },
});
