import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationProps } from '../shared/types';
import { useAuth } from '../hooks/useAuth';

const SignUpScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const { signUp, isLoading } = useAuth();
  const [isSocialLoading, setIsLoading] = useState(false);

  const handleSignUp = async () => {
    if (!formData.fullName || !formData.email || !formData.phone || !formData.password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    // Get selected role from AsyncStorage
    const selectedRole = await AsyncStorage.getItem('selectedRole') || 'CONSUMER';
    const signUpData = { ...formData, role: selectedRole };

    const result = await signUp(signUpData);
    if (result.success) {
      // Store email for OTP verification
      await AsyncStorage.setItem('verification-email', formData.email);
      Alert.alert('Success', 'Account created successfully! Please verify your email.');
      navigation.navigate('OTPVerification', { 
        email: formData.email, 
        verificationType: 'email' 
      });
    } else {
      Alert.alert('Sign Up Failed', result.error || 'Please try again');
    }
  };

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSocialLogin = async (provider: 'google' | 'apple' | 'facebook') => {
    try {
      setIsLoading(true);

      const response = await fetch('/api/social-auth/social-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
        }),
      });

      const data = await response.json();

      if (data.success && data.user) {
        // Store user data
        await AsyncStorage.setItem('user', JSON.stringify(data.user));

        // Navigate to role selection if role not set, otherwise to dashboard
        if (!data.user.role || data.user.role === 'CONSUMER') {
          navigation.replace('RoleSelection');
        } else {
          navigation.replace('Home');
        }
      } else {
        Alert.alert('Sign Up Failed', data.message || `${provider} signup failed`);
      }
    } catch (error) {
      console.error(`${provider} signup error:`, error);
      Alert.alert('Sign Up Failed', `${provider} signup failed. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>Join thousands of satisfied users</Text>

      <TextInput
        style={styles.input}
        placeholder="Full Name"
        value={formData.fullName}
        onChangeText={(value) => updateField('fullName', value)}
      />

      <TextInput
        style={styles.input}
        placeholder="Email Address"
        value={formData.email}
        onChangeText={(value) => updateField('email', value)}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Phone Number"
        value={formData.phone}
        onChangeText={(value) => updateField('phone', value)}
        keyboardType="phone-pad"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={formData.password}
        onChangeText={(value) => updateField('password', value)}
        secureTextEntry
      />

      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        value={formData.confirmPassword}
        onChangeText={(value) => updateField('confirmPassword', value)}
        secureTextEntry
      />

      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleSignUp}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </Text>
      </TouchableOpacity>

      {/* Social Login Buttons */}
      <View style={styles.socialLoginContainer}>
        <TouchableOpacity
          style={[styles.socialButton, styles.googleButton]}
          onPress={() => handleSocialLogin('google')}
          disabled={isSocialLoading}
        >
          <Text style={styles.socialButtonText}>Sign Up with Google</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.socialButton, styles.appleButton]}
          onPress={() => handleSocialLogin('apple')}
          disabled={isSocialLoading}
        >
          <Text style={styles.socialButtonText}>Sign Up with Apple</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.socialButton, styles.facebookButton]}
          onPress={() => handleSocialLogin('facebook')}
          disabled={isSocialLoading}
        >
          <Text style={styles.socialButtonText}>Sign Up with Facebook</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.termsText}>
        By creating an account you agree to our{' '}
        <Text style={styles.termsLink}>terms of service</Text>
        {' '}and{' '}
        <Text style={styles.termsLink}>privacy policy</Text>
      </Text>

      <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
        <Text style={styles.linkText}>Already have an account? Sign In</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentContainer: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4682b4',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  input: {
    borderWidth: 1,
    borderColor: '#4682b4',
    borderRadius: 25,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#4682b4',
    borderRadius: 25,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  socialLoginContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  socialButton: {
    borderRadius: 25,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  googleButton: {
    backgroundColor: '#DB4437',
  },
  appleButton: {
    backgroundColor: '#000000',
  },
  facebookButton: {
    backgroundColor: '#1877F2',
  },
  socialButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  termsText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  termsLink: {
    color: '#4682b4',
    textDecorationLine: 'underline',
  },
  linkText: {
    color: '#4682b4',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
});

export default SignUpScreen;