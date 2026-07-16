import { View, StyleSheet, Animated, useWindowDimensions } from 'react-native';
import { useEffect, useRef } from 'react';
import { Colors } from '../constants/colors';

interface SkeletonCardProps {
  height?: number;
  width?: string | number;
  borderRadius?: number;
  style?: object;
}

export function SkeletonBox({ height = 20, width = '100%', borderRadius = 8, style }: SkeletonCardProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        {
          height,
          width,
          borderRadius,
          backgroundColor: Colors.primaryMuted,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function HomeScreenSkeleton() {
  return (
    <View style={styles.container}>
      {/* Header skeleton */}
      <View style={[styles.header, { backgroundColor: Colors.headerGradientStart }]}>
        <View style={styles.headerTop}>
          <View>
            <SkeletonBox height={22} width={160} borderRadius={6} />
            <SkeletonBox height={14} width={120} borderRadius={6} style={{ marginTop: 8 }} />
          </View>
          <View style={styles.headerIcons}>
            <SkeletonBox height={36} width={36} borderRadius={18} />
            <SkeletonBox height={36} width={36} borderRadius={18} />
          </View>
        </View>
        <SkeletonBox height={72} width="100%" borderRadius={14} style={{ marginTop: 20 }} />
      </View>

      <View style={styles.body}>
        {/* Search bar */}
        <SkeletonBox height={48} width="100%" borderRadius={12} style={{ marginBottom: 16 }} />

        {/* Quick actions */}
        <View style={styles.quickActions}>
          {[1, 2, 3].map(i => (
            <View key={i} style={styles.quickAction}>
              <SkeletonBox height={60} width={60} borderRadius={16} />
              <SkeletonBox height={12} width={50} borderRadius={4} style={{ marginTop: 8 }} />
            </View>
          ))}
        </View>

        {/* Section title */}
        <SkeletonBox height={18} width={140} borderRadius={6} style={{ marginBottom: 14 }} />

        {/* Clinic grid */}
        <View style={styles.clinicsGrid}>
          {[1, 2, 3, 4].map(i => (
            <View key={i} style={styles.clinicCard}>
              <SkeletonBox height={56} width={56} borderRadius={16} />
              <SkeletonBox height={12} width={48} borderRadius={4} style={{ marginTop: 6 }} />
            </View>
          ))}
        </View>

        {/* Upgrade card */}
        <SkeletonBox height={80} width="100%" borderRadius={16} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

export function AppointmentListSkeleton() {
  return (
    <View style={styles.listContainer}>
      {[1, 2, 3].map(i => (
        <View key={i} style={styles.card}>
          <View style={styles.cardHeader}>
            <SkeletonBox height={40} width={40} borderRadius={10} />
            <View style={{ flex: 1, gap: 8 }}>
              <SkeletonBox height={16} width="60%" borderRadius={6} />
              <SkeletonBox height={12} width="40%" borderRadius={4} />
            </View>
            <SkeletonBox height={24} width={60} borderRadius={20} />
          </View>
          <SkeletonBox height={1} width="100%" borderRadius={0} style={{ marginVertical: 12 }} />
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <SkeletonBox height={12} width={80} borderRadius={4} />
            <SkeletonBox height={12} width={80} borderRadius={4} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function QueueSkeleton() {
  return (
    <View style={styles.listContainer}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <SkeletonBox height={40} width={40} borderRadius={10} />
          <View style={{ flex: 1, gap: 8 }}>
            <SkeletonBox height={16} width="50%" borderRadius={6} />
            <SkeletonBox height={12} width="35%" borderRadius={4} />
          </View>
        </View>
        <SkeletonBox height={72} width={72} borderRadius={36} style={{ alignSelf: 'center', marginVertical: 20 }} />
        <SkeletonBox height={48} width="100%" borderRadius={12} style={{ marginBottom: 14 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <SkeletonBox height={40} width="30%" borderRadius={8} />
          <SkeletonBox height={40} width="30%" borderRadius={8} />
          <SkeletonBox height={40} width="30%" borderRadius={8} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerIcons: { flexDirection: 'row', gap: 8 },
  body: { paddingHorizontal: 20, paddingTop: 20 },
  quickActions: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 28 },
  quickAction: { alignItems: 'center', gap: 8 },
  clinicsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  clinicCard: { alignItems: 'center', width: 72 },
  listContainer: { padding: 20, gap: 12 },
  card: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
});