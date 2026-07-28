import { Image, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { Colors } from '../../constants/colors';

type SwiftCareLogoProps = {
  size?: number;
  showName?: boolean;
  nameColor?: string;
  compact?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

export default function SwiftCareLogo({
  size = 72,
  showName = false,
  nameColor = Colors.white,
  compact = false,
  style,
  accessibilityLabel = 'SwiftCare logo',
}: SwiftCareLogoProps) {
  const radius = compact ? Math.round(size * 0.24) : Math.round(size * 0.28);

  return (
    <View style={[styles.wrapper, compact && styles.compactWrapper, style]}>
      <View
        style={[
          styles.imageShell,
          {
            width: size,
            height: size,
            borderRadius: radius,
          },
        ]}
      >
        <Image
          source={require('../../assets/icon.png')}
          style={styles.image}
          resizeMode="contain"
          accessible
          accessibilityRole="image"
          accessibilityLabel={accessibilityLabel}
        />
      </View>

      {showName ? (
        <Text style={[styles.name, compact && styles.compactName, { color: nameColor }]}>SwiftCare</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactWrapper: {
    flexDirection: 'row',
  },
  imageShell: {
    overflow: 'hidden',
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.black,
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  name: {
    marginTop: 10,
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  compactName: {
    marginTop: 0,
    marginLeft: 10,
    fontSize: 19,
    lineHeight: 23,
  },
});
