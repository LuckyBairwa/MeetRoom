import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './src/config/firebase';
import AuthNavigator from './src/navigation/AuthNavigator';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);


  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setIsLoggedIn(!!user);
    });
    return unsub; // cleanup
  }, []);

  // Auth check ho raha hai — loading spinner dikhao
  if (isLoggedIn === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050816' }}>
        <ActivityIndicator size="large" color="#A855F7" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <AuthNavigator isLoggedIn={isLoggedIn} />
    </NavigationContainer>
  );
}


export default App;
