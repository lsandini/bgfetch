import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Switch,
  Button,
  Alert
} from 'react-native';

import BackgroundFetch from "react-native-background-fetch";
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Colors = {
  gold: '#fedd1e',
  black: '#000',
  white: '#fff',
  lightGrey: '#ccc',
  blue: '#337AB7',
};

/// Util class for handling fetch-event peristence in AsyncStorage.
import Event from "./Event.js";

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
    const apiUrl = 'https://ns-1.oracle.cgmsim.com/api/v1/activity';

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

export default function App() {
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState(-1);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    initBackgroundFetch();
  }, []);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    AsyncStorage.getItem('events').then((json) => {
      const data = (json === null) ? [] : JSON.parse(json);
      console.log(data);
    }).catch((error) => {
      console.error('Error reading AsyncStorage: ', error);
    });
  }, []);

  /// Configure BackgroundFetch.
  ///
  const initBackgroundFetch = async () => {
    const status = await BackgroundFetch.configure({
      minimumFetchInterval: 15,      // <-- minutes (15 is minimum allowed)
      enableHeadless: true,
      startOnBoot: true,
    }, async (taskId) => {
      console.log('[BackgroundFetch] taskId', taskId);
      console.log('Background task is running!'); // Added console.log statement
      // Create an Event record.
      const event = await Event.create(taskId, false);
      // Update state.
      setEvents((prev) => [...prev, event]);

      // Upload data to API and trigger Notification
      // uploadDataToAPI();

      // Finish.
      BackgroundFetch.finish(taskId);
    }, (taskId) => {
      // Oh No!  Our task took too long to complete and the OS has signalled
      // that this task must be finished immediately.
      console.log('[Fetch] TIMEOUT taskId:', taskId);
      BackgroundFetch.finish(taskId);
    });
    setStatus(status);
    setEnabled(true);
  }

  /// Load persisted events from AsyncStorage.
  ///
  const loadEvents = () => {
    Event.all().then((data) => {
      setEvents(data);
    }).catch((error) => {
      Alert.alert('Error', 'Failed to load data from AsyncStorage: ' + error);
    });
  }

  /// Toggle BackgroundFetch ON/OFF
  ///
  const onClickToggleEnabled = (value) => {
    setEnabled(value);

    if (value) {
      BackgroundFetch.start();
    } else {
      BackgroundFetch.stop();
    }
  }

  /// [Status] button handler.
  ///
  const onClickStatus = () => {
    BackgroundFetch.status().then((status) => {
      let statusConst = '';
      switch (status) {
        case BackgroundFetch.STATUS_AVAILABLE:
          statusConst = 'STATUS_AVAILABLE';
          break;
        case BackgroundFetch.STATUS_DENIED:
          statusConst = 'STATUS_DENIED';
          break;
        case BackgroundFetch.STATUS_RESTRICTED:
          statusConst = 'STATUS_RESTRICTED';
          break;
      }
      Alert.alert('BackgroundFetch.status()', `${statusConst} (${status})`);
    });
  }

  /// [scheduleTask] button handler.
  /// Schedules a custom-task to fire in 5000ms
  ///
  const onClickScheduleTask = () => {
    BackgroundFetch.scheduleTask({
      taskId: 'com.transistorsoft.customtask',
      delay: 10000,
      forceAlarmManager: true
    }).then(() => {
      Alert.alert('scheduleTask', 'Scheduled task with delay: 10000ms');
    }).catch((error) => {
      Alert.alert('scheduleTask ERROR', error);
    });
  }

  /// Clear the Events list.
  ///
  const onClickClear = () => {
    Event.destroyAll();
    setEvents([]);
  }

  /// Fetch events renderer.
  ///
  const renderEvents = () => {
    if (!events.length) {
      return (
        <Text style={{padding: 10, fontSize: 16}}>Waiting for BackgroundFetch events...</Text>
      );
    }
    return events.slice().reverse().map(event => (
      <View key={event.key} style={styles.event}>
        <View style={{flexDirection: 'row'}}>
          <Text style={styles.taskId}>{event.taskId}&nbsp;{event.isHeadless ? '[Headless]' : ''}</Text>
        </View>
        <Text style={styles.timestamp}>{event.timestamp}</Text>
      </View>
    ))
  }


  return (
    <SafeAreaView style={{flex:1, backgroundColor:Colors.gold}}>
      <StatusBar barStyle={'light-content'}>
      </StatusBar>
      <View style={styles.container}>
        <View style={styles.toolbar}>
          <Text style={styles.title}>BGFetch Demo</Text>
          <Switch value={enabled} onValueChange={onClickToggleEnabled} />
        </View>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={styles.eventList}>
          {renderEvents()}
        </ScrollView>
        <View style={styles.toolbar}>
          <Button title={"status: " + status} onPress={onClickStatus} />
          <Text>&nbsp;</Text>
          <Button title="scheduleTask" onPress={onClickScheduleTask} />
          <View style={{flex:1}} />
          <Button title="clear" onPress={onClickClear} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    flex: 1
  },
  title: {
    fontSize: 24,
    flex: 1,
    fontWeight: 'bold',
    color: Colors.black
  },
  eventList: {
    flex: 1,
    backgroundColor: Colors.white
  },
  event: {
    padding: 10,
    borderBottomWidth: 1,
    borderColor: Colors.lightGrey
  },
  taskId: {
    color: Colors.blue,
    fontSize: 16,
    fontWeight: 'bold'
  },
  headless: {
    fontWeight: 'bold'
  },
  timestamp: {
    color: Colors.black
  },
  toolbar: {
    height: 57,
    flexDirection: 'row',
    paddingLeft: 10,
    paddingRight: 10,
    alignItems: 'center',
    backgroundColor: Colors.gold
  },

});
