import React from 'react';
import { StyleSheet, Text, View, Button } from 'react-native';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';

const BACKGROUND_FETCH_TASK = 'background-fetch';

// Function to upload data to API
const apiUrl = 'https://ns-1.oracle.cgmsim.com/api/v1/activity';

const uploadDataToAPI = async (apiUrl) => {
  try {
    // Get current time in HH:mm:ss format
    const now = new Date();
    const currentTime = now.toISOString().split('T')[1].split('.')[0];

    // Replace 'your-api-endpoint' with your actual API endpoint
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-secret': '51f93ca9b254733807d44e251209a39014527506'
      },
      body: JSON.stringify({ 
        "notes": `Upload was successful at ${currentTime}`,
        "eventType": "Note",
        "enteredBy": "Background step count upload",  
        "created_at": now.toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to upload data to API');
    }

    console.log('Data uploaded to API successfully');

    // Schedule a local notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Background Fetch",
        body: `Data uploaded to API successfully at ${currentTime}`,
      },
      trigger: null,
    });

  } catch (error) {
    console.error('Error uploading data to API:', error);
  }
};

// 1. Define the task by providing a name and the function that should be executed
// Note: This needs to be called in the global scope (e.g outside of your React components)
TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  console.log(`Background fetch started at date: ${new Date().toISOString()}`);

  // Call the function to upload data to API
  await uploadDataToAPI(apiUrl);

  // Be sure to return the successful result type!
  return BackgroundFetch.BackgroundFetchResult.NewData;
});

// 2. Register the task at some point in your app by providing the same name,
// and some configuration options for how the background fetch should behave
// Note: This does NOT need to be in the global scope and CAN be used in your React components!
async function registerBackgroundFetchAsync() {
  return BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
    minimumInterval: 60 * 10, // 10 minutes
  });
}

// 3. (Optional) Unregister tasks by specifying the task name
// This will cancel any future background fetch calls that match the given name
// Note: This does NOT need to be in the global scope and CAN be used in your React components!
async function unregisterBackgroundFetchAsync() {
  return BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
}

export default function BackgroundFetchScreen() {

  useEffect(() => {
    // Request permission to show notifications on component mount
    const requestNotificationPermission = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('No notification permissions. The app might not work as expected.');
      }
    };

    requestNotificationPermission();
  }, []);
  
  const [isRegistered, setIsRegistered] = React.useState(false);
  const [status, setStatus] = React.useState(null);

  React.useEffect(() => {
    checkStatusAsync();
  }, []);

  const checkStatusAsync = async () => {
    const status = await BackgroundFetch.getStatusAsync();
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
    setStatus(status);
    setIsRegistered(isRegistered);
  };

  const toggleFetchTask = async () => {
    if (isRegistered) {
      await unregisterBackgroundFetchAsync();
    } else {
      await registerBackgroundFetchAsync();
    }

    checkStatusAsync();
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
          Background fetch task name :{' '}
          <Text style={styles.boldText}>
            {isRegistered ? BACKGROUND_FETCH_TASK : 'Not registered yet!'}
          </Text>
        </Text>
      </View>
      <View style={styles.textContainer}></View>
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
