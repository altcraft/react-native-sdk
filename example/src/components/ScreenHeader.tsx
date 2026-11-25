import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

const HEADER_SHADOW = {
  shadowColor: '#000000',
  shadowOpacity: 0.1,
  shadowRadius: 3,
  shadowOffset: { width: 0, height: 1 },
  elevation: 3,
};

/** Altcraft application header shared by all screens. */
export function ScreenHeader(): React.JSX.Element {
  return (
    <View style={[styles.header, HEADER_SHADOW]}>
      <Image
        source={require('../../assets/ic_altcraft.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 60,
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 16,
  },
  logo: {
    width: 80,
    height: 20,
  },
});
