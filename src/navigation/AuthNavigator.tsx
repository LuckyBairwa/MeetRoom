import React from 'react';

import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import HomeScreen from '../screens/HomeScreen';
import JoinMeetingScreen from '../screens/JoinMeetingScreen';
import MeetingRequestsScreen from '../screens/MeetingRequestsScreen';
import WaitingRoomScreen from '../screens/WaitingRoomScreen';
import RoomScreen from '../screens/RoomScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

const AuthNavigator = ({ isLoggedIn }: { isLoggedIn: boolean })  => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade_from_bottom',
      }}
      initialRouteName={isLoggedIn ? 'Home' : 'Login'}
    >
      <Stack.Screen name="Login" component={LoginScreen} />

      <Stack.Screen name="Signup" component={SignupScreen} />

      <Stack.Screen name="Home" component={HomeScreen} />

      <Stack.Screen name="JoinMeeting" component={JoinMeetingScreen} />

      <Stack.Screen name="MeetingRequests" component={MeetingRequestsScreen} />

      <Stack.Screen name="WaitingRoom" component={WaitingRoomScreen} />
      <Stack.Screen name="Room" component={RoomScreen} />
    </Stack.Navigator>
  );
};

export default AuthNavigator;
