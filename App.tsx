


import {  StyleSheet,  View,Text } from 'react-native';


function App() {

  return (
    <View style={styles.container}>
      <Text style={styles.txt}>MeetRoom</Text>
    </View>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ff0000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  txt:{
    color:'#fff',
    fontSize:50,
     fontWeight:'bold'
  }
});

export default App;
