// app.config.js

import 'dotenv/config';

export default ({ config }) => {
  const { expo = {} }   = config;
  const { android = {}, ios = {}, web = {}, extra = {} } = expo;

  return {
    ...config,
    expo: {
      ...expo,

      // App identity
      name:    "Nativo Interpreter",
      slug:    "frontend",            // match your existing Expo project
      version: "1.0.53",              // bump when you publish
      scheme:  "nativo",

      // Plugins
      plugins: [
        "expo-dev-client"
      ],

      // Android build settings
      android: {
        ...android,
        package:           android.package    || "com.lornedev.nativo",
        versionCode:       (android.versionCode || 52) + 1,
        edgeToEdgeEnabled: android.edgeToEdgeEnabled ?? true,
        adaptiveIcon:      android.adaptiveIcon || {
          foregroundImage: "./assets/adaptive-icon.png",
          backgroundColor: "#ffffff"
        },
      },

      // iOS build settings
      ios: {
        ...ios,
        bundleIdentifier: ios.bundleIdentifier || "com.lornedev.nativo",
        buildNumber:     ios.buildNumber     || "1.0.53",
      },

      // Web fallback
      web: {
        ...web,
        favicon: web.favicon || "./assets/favicon.png",
      },

      // Runtime env + EAS linkage
      extra: {
        ...extra,
        BACKEND_URL: process.env.BACKEND_URL,
        SENTRY_DSN:  process.env.SENTRY_DSN,
        eas: {
          projectId: "c67e99b4-c79e-4cbe-9dda-b546aa49538b"
        }
      }
    }
  };
};

