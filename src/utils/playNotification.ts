import Sound from 'react-native-sound';

export const playNotification = () => {
  const sound = new Sound('notification.mp3', Sound.MAIN_BUNDLE, error => {
    if (error) {
      return;
    }

    sound.play(() => {
      sound.release();
    });
  });
};
