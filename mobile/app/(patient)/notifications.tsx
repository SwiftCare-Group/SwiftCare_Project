import React, { useEffect, useState } from 'react';
import {
    View, Text, FlatList, TouchableOpacity,
    StyleSheet, ActivityIndicator, RefreshControl
} from 'react-native';
import { Colors } from '../../constants/colors';
import api from '../../services/api';

interface NotificationItem {
    id: number;
    title: string;
    body: string;
    isRead: boolean;
    sentAt: string;
    type: string;
}

const typeIcons: Record<string, string> = {
    SEVERITY_RESULT:       '🩺',
    EMERGENCY:             '🚨',
    QUEUE_ALERT:           '🔔',
    CONSULTATION_REMINDER: '📹',
    PRESCRIPTION_READY:    '💊',
};

export default function NotificationsScreen() {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');

    const load = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        try {
            const response = await api.get('/notifications/patient/me');
            setNotifications(response.data);
            setError('');
        } catch {
            setError('Could not load notifications. Pull down to retry.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { load(); }, []);

    const markRead = async (item: NotificationItem) => {
        if (!item.isRead) {
            try {
                await api.put(`/notifications/${item.id}/read`);
                setNotifications(prev =>
                    prev.map(n => n.id === item.id ? { ...n, isRead: true } : n)
                );
            } catch {}
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short',
            hour: '2-digit', minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.heading}>Notifications</Text>

            {error ? (
                <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            ) : null}

            <FlatList
                data={notifications}
                keyExtractor={item => item.id.toString()}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => load(true)}
                        tintColor={Colors.primary}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Text style={styles.emptyText}>No notifications yet.</Text>
                        <Text style={styles.emptySubText}>
                            They will appear here when there is activity on your account.
                        </Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[styles.card, !item.isRead && styles.cardUnread]}
                        onPress={() => markRead(item)}
                    >
                        <View style={styles.cardRow}>
                            <Text style={styles.icon}>{typeIcons[item.type] ?? '🔔'}</Text>
                            <View style={styles.cardContent}>
                                <View style={styles.cardHeader}>
                                    <Text style={[styles.cardTitle, !item.isRead && styles.cardTitleUnread]}>
                                        {item.title}
                                    </Text>
                                    {!item.isRead && <View style={styles.unreadDot} />}
                                </View>
                                <Text style={styles.cardBody}>{item.body}</Text>
                                <Text style={styles.cardDate}>{formatDate(item.sentAt)}</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                )}
                contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container:       { flex: 1, backgroundColor: Colors.background },
    centered:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
    heading:         { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, padding: 20, paddingBottom: 8 },
    errorBox:        { backgroundColor: Colors.dangerLight, margin: 16, padding: 12, borderRadius: 10 },
    errorText:       { color: Colors.danger, fontSize: 14 },
    card:            { backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.border },
    cardUnread:      { borderColor: Colors.primaryMuted, backgroundColor: Colors.primaryLight },
    cardRow:         { flexDirection: 'row', alignItems: 'flex-start' },
    icon:            { fontSize: 22, marginRight: 12, marginTop: 2 },
    cardContent:     { flex: 1 },
    cardHeader:      { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    cardTitle:       { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, flex: 1 },
    cardTitleUnread: { color: Colors.textPrimary, fontWeight: '700' },
    unreadDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },
    cardBody:        { fontSize: 14, color: Colors.textPrimary, lineHeight: 20, marginBottom: 6 },
    cardDate:        { fontSize: 12, color: Colors.textDisabled },
    empty:           { alignItems: 'center', paddingTop: 60 },
    emptyText:       { fontSize: 16, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
    emptySubText:    { fontSize: 14, color: Colors.textDisabled, textAlign: 'center', paddingHorizontal: 40 },
});