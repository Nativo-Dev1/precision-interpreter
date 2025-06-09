// src/config/linking.js
import * as Linking from 'expo-linking';

export default {
  prefixes: [Linking.createURL('/'), 'nativo://'],
  config: {
    screens: {
      AuthStack: {
        initialRouteName: 'Login',
        screens: {
          Login:        'login',
          Register:     'register',
          ConfirmEmail: 'confirm-email',   // handles nativo://confirm-email?token=…&email=…
          ResetPassword:'reset-password'   // handles nativo://reset-password?…
        }
      },
      AppTabs: {
        screens: {
          Home:     'home',
          Camera:   'camera',
          History:  'history',
          Settings: 'settings',
          About:    'about'
        }
      }
    }
  }
};
