import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Button } from 'react-native';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';

const BACKGROUND_FETCH_TASK = 'background-fetch-task';
const apiUrl = 'https://ns-1.oracle.cgmsim.com/api/v1/activity';

// Set notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Function to upload data to API
const uploadDataToAPI = async () => {
  try {
    const now = new Date();
    const currentTime = now.toISOString().split('T')[1].split('.')[0];

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-secret': '51f93ca9b254733807d44e251209a39014527506',
      },
      body: JSON.stringify({
        notes: `Upload was successful at ${currentTime}`,
        eventType: 'Note',
        enteredBy: 'Background step count upload',
        created_at: now.toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to upload data to API');
    }

    console.log('Data uploaded to API successfully');
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Background Fetch',
        body: `Data uploaded to API successfully at ${currentTime}`,
      },
      trigger: null,
    });
  } catch (error) {
    console.error('Error uploading data to API:', error);
  }
};

// Define the background fetch task
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    console.log(`Background fetch task executed at ${new Date().toISOString()}`);
    await uploadDataToAPI();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Register the background fetch task
const registerBackgroundFetchAsync = async () => {
  return BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
    minimumInterval: 10 * 60, // 10 minutes
    stopOnTerminate: false,
    startOnBoot: true,
  });
};

// Unregister the background fetch task
const unregisterBackgroundFetchAsync = async () => {
  return BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
};

export default function App() {
  const [isRegistered, setIsRegistered] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const checkStatusAsync = async () => {
      const status = await BackgroundFetch.getStatusAsync();
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
      setStatus(status);
      setIsRegistered(isRegistered);
      console.log(`Background fetch status: ${status}`);
      console.log(`Is task registered: ${isRegistered}`);
    };

    checkStatusAsync();

    const requestNotificationPermission = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('No notification permissions. The app might not work as expected.');
        setIsRegistered(false);
      }
    };

    requestNotificationPermission();
  }, []);

  const toggleFetchTask = async () => {
    if (isRegistered) {
      await unregisterBackgroundFetchAsync();
      console.log('Unregistered background fetch task');
    } else {
      await registerBackgroundFetchAsync();
      console.log('Registered background fetch task');
    }

    const status = await BackgroundFetch.getStatusAsync();
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
    setStatus(status);
    setIsRegistered(isRegistered);
    console.log(`Toggled task status: ${status}`);
    console.log(`Is task registered after toggle: ${isRegistered}`);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.textContainer}>
        <Text>
          Background fetch status:{' '}
          <Text style={styles.boldText}>
            {status && BackgroundFetch.BackgroundFetchStatus[status]}
          </Text>
        </Text>
        <Text>
          Background fetch task name:{' '}
          <Text style={styles.boldText}>
            {isRegistered ? BACKGROUND_FETCH_TASK : 'Not registered yet!'}
          </Text>
        </Text>
      </View>
      <Button
        title={isRegistered ? 'Unregister BackgroundFetch task' : 'Register BackgroundFetch task'}
        onPress={toggleFetchTask}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    margin: 10,
  },
  boldText: {
    fontWeight: 'bold',
  },
});
