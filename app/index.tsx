import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  Alert,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle } from 'react-native-svg';
import * as Sensors from 'expo-sensors';

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = width * 0.65;
const CIRCLE_STROKE_WIDTH = 20;
const CIRCLE_RADIUS = (CIRCLE_SIZE - CIRCLE_STROKE_WIDTH) / 2;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

const COLORS = {
  background: '#F0F0F0',
  cardBackground: '#FFFFFF',
  primaryBlue: '#3B82F6',
  successGreen: '#10B981',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  shadow: 'rgba(0, 0, 0, 0.1)',
};

// Confetti component for celebration
const ConfettiPiece = ({ index }: { index: number }) => {
  const translateY = useRef(new Animated.Value(-50)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const randomX = (Math.random() - 0.5) * width;
    const randomRotation = Math.random() * 360;
    const randomDuration = 2000 + Math.random() * 1000;

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: Dimensions.get('window').height,
        duration: randomDuration,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: randomX,
        duration: randomDuration,
        useNativeDriver: true,
      }),
      Animated.timing(rotate, {
        toValue: randomRotation,
        duration: randomDuration,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: randomDuration,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translateY, translateX, rotate, opacity]);

  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
  const color = colors[index % colors.length];

  return (
    <Animated.View
      style={[
        styles.confettiPiece,
        {
          backgroundColor: color,
          transform: [
            { translateY },
            { translateX },
            { rotate: rotate.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] }) },
          ],
          opacity,
        },
      ]}
    />
  );
};

const Confetti = () => {
  return (
    <View style={styles.confettiContainer} pointerEvents="none">
      {Array.from({ length: 50 }).map((_, i) => (
        <ConfettiPiece key={i} index={i} />
      ))}
    </View>
  );
};

export default function Index() {
  const [steps, setSteps] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(10000);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalInput, setGoalInput] = useState('10000');
  const [hasPermission, setHasPermission] = useState(false);
  const [showPermissionScreen, setShowPermissionScreen] = useState(true);
  const [goalReached, setGoalReached] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Load saved data on mount
  useEffect(() => {
    loadSavedData();
  }, []);

  // Check if permission is already granted
  useEffect(() => {
    checkPermissions();
  }, []);

  // Simulate step counting (in production, use expo-sensors Pedometer)
  useEffect(() => {
    if (!hasPermission) return;

    let subscription: any;

    const startStepCounter = async () => {
      // Check if Pedometer is available
      const isAvailable = await Sensors.Pedometer.isAvailableAsync();

      if (isAvailable) {
        // Get today's step count
        const end = new Date();
        const start = new Date();
        start.setHours(0, 0, 0, 0);

        try {
          const pastStepCountResult = await Sensors.Pedometer.getStepCountAsync(start, end);
          if (pastStepCountResult) {
            setSteps(pastStepCountResult.steps);
          }
        } catch (error) {
          console.log('Error getting past steps:', error);
        }

        // Subscribe to step updates
        subscription = Sensors.Pedometer.watchStepCount((result) => {
          setSteps((prev) => prev + result.steps);
        });
      } else {
        // Fallback: simulate step counting for development/testing
        const interval = setInterval(() => {
          setSteps((prev) => {
            const newSteps = prev + Math.floor(Math.random() * 5);
            return Math.min(newSteps, dailyGoal + 1000); // Cap for demo
          });
        }, 2000);

        return () => clearInterval(interval);
      }
    };

    startStepCounter();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [hasPermission, dailyGoal]);

  // Animate progress and check for goal completion
  useEffect(() => {
    const progress = Math.min(steps / dailyGoal, 1);
    Animated.spring(progressAnim, {
      toValue: progress,
      useNativeDriver: false,
      friction: 8,
    }).start();

    // Check if goal just reached
    if (steps >= dailyGoal && !goalReached) {
      setGoalReached(true);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    } else if (steps < dailyGoal && goalReached) {
      setGoalReached(false);
    }
  }, [steps, dailyGoal, goalReached, progressAnim]);

  const checkPermissions = async () => {
    try {
      const granted = await AsyncStorage.getItem('steplog_permission_granted');
      if (granted === 'true') {
        setHasPermission(true);
        setShowPermissionScreen(false);
      }
    } catch (error) {
      console.log('Error checking permissions:', error);
    }
  };

  const requestPermission = async () => {
    // In a real app, this would use expo-sensors permissions
    // For now, we'll just store the permission grant
    try {
      if (Platform.OS === 'ios') {
        // On iOS, we need to request permission
        const { status } = await Sensors.Pedometer.requestPermissionsAsync();
        if (status === 'granted') {
          await AsyncStorage.setItem('steplog_permission_granted', 'true');
          setHasPermission(true);
          setShowPermissionScreen(false);
        } else {
          Alert.alert(
            'Permission Denied',
            'We need motion and fitness permissions to count your steps. Please enable them in Settings.',
            [{ text: 'OK' }]
          );
        }
      } else {
        // On Android, pedometer doesn't require explicit permission in newer versions
        await AsyncStorage.setItem('steplog_permission_granted', 'true');
        setHasPermission(true);
        setShowPermissionScreen(false);
      }
    } catch (error) {
      console.log('Error requesting permission:', error);
      // Fallback: grant permission for development
      await AsyncStorage.setItem('steplog_permission_granted', 'true');
      setHasPermission(true);
      setShowPermissionScreen(false);
    }
  };

  const loadSavedData = async () => {
    try {
      const savedGoal = await AsyncStorage.getItem('steplog_daily_goal');
      if (savedGoal) {
        setDailyGoal(parseInt(savedGoal, 10));
        setGoalInput(savedGoal);
      }
    } catch (error) {
      console.log('Error loading saved data:', error);
    }
  };

  const saveGoal = async (goal: number) => {
    try {
      await AsyncStorage.setItem('steplog_daily_goal', goal.toString());
    } catch (error) {
      console.log('Error saving goal:', error);
    }
  };

  const handleGoalChange = () => {
    const newGoal = parseInt(goalInput, 10);
    if (newGoal > 0 && newGoal <= 100000) {
      setDailyGoal(newGoal);
      saveGoal(newGoal);
      setShowGoalModal(false);
    } else {
      Alert.alert('Invalid Goal', 'Please enter a goal between 1 and 100,000 steps.');
    }
  };

  const calculateDistance = (stepCount: number): string => {
    // Average step length is about 0.762 meters
    const meters = stepCount * 0.762;
    const miles = meters / 1609.34;
    return miles.toFixed(1);
  };

  const calculateCalories = (stepCount: number): string => {
    // Rough estimate: 0.04 calories per step
    const calories = stepCount * 0.04;
    return Math.round(calories).toString();
  };

  if (showPermissionScreen) {
    return (
      <View style={styles.permissionContainer}>
        <StatusBar style="dark" />
        <View style={styles.permissionContent}>
          <Text style={styles.permissionTitle}>Welcome to Steplog</Text>
          <Text style={styles.permissionDescription}>
            To count your steps, we need permission to access your motion and fitness data.
          </Text>
          <Text style={styles.permissionNote}>
            Your data stays private and is only used to track your daily activity.
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.permissionButton,
              pressed && styles.permissionButtonPressed,
            ]}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const progressColor = goalReached ? COLORS.successGreen : COLORS.primaryBlue;
  const progress = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCLE_CIRCUMFERENCE, 0],
  });

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {showConfetti && <Confetti />}

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Today&apos;s Steps</Text>
        </View>

        {/* Main Card */}
        <View style={styles.card}>
          {/* Progress Circle */}
          <View style={styles.circleContainer}>
            <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
              {/* Background Circle */}
              <Circle
                cx={CIRCLE_SIZE / 2}
                cy={CIRCLE_SIZE / 2}
                r={CIRCLE_RADIUS}
                stroke="#E5E7EB"
                strokeWidth={CIRCLE_STROKE_WIDTH}
                fill="none"
              />
              {/* Progress Circle */}
              <AnimatedCircle
                cx={CIRCLE_SIZE / 2}
                cy={CIRCLE_SIZE / 2}
                r={CIRCLE_RADIUS}
                stroke={progressColor}
                strokeWidth={CIRCLE_STROKE_WIDTH}
                fill="none"
                strokeDasharray={CIRCLE_CIRCUMFERENCE}
                strokeDashoffset={progress}
                strokeLinecap="round"
                rotation="-90"
                origin={`${CIRCLE_SIZE / 2}, ${CIRCLE_SIZE / 2}`}
              />
            </Svg>
            <View style={styles.circleContent}>
              <Text style={styles.stepCount}>{steps.toLocaleString()}</Text>
              <Text style={styles.stepLabel}>steps</Text>
              <Text style={styles.goalText}>of {dailyGoal.toLocaleString()}</Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{calculateDistance(steps)} mi</Text>
              <Text style={styles.statLabel}>Distance</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{calculateCalories(steps)} kcal</Text>
              <Text style={styles.statLabel}>Calories</Text>
            </View>
          </View>

          {/* Goal Button */}
          <Pressable
            style={({ pressed }) => [
              styles.goalButton,
              pressed && styles.goalButtonPressed,
            ]}
            onPress={() => setShowGoalModal(true)}
          >
            <Text style={styles.goalButtonText}>Edit Goal</Text>
          </Pressable>
        </View>

        {/* Goal Reached Message */}
        {goalReached && (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>🎉 Goal Reached! Great job!</Text>
          </View>
        )}
      </View>

      {/* Goal Edit Modal */}
      <Modal
        visible={showGoalModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGoalModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowGoalModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Set Daily Goal</Text>
            <TextInput
              style={styles.modalInput}
              value={goalInput}
              onChangeText={setGoalInput}
              keyboardType="number-pad"
              placeholder="Enter step goal"
              placeholderTextColor={COLORS.textSecondary}
              selectTextOnFocus
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalButtonCancel,
                  pressed && styles.modalButtonPressed,
                ]}
                onPress={() => {
                  setGoalInput(dailyGoal.toString());
                  setShowGoalModal(false);
                }}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalButtonSave,
                  pressed && styles.modalButtonPressed,
                ]}
                onPress={handleGoalChange}
              >
                <Text style={styles.modalButtonTextSave}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// Animated Circle component
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  circleContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  circleContent: {
    position: 'absolute',
    alignItems: 'center',
  },
  stepCount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  stepLabel: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  goalText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  goalButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primaryBlue,
  },
  goalButtonPressed: {
    opacity: 0.7,
  },
  goalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primaryBlue,
  },
  successBanner: {
    marginTop: 20,
    backgroundColor: COLORS.successGreen,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  successText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: COLORS.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  permissionContent: {
    alignItems: 'center',
    maxWidth: 400,
  },
  permissionTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  },
  permissionDescription: {
    fontSize: 18,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 26,
  },
  permissionNote: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 20,
  },
  permissionButton: {
    backgroundColor: COLORS.primaryBlue,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
  },
  permissionButtonPressed: {
    opacity: 0.8,
  },
  permissionButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 20,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 2,
    borderColor: COLORS.primaryBlue,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: COLORS.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#E5E7EB',
  },
  modalButtonSave: {
    backgroundColor: COLORS.primaryBlue,
  },
  modalButtonPressed: {
    opacity: 0.7,
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalButtonTextSave: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  confettiPiece: {
    position: 'absolute',
    top: 100,
    left: width / 2,
    width: 10,
    height: 10,
    borderRadius: 2,
  },
});
