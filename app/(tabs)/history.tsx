import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  DayStepData,
  getLastNDays,
  getHistoricalData,
  formatDate,
  getDayOfWeek,
} from '@/utils/stepData';

const CHART_HEIGHT = 200;
const BAR_WIDTH = 32;

const COLORS = {
  background: '#F0F0F0',
  cardBackground: '#FFFFFF',
  primaryBlue: '#3B82F6',
  successGreen: '#10B981',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  shadow: 'rgba(0, 0, 0, 0.1)',
  border: '#E5E7EB',
};

const WeeklyChart = ({ data }: { data: DayStepData[] }) => {
  const maxSteps = Math.max(...data.map(d => d.steps), 10000);

  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>Last 7 Days</Text>
      <View style={styles.chartContainer}>
        {data.map((day, index) => {
          const barHeight = (day.steps / maxSteps) * CHART_HEIGHT;
          const barColor = day.goalReached ? COLORS.successGreen : COLORS.primaryBlue;

          return (
            <View key={day.date} style={styles.barContainer}>
              <View style={styles.barWrapper}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: Math.max(barHeight, 2),
                      backgroundColor: barColor,
                    },
                  ]}
                />
              </View>
              <Text style={styles.barLabel}>{getDayOfWeek(day.date)}</Text>
              <Text style={styles.barSteps}>
                {day.steps >= 1000
                  ? `${(day.steps / 1000).toFixed(1)}k`
                  : day.steps}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const HistoryCard = ({ data, onPress }: { data: DayStepData; onPress: () => void }) => {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.historyCard,
        pressed && styles.historyCardPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.historyCardHeader}>
        <View>
          <Text style={styles.historyDate}>{formatDate(data.date)}</Text>
          <Text style={styles.historySteps}>
            {data.steps.toLocaleString()} steps
          </Text>
        </View>
        {data.goalReached && (
          <View style={styles.goalBadge}>
            <Ionicons name="checkmark-circle" size={32} color={COLORS.successGreen} />
          </View>
        )}
      </View>
      <View style={styles.historyStats}>
        <View style={styles.historyStat}>
          <Ionicons name="walk-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.historyStatText}>{data.distance} mi</Text>
        </View>
        <View style={styles.historyStat}>
          <Ionicons name="flame-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.historyStatText}>{data.calories} kcal</Text>
        </View>
        <View style={styles.historyStat}>
          <Ionicons name="flag-outline" size={16} color={COLORS.textSecondary} />
          <Text style={styles.historyStatText}>
            {Math.round((data.steps / data.goal) * 100)}% of goal
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

export default function History() {
  const [weeklyData, setWeeklyData] = useState<DayStepData[]>([]);
  const [historicalData, setHistoricalData] = useState<DayStepData[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const weekly = await getLastNDays(7);
      const historical = await getHistoricalData(30);

      setWeeklyData(weekly);
      setHistoricalData(historical);
    } catch (error) {
      console.error('Error loading history data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCardPress = (data: DayStepData) => {
    // Could navigate to a detail view or show a modal with more info
    console.log('Card pressed:', data);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primaryBlue}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>History</Text>
          <Text style={styles.headerSubtitle}>Track your progress over time</Text>
        </View>

        {/* Weekly Chart */}
        <WeeklyChart data={weeklyData} />

        {/* Historical Log */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Activity Log</Text>
          {historicalData.length > 0 ? (
            historicalData.map((data) => (
              <HistoryCard
                key={data.date}
                data={data}
                onPress={() => handleCardPress(data)}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyStateText}>No activity data yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Start walking to see your history here
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  chartCard: {
    backgroundColor: COLORS.cardBackground,
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 20,
    padding: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 20,
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: CHART_HEIGHT + 60,
  },
  barContainer: {
    alignItems: 'center',
    width: BAR_WIDTH,
  },
  barWrapper: {
    height: CHART_HEIGHT,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 8,
  },
  bar: {
    width: BAR_WIDTH,
    borderRadius: 8,
    minHeight: 2,
  },
  barLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  barSteps: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  historySection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  historyCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  historyCardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyDate: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  historySteps: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  goalBadge: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyStats: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  historyStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyStatText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
});
