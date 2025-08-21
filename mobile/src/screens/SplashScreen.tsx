import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationProps } from '../shared/types';

const SplashScreen: React.FC<NavigationProps> = ({ navigation }) => {
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Check for stored user session and onboarding status
      const userSession = await AsyncStorage.getItem('userSession');
      const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');

      setTimeout(() => {
        if (userSession) {
          // User is logged in, go to home
          navigation.replace('Home');
        } else if (hasSeenOnboarding) {
          // Has seen onboarding but not logged in, go to signin
          navigation.replace('SignIn');
        } else {
          // First time user, start onboarding
          navigation.replace('Onboarding');
        }
      }, 2000);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setTimeout(() => {
        navigation.replace('Onboarding');
      }, 2000);
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/logo.png')}
        style={styles.logo}
        resizeMode="contain"
        defaultSource={require('../assets/logo.png')}
      />
      <Text style={styles.title}>BrillPrime</Text>
      <Text style={styles.subtitle}>Your Premium Service Platform</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E40AF',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#E5E7EB',
    textAlign: 'center',
  },
});

export default SplashScreen;