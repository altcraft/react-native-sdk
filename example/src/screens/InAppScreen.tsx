import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
View,
} from 'react-native';
import { AltcraftInApp } from '@altcraft/inapp';
import { ScreenHeader } from '../components/ScreenHeader';
import { AppState } from '../services/app_state';

const K_LINE = '#E0E0E0';

/**
 * In-App demonstration screen.
 *
 * Replicates the Android Jetpack Compose InAppScreen layout:
 * - Altcraft header
 * - Three equally sized rows
 * - Two centered cells per row
 * - Vertical and horizontal dividers
 * - Placement counter badge
 * - In-App trigger buttons
 */
export function InAppScreen(): React.JSX.Element {
  const [placementCount, setPlacementCount] = React.useState(0);

  useEffect(() => {
    const unsubscribe = AppState.instance.subscribe(() => {
      setPlacementCount(AppState.instance.placementCount);
    });
    setPlacementCount(AppState.instance.placementCount);
    return unsubscribe;
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader />
      <View style={styles.grid}>
        <View style={styles.row}>
          <View style={styles.cell}>
            <PlacementCell
              count={placementCount}
              testID="inapp_placements_button"
            />
          </View>
          <View style={styles.verticalDivider} />
          <View style={styles.cell}>
            <TriggerCell
              title="Modal"
              icon={require('../../assets/ic_in_app_center.png')}
              trigger="tr_modal"
              testID="inapp_modal_button"
            />
          </View>
        </View>

        <HorizontalDivider />

        <View style={styles.row}>
          <View style={styles.cell}>
            <TriggerCell
              title="Fullscreen"
              icon={require('../../assets/ic_in_app_fullscreen.png')}
              trigger="tr_fullscreen"
              testID="inapp_fullscreen_button"
            />
          </View>
          <View style={styles.verticalDivider} />
          <View style={styles.cell}>
            <TriggerCell
              title="Floating Bar"
              icon={require('../../assets/ic_in_app_down.png')}
              trigger="tr_floating_bar"
              testID="inapp_floating_bar_button"
            />
          </View>
        </View>

        <HorizontalDivider />

        <View style={styles.row}>
          <View style={styles.cell}>
            <TriggerCell
              title="SlideUp"
              icon={require('../../assets/ic_in_app_top.png')}
              trigger="tr_slide_up"
              testID="inapp_slide_up_button"
            />
          </View>
          <View style={styles.verticalDivider} />
          <View style={styles.cell}>
            <TriggerCell
              title="Custom"
              icon={require('../../assets/ic_in_app_custom.png')}
              trigger="tr_custom"
              testID="inapp_custom_button"
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

/** Interrupted horizontal divider: two lines with an empty 60dp center gap. */
function HorizontalDivider() {
  return (
    <View style={styles.horizontalDivider}>
      <View style={styles.horizontalLine} />
      <View style={styles.horizontalLine} />
    </View>
  );
}

/** Placements cell: load placements button with a count badge. */
function PlacementCell(props: { count: number; testID: string }) {
  const { count, testID } = props;
  return (
    <CellContent
      title="Placements"
      description="Load placements"
      image={(iconSize) => (
        <TouchableOpacity
          style={{ width: iconSize, height: iconSize }}
          activeOpacity={1}
          testID={testID}
          accessibilityRole="button"
          accessibilityLabel="Placements"
          onPress={() => {
            void AltcraftInApp.getPlacements();
          }}
        >
          <View style={styles.iconBox}>
            <Image
              source={require('../../assets/ic_in_app_download.png')}
              style={styles.iconPadded}
              resizeMode="contain"
            />
            {count > 0 ? (
              <View style={styles.badgePosition}>
                <CountBadge count={count} />
              </View>
            ) : null}
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

/** Trigger cell: fires the given In-App trigger when tapped. */
function TriggerCell(props: {
  title: string;
  icon: number;
  trigger: string;
  testID: string;
}) {
  const { title, icon, trigger, testID } = props;
  return (
    <CellContent
      title={title}
      description={trigger}
      image={(iconSize) => (
        <TouchableOpacity
          style={{ width: iconSize, height: iconSize }}
          activeOpacity={1}
          testID={testID}
          accessibilityRole="button"
          accessibilityLabel={title}
          onPress={() => {
            void AltcraftInApp.trigger(trigger);
          }}
        >
          <View style={styles.iconBox}>
            <Image source={icon} style={styles.iconPadded} resizeMode="contain" />
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

/** Common visual structure for all grid cells. */
function CellContent(props: {
  title: string;
  description: string;
  image: (iconSize: number) => React.ReactNode;
}) {
  const { title, description, image } = props;
  const [iconSize, setIconSize] = useState(120);
  return (
    <View
      style={styles.cellContent}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        const h = e.nativeEvent.layout.height;
        setIconSize(
          Math.max(0, Math.min(120, Math.min(w - 16, h - 72)))
        );
      }}
    >
      <Text style={styles.cellTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.spacing} />
      {image(iconSize)}
      <View style={styles.spacing} />
      <Text style={styles.cellDescription} numberOfLines={1}>
        {description}
      </Text>
    </View>
  );
}

/** Placement count badge: 20dp white circle with 18dp black inner circle. */
function CountBadge(props: { count: number }) {
  return (
    <View style={styles.badgeOuter}>
      <View style={styles.badgeInner}>
        <Text style={styles.badgeText}>{props.count}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  grid: {
    flex: 1,
    padding: 15,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
  },
  verticalDivider: {
    width: 2,
    backgroundColor: K_LINE,
    marginVertical: 15,
  },
  horizontalDivider: {
    height: 2,
    marginHorizontal: 15,
    flexDirection: 'row',
    gap: 60,
  },
  horizontalLine: {
    flex: 1,
    height: 2,
    backgroundColor: K_LINE,
  },
  cellContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
    textAlign: 'center',
  },
  cellDescription: {
    fontSize: 10,
    color: '#475569',
    textAlign: 'center',
  },
  spacing: {
    height: 12,
  },
  iconBox: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: 8,
    bottom: 8,
  },
  iconPadded: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  badgePosition: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  badgeOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
