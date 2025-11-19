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
import { BlurView } from 'expo-blur';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { saveDayData, calculateDistance, calculateCalories } from '@/utils/stepData';

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = width * 0.65;
const CIRCLE_STROKE_WIDTH = 20;
const CIRCLE_RADIUS = (CIRCLE_SIZE - CIRCLE_STROKE_WIDTH) / 2;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

const COLORS = {
  gradientTop: '#0A2463', // Deep Ocean Blue
  gradientBottom: '#00D9FF', // Vibrant Aqua
  neonBlue: '#00D9FF', // Neon Blue accent
  limeGreen: '#CCFF00', // Lime Green success
  glassWhite: 'rgba(255, 255, 255, 0.15)', // Frosted glass panel
  glassBorder: 'rgba(255, 255, 255, 0.2)', // Glass border
  textWhite: '#FFFFFF',
  textWhiteShadow: 'rgba(0, 0, 0, 0.3)',
  glowNeon: 'rgba(0, 217, 255, 0.4)',
  glowLime: 'rgba(204, 255, 0, 0.4)',
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

  // Save step data periodically
  useEffect(() => {
    if (!hasPermission || steps === 0) return;

    const saveInterval = setInterval(() => {
      saveDayData(new Date(), steps, dailyGoal);
    }, 30000); // Save every 30 seconds

    // Also save when steps change significantly
    if (steps > 0) {
      saveDayData(new Date(), steps, dailyGoal);
    }

    return () => clearInterval(saveInterval);
  }, [steps, dailyGoal, hasPermission]);

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


  if (showPermissionScreen) {
    return (
      <View style={styles.permissionContainer}>
        <StatusBar style="light" />
        <ExpoLinearGradient
          colors={[COLORS.gradientTop, COLORS.gradientBottom]}
          style={StyleSheet.absoluteFillObject}
        />
        <BlurView intensity={30} tint="light" style={styles.permissionContent}>
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
        </BlurView>
      </View>
    );
  }

  const progressColor = goalReached ? COLORS.limeGreen : COLORS.neonBlue;
  const progress = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCLE_CIRCUMFERENCE, 0],
  });

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Gradient Background */}
      <ExpoLinearGradient
        colors={[COLORS.gradientTop, COLORS.gradientBottom]}
        style={StyleSheet.absoluteFillObject}
      />

      {showConfetti && <Confetti />}

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Today&apos;s Steps</Text>
        </View>

        {/* Main Card - Frosted Glass */}
        <BlurView intensity={30} tint="light" style={styles.card}>
          {/* Progress Circle */}
          <View style={styles.circleContainer}>
            <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
              {/* Background Circle */}
              <Circle
                cx={CIRCLE_SIZE / 2}
                cy={CIRCLE_SIZE / 2}
                r={CIRCLE_RADIUS}
                stroke="rgba(255, 255, 255, 0.2)"
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
        </BlurView>

        {/* Stats Cards - Separated Frosted Glass */}
        <View style={styles.statsRow}>
          <BlurView intensity={30} tint="light" style={styles.statCard}>
            <Text style={styles.statValue}>{calculateDistance(steps)} mi</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </BlurView>
          <BlurView intensity={30} tint="light" style={styles.statCard}>
            <Text style={styles.statValue}>{calculateCalories(steps)} kcal</Text>
            <Text style={styles.statLabel}>Calories Burned</Text>
          </BlurView>
        </View>

        {/* Goal Reached Message */}
        {goalReached && (
          <BlurView intensity={30} tint="light" style={styles.successBanner}>
            <Text style={styles.successText}>🎉 Goal Reached! Great job!</Text>
          </BlurView>
        )}
      </View>

      {/* Goal Edit Modal */}
      <Modal
        visible={showGoalModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowGoalModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setShowGoalModal(false)}
          />
          <BlurView intensity={30} tint="light" style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Daily Goal</Text>
            <TextInput
              style={styles.modalInput}
              value={goalInput}
              onChangeText={setGoalInput}
              keyboardType="number-pad"
              placeholder="Enter step goal"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
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
          </BlurView>
        </View>
      </Modal>
    </View>
  );
}

// Animated Circle component
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    color: COLORS.textWhite,
    textShadowColor: COLORS.textWhiteShadow,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  card: {
    backgroundColor: COLORS.glassWhite,
    borderRadius: 28,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    overflow: 'hidden',
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
    color: COLORS.textWhite,
    textShadowColor: COLORS.textWhiteShadow,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  stepLabel: {
    fontSize: 16,
    color: COLORS.textWhite,
    marginTop: 4,
    textShadowColor: COLORS.textWhiteShadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  goalText: {
    fontSize: 14,
    color: COLORS.textWhite,
    marginTop: 8,
    textShadowColor: COLORS.textWhiteShadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.glassWhite,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    overflow: 'hidden',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textWhite,
    textShadowColor: COLORS.textWhiteShadow,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.textWhite,
    marginTop: 4,
    textAlign: 'center',
    textShadowColor: COLORS.textWhiteShadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  goalButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.textWhite,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  goalButtonPressed: {
    backgroundColor: COLORS.glowNeon,
    shadowColor: COLORS.neonBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },
  goalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textWhite,
    textShadowColor: COLORS.textWhiteShadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  successBanner: {
    marginTop: 20,
    backgroundColor: COLORS.glassWhite,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    overflow: 'hidden',
  },
  successText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textWhite,
    textShadowColor: COLORS.textWhiteShadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  permissionContent: {
    alignItems: 'center',
    maxWidth: 400,
    backgroundColor: COLORS.glassWhite,
    borderRadius: 28,
    padding: 40,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    overflow: 'hidden',
  },
  permissionTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.textWhite,
    marginBottom: 20,
    textAlign: 'center',
    textShadowColor: COLORS.textWhiteShadow,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  permissionDescription: {
    fontSize: 18,
    color: COLORS.textWhite,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 26,
    textShadowColor: COLORS.textWhiteShadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  permissionNote: {
    fontSize: 14,
    color: COLORS.textWhite,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 20,
    textShadowColor: COLORS.textWhiteShadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  permissionButton: {
    backgroundColor: COLORS.neonBlue,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
  },
  permissionButtonPressed: {
    shadowColor: COLORS.neonBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
  },
  permissionButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textWhite,
    textShadowColor: COLORS.textWhiteShadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.glassWhite,
    borderRadius: 24,
    padding: 24,
    width: '80%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    overflow: 'hidden',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textWhite,
    marginBottom: 20,
    textAlign: 'center',
    textShadowColor: COLORS.textWhiteShadow,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  modalInput: {
    borderWidth: 2,
    borderColor: COLORS.textWhite,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: COLORS.textWhite,
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  modalButtonSave: {
    backgroundColor: COLORS.neonBlue,
  },
  modalButtonPressed: {
    shadowColor: COLORS.neonBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textWhite,
  },
  modalButtonTextSave: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textWhite,
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
