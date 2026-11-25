import { StyleSheet, View } from 'react-native';

export function CheckGlyph() {
  return (
    <View style={styles.box}>
      <View style={[styles.arm, styles.shortArm]} />
      <View style={[styles.arm, styles.longArm]} />
    </View>
  );
}

export function MinusGlyph() {
  return (
    <View style={styles.box}>
      <View style={styles.minus} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arm: {
    position: 'absolute',
    height: 1,
    borderRadius: 0.5,
    backgroundColor: '#000000',
  },
  shortArm: {
    width: 5.7,
    left: 2.7,
    top: 10.5,
    transform: [{ rotate: '45deg' }],
  },
  longArm: {
    width: 9.9,
    left: 6.1,
    top: 8.5,
    transform: [{ rotate: '-45deg' }],
  },
  minus: {
    width: 6.6,
    height: 1,
    borderRadius: 0.5,
    backgroundColor: '#000000',
  },
});
