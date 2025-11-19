import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  getStreakData,
  getPlantStage,
  getMotivationalMessage,
  getBloomedPlants,
  checkForGrowthAnimation,
  PlantStage,
  BloomedPlant,
} from '@/utils/gardenData';

const { width } = Dimensions.get('window');

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
  particleWhite: 'rgba(255, 255, 255, 0.8)',
};

// Plant image mapping
const PLANT_IMAGES: Record<PlantStage, any> = {
  empty: require('@/assets/images/garden/pot.png'),
  sprout: require('@/assets/images/garden/sprout.png'),
  stem: require('@/assets/images/garden/stem.png'),
  fuller: require('@/assets/images/garden/fuller.png'),
  bud: require('@/assets/images/garden/bud.png'),
  bloom: require('@/assets/images/garden/bloom.png'),
};

// Particle component for sparkling effect
const Particle = ({ delay }: { delay: number }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const positionAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      Animated.parallel([
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(positionAnim, {
            toValue: -50,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        positionAnim.setValue(0);
        animate();
      });
    };

    animate();
  }, [delay, fadeAnim, positionAnim]);

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          opacity: fadeAnim,
          transform: [{ translateY: positionAnim }],
        },
      ]}
    />
  );
};

// Sparkling background component
const SparklingBackground = () => {
  const particles = Array.from({ length: 20 }, (_, i) => i);

  return (
    <View style={styles.particleContainer} pointerEvents="none">
      {particles.map((i) => (
        <Particle key={i} delay={i * 200} />
      ))}
    </View>
  );
};

// Main plant display component
const PlantDisplay = ({ stage, isAnimating }: { stage: PlantStage; isAnimating: boolean }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isAnimating) {
      // Growth animation
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      // Glow animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isAnimating, stage, scaleAnim, glowAnim]);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <View style={styles.plantContainer}>
      <Animated.View
        style={[
          styles.plantGlow,
          {
            opacity: stage === 'bloom' ? glowOpacity : 0,
          },
        ]}
      />
      <Animated.Image
        source={PLANT_IMAGES[stage]}
        style={[
          styles.plantImage,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
        resizeMode="contain"
      />
    </View>
  );
};

// Bloomed plant in collection
const BloomedPlantCard = ({ plant }: { plant: BloomedPlant }) => {
  return (
    <BlurView intensity={30} tint="light" style={styles.bloomedCard}>
      <Animated.Image
        source={PLANT_IMAGES.bloom}
        style={styles.bloomedPlantImage}
        resizeMode="contain"
      />
      <Text style={styles.bloomedDate}>
        {new Date(plant.bloomedDate).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })}
      </Text>
    </BlurView>
  );
};

export default function Garden() {
  const [currentStreak, setCurrentStreak] = useState(0);
  const [plantStage, setPlantStage] = useState<PlantStage>('empty');
  const [motivationalMessage, setMotivationalMessage] = useState('');
  const [bloomedPlants, setBloomedPlants] = useState<BloomedPlant[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadGardenData();
  }, []);

  const loadGardenData = async () => {
    try {
      // Check for growth animation
      const growthCheck = await checkForGrowthAnimation();

      const streakData = await getStreakData();
      const stage = getPlantStage(streakData.currentStreak);
      const message = getMotivationalMessage(streakData.currentStreak);
      const bloomed = await getBloomedPlants();

      setCurrentStreak(streakData.currentStreak);
      setPlantStage(stage);
      setMotivationalMessage(message);
      setBloomedPlants(bloomed);

      // Trigger animation if there was growth
      if (growthCheck?.shouldAnimate) {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 3000);
      }
    } catch (error) {
      console.error('Error loading garden data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGardenData();
    setRefreshing(false);
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

      {/* Sparkling particles */}
      <SparklingBackground />

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
          <Text style={styles.headerTitle}>My Garden</Text>
          <Text style={styles.headerSubtitle}>Grow your virtual garden by staying active</Text>
        </View>

        {/* Main Garden Panel */}
        <BlurView intensity={30} tint="light" style={styles.gardenPanel}>
          {/* Streak Counter */}
          <View style={styles.streakBadge}>
            <Text style={styles.streakNumber}>{currentStreak}</Text>
            <Text style={styles.streakLabel}>Day Streak</Text>
          </View>

          {/* Motivational Message */}
          <Text style={styles.motivationalText}>{motivationalMessage}</Text>

          {/* Plant Display */}
          <PlantDisplay stage={plantStage} isAnimating={isAnimating} />

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((day) => (
              <View
                key={day}
                style={[
                  styles.progressDot,
                  currentStreak >= day && styles.progressDotActive,
                  day === 7 && styles.progressDotBloom,
                ]}
              />
            ))}
          </View>
          <Text style={styles.progressText}>
            {currentStreak < 7 ? `${7 - currentStreak} days until bloom` : 'Fully bloomed!'}
          </Text>
        </BlurView>

        {/* Bloomed Plants Collection */}
        {bloomedPlants.length > 0 && (
          <View style={styles.collectionSection}>
            <Text style={styles.sectionTitle}>My Bloomed Collection</Text>
            <View style={styles.collectionGrid}>
              {bloomedPlants.map((plant) => (
                <BloomedPlantCard key={plant.id} plant={plant} />
              ))}
            </View>
          </View>
        )}

        {/* Tips Section */}
        <BlurView intensity={30} tint="light" style={styles.tipsPanel}>
          <Text style={styles.tipsTitle}>💡 Garden Tips</Text>
          <Text style={styles.tipsText}>
            • Meet your daily step goal to grow your plant
          </Text>
          <Text style={styles.tipsText}>
            • Keep a 7-day streak to bloom a beautiful flower
          </Text>
          <Text style={styles.tipsText}>
            • Your plant won&apos;t die if you miss a day, but your streak will reset
          </Text>
          <Text style={styles.tipsText}>
            • Build a collection of bloomed flowers by maintaining streaks
          </Text>
        </BlurView>
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
    paddingBottom: 120,
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
  particleContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.particleWhite,
    left: Math.random() * width,
    top: Math.random() * 800 + 100,
  },
  gardenPanel: {
    backgroundColor: COLORS.glassWhite,
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    overflow: 'hidden',
    alignItems: 'center',
  },
  streakBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.goldenYellow,
    marginBottom: 16,
  },
  streakNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.goldenYellow,
    textAlign: 'center',
    textShadowColor: COLORS.textWhiteShadow,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  streakLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textWhite,
    textAlign: 'center',
    textShadowColor: COLORS.textWhiteShadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  motivationalText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textWhite,
    textAlign: 'center',
    marginBottom: 24,
    textShadowColor: COLORS.textWhiteShadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  plantContainer: {
    width: 280,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  plantGlow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: COLORS.electricPink,
    shadowColor: COLORS.electricPink,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 40,
  },
  plantImage: {
    width: 280,
    height: 280,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  progressDotActive: {
    backgroundColor: COLORS.goldenYellow,
    borderColor: COLORS.goldenYellow,
    shadowColor: COLORS.goldenYellow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  progressDotBloom: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  progressText: {
    fontSize: 14,
    color: COLORS.textWhite,
    textAlign: 'center',
    textShadowColor: COLORS.textWhiteShadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  collectionSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
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
  collectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  bloomedCard: {
    backgroundColor: COLORS.glassWhite,
    width: (width - 64) / 3,
    aspectRatio: 1,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bloomedPlantImage: {
    width: '100%',
    height: '70%',
  },
  bloomedDate: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textWhite,
    textAlign: 'center',
    marginTop: 4,
    textShadowColor: COLORS.textWhiteShadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  tipsPanel: {
    backgroundColor: COLORS.glassWhite,
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    overflow: 'hidden',
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textWhite,
    marginBottom: 12,
    textShadowColor: COLORS.textWhiteShadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  tipsText: {
    fontSize: 14,
    color: COLORS.textWhite,
    marginBottom: 8,
    textShadowColor: COLORS.textWhiteShadow,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
