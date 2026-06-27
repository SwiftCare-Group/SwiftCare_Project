import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/colors';

export default function VideoCallScreen({ onBack }: { onBack: () => void }) {
  const [callStatus, setCallStatus] = useState<'connecting' | 'connected' | 'ended'>('connecting');
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  useEffect(() => {
    // Simulate connecting then connected after 2 seconds
    const connectTimer = setTimeout(() => {
      setCallStatus('connected');
    }, 2000);
    return () => clearTimeout(connectTimer);
  }, []);

  useEffect(() => {
    // Start timer when connected
    if (callStatus !== 'connected') return;
    const timer = setInterval(() => {
      setDuration(d => d + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [callStatus]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleEndCall = () => {
    setCallStatus('ended');
    setTimeout(() => onBack(), 1500);
  };

  if (callStatus === 'ended') {
    return (
      <View style={styles.endedContainer}>
        <Text style={styles.endedIcon}>📞</Text>
        <Text style={styles.endedText}>Call Ended</Text>
        <Text style={styles.endedDuration}>Duration: {formatTime(duration)}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* Doctor video area */}
      <View style={styles.doctorVideo}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarText}>M</Text>
        </View>
        <Text style={styles.doctorName}>Dr. Mensah</Text>
        <Text style={styles.callStatusText}>
          {callStatus === 'connecting' ? '⏳ Connecting...' : `🟢 ${formatTime(duration)}`}
        </Text>
      </View>

      {/* Patient self-view */}
      <View style={styles.selfView}>
        {cameraOff ? (
          <View style={styles.selfViewOff}>
            <Text style={styles.selfViewOffText}>📷</Text>
          </View>
        ) : (
          <View style={styles.selfViewOn}>
            <Text style={styles.selfViewOnText}>You</Text>
          </View>
        )}
      </View>

      {/* Call controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlBtn, muted && styles.controlBtnActive]}
          onPress={() => setMuted(!muted)}
        >
          <Text style={styles.controlIcon}>{muted ? '🔇' : '🎤'}</Text>
          <Text style={styles.controlLabel}>{muted ? 'Unmute' : 'Mute'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.endCallBtn} onPress={handleEndCall}>
          <Text style={styles.endCallIcon}>📵</Text>
          <Text style={styles.endCallLabel}>End</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, cameraOff && styles.controlBtnActive]}
          onPress={() => setCameraOff(!cameraOff)}
        >
          <Text style={styles.controlIcon}>{cameraOff ? '📷' : '🎥'}</Text>
          <Text style={styles.controlLabel}>{cameraOff ? 'Start Cam' : 'Stop Cam'}</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1A16' },
  doctorVideo: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatarLarge: { width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  avatarText: { fontSize: 40, fontWeight: '700', color: Colors.primary },
  doctorName: { fontSize: 22, fontWeight: '700', color: Colors.white, marginBottom: 8 },
  callStatusText: { fontSize: 14, color: Colors.primaryMuted },
  selfView: { position: 'absolute', top: 60, right: 16, width: 90, height: 120, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: Colors.primary },
  selfViewOn: { flex: 1, backgroundColor: Colors.dark.surface, justifyContent: 'center', alignItems: 'center' },
  selfViewOnText: { color: Colors.white, fontSize: 12 },
  selfViewOff: { flex: 1, backgroundColor: Colors.dark.surfaceSecondary, justifyContent: 'center', alignItems: 'center' },
  selfViewOffText: { fontSize: 24 },
  controls: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24, backgroundColor: Colors.dark.surface },
  controlBtn: { alignItems: 'center', padding: 12, borderRadius: 50, width: 70 },
  controlBtnActive: { backgroundColor: Colors.dark.surfaceSecondary },
  controlIcon: { fontSize: 24, marginBottom: 4 },
  controlLabel: { fontSize: 11, color: Colors.white },
  endCallBtn: { alignItems: 'center', backgroundColor: Colors.danger, padding: 16, borderRadius: 50, width: 70 },
  endCallIcon: { fontSize: 24, marginBottom: 4 },
  endCallLabel: { fontSize: 11, color: Colors.white },
  endedContainer: { flex: 1, backgroundColor: '#0F1A16', justifyContent: 'center', alignItems: 'center' },
  endedIcon: { fontSize: 48, marginBottom: 16 },
  endedText: { fontSize: 24, fontWeight: '700', color: Colors.white, marginBottom: 8 },
  endedDuration: { fontSize: 14, color: Colors.primaryMuted },
});