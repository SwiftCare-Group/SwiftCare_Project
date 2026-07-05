import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, ActivityIndicator, ScrollView,
    KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { Colors } from '../../constants/colors';
import api from '../../services/api';

type SeverityLabel = 'MILD' | 'MODERATE' | 'SEVERE' | 'CRITICAL';

interface SymptomResult {
    id: string;
    patientId: string;
    symptoms: string;
    severityScore: number;
    label: SeverityLabel;
    isEmergency: boolean;
    firstAidContent: string;
}

const badgeColors = {
    MILD:     { text: Colors.severityMild,     bg: Colors.severityMildBg },
    MODERATE: { text: Colors.severityModerate, bg: Colors.severityModerateBg },
    SEVERE:   { text: Colors.severitySevere,   bg: Colors.severitySevereBg },
    CRITICAL: { text: Colors.severityCritical, bg: Colors.severityCriticalBg },
};

export default function SymptomsScreen() {
    const [symptoms, setSymptoms] = useState('');
    const [duration, setDuration] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<SymptomResult | null>(null);

    const handleSubmit = async () => {
        if (!symptoms.trim()) {
            setError('Please describe your symptoms before submitting.');
            return;
        }
        setLoading(true);
        setError('');
        const fullSymptoms = duration.trim()
            ? `${symptoms.trim()} (Duration: ${duration.trim()})`
            : symptoms.trim();
        try {
            const response = await api.post('/symptoms/submit', {
                symptoms: fullSymptoms,
            });
            setResult(response.data);
        } catch (e: any) {
            setError('Could not submit symptoms. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setResult(null);
        setSymptoms('');
        setDuration('');
        setError('');
    };

    if (result) {
        const badge = badgeColors[result.label] ?? badgeColors.MILD;
        const isSevere = result.label === 'SEVERE' || result.label === 'CRITICAL';

        return (
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                {isSevere && (
                    <View style={[styles.banner, {
                        backgroundColor: result.label === 'CRITICAL'
                            ? Colors.severityCriticalBg : Colors.dangerLight
                    }]}>
                        <Text style={[styles.bannerText, {
                            color: result.label === 'CRITICAL' ? Colors.white : Colors.danger
                        }]}>
                            {result.label === 'CRITICAL'
                                ? 'Critical condition — seek emergency care immediately.'
                                : 'Severe symptoms — please seek medical attention soon.'}
                        </Text>
                    </View>
                )}

                <Text style={styles.heading}>Your Assessment</Text>

                <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.badgeText, { color: badge.text }]}>
                        {result.label}
                    </Text>
                </View>

                <View style={styles.scoreRow}>
                    <Text style={styles.scoreLabel}>Severity Score</Text>
                    <Text style={styles.scoreValue}>{result.severityScore} / 100</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>First Aid Advice</Text>
                    <Text style={styles.cardBody}>{result.firstAidContent}</Text>
                </View>

                <View style={styles.infoBox}>
                    <Text style={styles.infoText}>
                        This is AI-generated and not a medical diagnosis. Always consult a doctor.
                    </Text>
                </View>

                <TouchableOpacity style={styles.button} onPress={handleReset}>
                    <Text style={styles.buttonText}>Submit New Symptoms</Text>
                </TouchableOpacity>
            </ScrollView>
        );
    }

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView style={styles.container} contentContainerStyle={styles.content}
                        keyboardShouldPersistTaps="handled">

                <Text style={styles.heading}>How are you feeling?</Text>
                <Text style={styles.subtitle}>
                    Describe your symptoms and our AI will assess your condition.
                </Text>

                <Text style={styles.label}>What symptoms do you have?</Text>
                <TextInput
                    style={styles.textArea}
                    multiline
                    numberOfLines={5}
                    placeholder="e.g. I have chest tightness, shortness of breath..."
                    placeholderTextColor={Colors.textSecondary}
                    value={symptoms}
                    onChangeText={(t) => { setSymptoms(t); setError(''); }}
                    textAlignVertical="top"
                />

                <Text style={styles.label}>How long have you had these symptoms?</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g. 2 hours, since yesterday"
                    placeholderTextColor={Colors.textSecondary}
                    value={duration}
                    onChangeText={setDuration}
                />

                {error ? (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : null}

                <TouchableOpacity
                    style={[styles.button, (!symptoms.trim() || loading) && styles.buttonDisabled]}
                    onPress={handleSubmit}
                    disabled={loading || !symptoms.trim()}
                >
                    {loading ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <ActivityIndicator color={Colors.white} size="small" />
                            <Text style={[styles.buttonText, { marginLeft: 10 }]}>Analysing...</Text>
                        </View>
                    ) : (
                        <Text style={styles.buttonText}>Analyse My Symptoms</Text>
                    )}
                </TouchableOpacity>

                <Text style={styles.disclaimer}>
                    In a life-threatening emergency, call emergency services immediately.
                </Text>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container:   { flex: 1, backgroundColor: Colors.background },
    content:     { padding: 24, paddingBottom: 48 },
    heading:     { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8 },
    subtitle:    { fontSize: 15, color: Colors.textSecondary, lineHeight: 22, marginBottom: 24 },
    label:       { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginBottom: 8 },
    textArea:    {
        borderWidth: 1, borderColor: Colors.border, borderRadius: 12,
        padding: 14, minHeight: 140, backgroundColor: Colors.surface,
        color: Colors.textPrimary, fontSize: 15, lineHeight: 22, marginBottom: 20,
    },
    input:       {
        borderWidth: 1, borderColor: Colors.border, borderRadius: 12,
        padding: 14, backgroundColor: Colors.surface,
        color: Colors.textPrimary, fontSize: 15, marginBottom: 20,
    },
    errorBox:    { backgroundColor: Colors.dangerLight, borderRadius: 10, padding: 12, marginBottom: 16 },
    errorText:   { color: Colors.danger, fontSize: 14 },
    button:      { backgroundColor: Colors.primary, padding: 16, borderRadius: 14, alignItems: 'center', marginBottom: 20 },
    buttonDisabled: { backgroundColor: Colors.primaryMuted },
    buttonText:  { color: Colors.white, fontWeight: '700', fontSize: 16 },
    disclaimer:  { fontSize: 12, color: Colors.textDisabled, textAlign: 'center', lineHeight: 18 },
    banner:      { padding: 14, borderRadius: 12, marginBottom: 24 },
    bannerText:  { fontWeight: '700', fontSize: 14, lineHeight: 20, textAlign: 'center' },
    badge:       { alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginBottom: 12 },
    badgeText:   { fontWeight: '700', fontSize: 16 },
    scoreRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    scoreLabel:  { fontSize: 14, color: Colors.textSecondary, fontWeight: '600' },
    scoreValue:  { fontSize: 14, color: Colors.textPrimary, fontWeight: '700' },
    card:        { backgroundColor: Colors.surface, padding: 18, borderRadius: 14, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
    cardTitle:   { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10 },
    cardBody:    { fontSize: 15, color: Colors.textPrimary, lineHeight: 24 },
    infoBox:     { backgroundColor: Colors.infoLight, padding: 14, borderRadius: 12, marginBottom: 24 },
    infoText:    { fontSize: 13, color: Colors.info, lineHeight: 20 },
});