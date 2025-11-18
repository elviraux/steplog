import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DayStepData {
  date: string; // ISO date string
  steps: number;
  goal: number;
  distance: number; // in miles
  calories: number;
  goalReached: boolean;
}

const STORAGE_KEY_PREFIX = 'steplog_day_';

export const calculateDistance = (stepCount: number): number => {
  // Average step length is about 0.762 meters
  const meters = stepCount * 0.762;
  const miles = meters / 1609.34;
  return parseFloat(miles.toFixed(1));
};

export const calculateCalories = (stepCount: number): number => {
  // Rough estimate: 0.04 calories per step
  return Math.round(stepCount * 0.04);
};

export const getDateKey = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const saveDayData = async (date: Date, steps: number, goal: number): Promise<void> => {
  const dateKey = getDateKey(date);
  const dayData: DayStepData = {
    date: dateKey,
    steps,
    goal,
    distance: calculateDistance(steps),
    calories: calculateCalories(steps),
    goalReached: steps >= goal,
  };

  try {
    await AsyncStorage.setItem(
      `${STORAGE_KEY_PREFIX}${dateKey}`,
      JSON.stringify(dayData)
    );
  } catch (error) {
    console.error('Error saving day data:', error);
  }
};

export const getDayData = async (date: Date): Promise<DayStepData | null> => {
  const dateKey = getDateKey(date);

  try {
    const data = await AsyncStorage.getItem(`${STORAGE_KEY_PREFIX}${dateKey}`);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error getting day data:', error);
  }

  return null;
};

export const getLastNDays = async (days: number): Promise<DayStepData[]> => {
  const result: DayStepData[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    const dayData = await getDayData(date);

    if (dayData) {
      result.push(dayData);
    } else {
      // Create empty data for days with no records
      result.push({
        date: getDateKey(date),
        steps: 0,
        goal: 10000,
        distance: 0,
        calories: 0,
        goalReached: false,
      });
    }
  }

  return result;
};

export const getHistoricalData = async (days: number = 30): Promise<DayStepData[]> => {
  const allKeys = await AsyncStorage.getAllKeys();
  const stepDataKeys = allKeys.filter(key => key.startsWith(STORAGE_KEY_PREFIX));

  const dataPromises = stepDataKeys.map(async (key) => {
    const data = await AsyncStorage.getItem(key);
    if (data) {
      return JSON.parse(data) as DayStepData;
    }
    return null;
  });

  const allData = (await Promise.all(dataPromises))
    .filter((data): data is DayStepData => data !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, days);

  return allData;
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Reset time parts for comparison
  today.setHours(0, 0, 0, 0);
  yesterday.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  if (date.getTime() === today.getTime()) {
    return 'Today';
  } else if (date.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  } else {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    };
    return date.toLocaleDateString('en-US', options);
  }
};

export const getDayOfWeek = (dateString: string): string => {
  const date = new Date(dateString);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
};
