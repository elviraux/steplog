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
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
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
  gradientTop: '#2D1B69', // Deep Twilight Purple
  gradientMiddle: '#E91E8C', // Vibrant Magenta
  gradientBottom: '#FF6B35', // Warm Fiery Orange
  electricPink: '#FF10F0', // Electric Pink accent
  goldenYellow: '#FFD700', // Golden Yellow success
  glassWhite: 'rgba(255, 255, 255, 0.15)', // Frosted glass panel
  glassBorder: 'rgba(255, 255, 255, 0.2)', // Glass border
  textWhite: '#FFFFFF',
  textWhiteShadow: 'rgba(0, 0, 0, 0.3)',
  glowPink: 'rgba(255, 16, 240, 0.4)',
  glowYellow: 'rgba(255, 215, 0, 0.4)',
};

const WeeklyChart = ({ data }: { data: DayStepData[] }) => {
  const maxSteps = Math.max(...data.map(d => d.steps), 10000);

  return (
    <BlurView intensity={30} tint="light" style={styles.chartCard}>
      <Text style={styles.chartTitle}>Last 7 Days</Text>
      <View style={styles.chartContainer}>
        {data.map((day, index) => {
          const barHeight = (day.steps / maxSteps) * CHART_HEIGHT;
          const barColor = day.goalReached ? COLORS.goldenYellow : COLORS.electricPink;

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
    </BlurView>
  );
};

const HistoryCard = ({ data, onPress }: { data: DayStepData; onPress: () => void }) => {
  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <BlurView
          intensity={30}
          tint="light"
          style={[
            styles.historyCard,
            pressed && styles.historyCardPressed,
          ]}
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
                <Ionicons name="checkmark-circle" size={32} color={COLORS.goldenYellow} />
              </View>
            )}
          </View>
          <View style={styles.historyStats}>
            <View style={styles.historyStat}>
              <Ionicons name="walk-outline" size={16} color={COLORS.textWhite} />
              <Text style={styles.historyStatText}>{data.distance} mi</Text>
            </View>
            <View style={styles.historyStat}>
              <Ionicons name="flame-outline" size={16} color={COLORS.textWhite} />
              <Text style={styles.historyStatText}>{data.calories} kcal</Text>
            </View>
            <View style={styles.historyStat}>
              <Ionicons name="flag-outline" size={16} color={COLORS.textWhite} />
              <Text style={styles.historyStatText}>
                {Math.round((data.steps / data.goal) * 100)}% of goal
              </Text>
            </View>
          </View>
        </BlurView>
      )}
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
      <StatusBar style="light" />

      {/* Gradient Background */}
      <LinearGradient
        colors={[COLORS.gradientTop, COLORS.gradientMiddle, COLORS.gradientBottom]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.textWhite}
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
            <BlurView intensity={30} tint="light" style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color={COLORS.textWhite} />
              <Text style={styles.emptyStateText}>No activity data yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Start walking to see your history here
              </Text>
            </BlurView>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    color: COLORS.textWhite,
    marginBottom: 4,
    textShadowColor: COLORS.textWhiteShadow,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.textWhite,
    textShadowColor: COLORS.textWhiteShadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  chartCard: {
    backgroundColor: COLORS.glassWhite,
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    overflow: 'hidden',
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textWhite,
    marginBottom: 20,
    textShadowColor: COLORS.textWhiteShadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
    color: COLORS.textWhite,
    marginTop: 4,
    textShadowColor: COLORS.textWhiteShadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  barSteps: {
    fontSize: 10,
    color: COLORS.textWhite,
    marginTop: 2,
    textShadowColor: COLORS.textWhiteShadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  historySection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textWhite,
    marginBottom: 16,
    textShadowColor: COLORS.textWhiteShadow,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  historyCard: {
    backgroundColor: COLORS.glassWhite,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    overflow: 'hidden',
  },
  historyCardPressed: {
    backgroundColor: COLORS.glowPink,
    shadowColor: COLORS.electricPink,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
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
    color: COLORS.textWhite,
    marginBottom: 4,
    textShadowColor: COLORS.textWhiteShadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  historySteps: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textWhite,
    textShadowColor: COLORS.textWhiteShadow,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
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
    borderTopColor: COLORS.glassBorder,
  },
  historyStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyStatText: {
    fontSize: 14,
    color: COLORS.textWhite,
    textShadowColor: COLORS.textWhiteShadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    backgroundColor: COLORS.glassWhite,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    overflow: 'hidden',
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textWhite,
    marginTop: 16,
    textShadowColor: COLORS.textWhiteShadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: COLORS.textWhite,
    marginTop: 8,
    textShadowColor: COLORS.textWhiteShadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
