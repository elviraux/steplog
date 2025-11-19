import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLastNDays, DayStepData, getDateKey } from './stepData';

const STREAK_STORAGE_KEY = 'garden_streak';
const BLOOMED_PLANTS_KEY = 'garden_bloomed_plants';

export interface StreakData {
  currentStreak: number;
  lastCheckedDate: string; // ISO date string
}

export interface BloomedPlant {
  id: string;
  bloomedDate: string; // ISO date string
  streakAchieved: number;
}

export type PlantStage = 'empty' | 'sprout' | 'stem' | 'fuller' | 'bud' | 'bloom';

/**
 * Get the plant stage based on the current streak
 */
export const getPlantStage = (streak: number): PlantStage => {
  if (streak === 0) return 'empty';
  if (streak === 1) return 'sprout';
  if (streak === 2) return 'stem';
  if (streak >= 3 && streak <= 4) return 'fuller';
  if (streak >= 5 && streak < 7) return 'bud';
  return 'bloom'; // 7+ days
};

/**
 * Get the motivational message based on the current streak
 */
export const getMotivationalMessage = (streak: number): string => {
  switch (streak) {
    case 0:
      return 'Start your journey! Meet your goal to plant a seed.';
    case 1:
      return 'A tiny sprout appears! Keep going!';
    case 2:
      return 'Your plant is growing! 5 more days to bloom.';
    case 3:
      return 'Looking good! 4 more days until it blooms.';
    case 4:
      return 'Almost there! 3 more days to see the flower.';
    case 5:
      return 'A bud is forming! 2 more days!';
    case 6:
      return 'So close! Just 1 more day until it blooms!';
    default:
      return 'Beautiful! Your flower is in full bloom! 🌸';
  }
};

/**
 * Calculate the current streak based on historical step data
 */
export const calculateCurrentStreak = async (): Promise<number> => {
  const today = new Date();
  const dateKey = getDateKey(today);

  // Get historical data to calculate streak
  const last30Days = await getLastNDays(30);

  if (last30Days.length === 0) {
    return 0;
  }

  let streak = 0;

  // Start from today and count backwards
  for (let i = last30Days.length - 1; i >= 0; i--) {
    const dayData = last30Days[i];

    // Only count days up to today
    if (new Date(dayData.date) > today) {
      continue;
    }

    if (dayData.goalReached) {
      streak++;
    } else {
      // Streak breaks if goal not reached
      break;
    }
  }

  return streak;
};

/**
 * Get the current streak data from storage and recalculate if needed
 */
export const getStreakData = async (): Promise<StreakData> => {
  try {
    const stored = await AsyncStorage.getItem(STREAK_STORAGE_KEY);
    const today = getDateKey(new Date());

    if (stored) {
      const data: StreakData = JSON.parse(stored);

      // If we already checked today, return cached data
      if (data.lastCheckedDate === today) {
        return data;
      }
    }

    // Recalculate streak
    const currentStreak = await calculateCurrentStreak();

    const newData: StreakData = {
      currentStreak,
      lastCheckedDate: today,
    };

    await AsyncStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(newData));
    return newData;
  } catch (error) {
    console.error('Error getting streak data:', error);
    return {
      currentStreak: 0,
      lastCheckedDate: getDateKey(new Date()),
    };
  }
};

/**
 * Update the streak (called when step goal is achieved)
 */
export const updateStreak = async (): Promise<StreakData> => {
  const streak = await calculateCurrentStreak();

  const data: StreakData = {
    currentStreak: streak,
    lastCheckedDate: getDateKey(new Date()),
  };

  try {
    await AsyncStorage.setItem(STREAK_STORAGE_KEY, JSON.stringify(data));

    // If streak reaches 7, save the bloomed plant
    if (streak === 7) {
      await saveBloomedPlant(streak);
    }
  } catch (error) {
    console.error('Error updating streak:', error);
  }

  return data;
};

/**
 * Save a bloomed plant to the collection
 */
export const saveBloomedPlant = async (streakAchieved: number): Promise<void> => {
  try {
    const existing = await getBloomedPlants();
    const today = getDateKey(new Date());

    // Check if we already saved a bloom for today
    const alreadyBloomed = existing.some(plant => plant.bloomedDate === today);

    if (!alreadyBloomed) {
      const newPlant: BloomedPlant = {
        id: `plant_${Date.now()}`,
        bloomedDate: today,
        streakAchieved,
      };

      const updated = [...existing, newPlant];
      await AsyncStorage.setItem(BLOOMED_PLANTS_KEY, JSON.stringify(updated));
    }
  } catch (error) {
    console.error('Error saving bloomed plant:', error);
  }
};

/**
 * Get all bloomed plants in the garden collection
 */
export const getBloomedPlants = async (): Promise<BloomedPlant[]> => {
  try {
    const stored = await AsyncStorage.getItem(BLOOMED_PLANTS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error getting bloomed plants:', error);
  }
  return [];
};

/**
 * Check if the user should see a growth animation
 * (Returns the previous stage if there was a change)
 */
export const checkForGrowthAnimation = async (): Promise<{ shouldAnimate: boolean; previousStage: PlantStage; currentStage: PlantStage } | null> => {
  try {
    const LAST_STAGE_KEY = 'garden_last_stage';
    const stored = await AsyncStorage.getItem(LAST_STAGE_KEY);

    const streakData = await getStreakData();
    const currentStage = getPlantStage(streakData.currentStreak);

    if (stored) {
      const lastStage = stored as PlantStage;

      if (lastStage !== currentStage) {
        // Save the new stage
        await AsyncStorage.setItem(LAST_STAGE_KEY, currentStage);

        return {
          shouldAnimate: true,
          previousStage: lastStage,
          currentStage,
        };
      }
    } else {
      // First time, save the current stage
      await AsyncStorage.setItem(LAST_STAGE_KEY, currentStage);
    }

    return null;
  } catch (error) {
    console.error('Error checking for growth animation:', error);
    return null;
  }
};
