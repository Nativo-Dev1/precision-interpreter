// app.config.js

import 'dotenv/config';

export default ({ config }) => {
  const { expo = {} } = config;
  const { android = {}, ios = {}, extra = {} } = expo;

  return {
    ...config,
    expo: {
      ...expo,

      // App identity
      name:    "Nativo Interpreter",
      slug:    "nativo-interpreter",
      version: "1.0.51",                        // bump this when you publish
      scheme:  "nativo",

      // Plugins
      plugins: [
        "expo-dev-client"
      ],

      // Android-specific
      android: {
        ...android,
        package:            android.package    || "com.lornedev.nativo",
        versionCode:        (android.versionCode || 52) + 1,
        edgeToEdgeEnabled:  android.edgeToEdgeEnabled ?? true,
        adaptiveIcon:       android.adaptiveIcon || {
          foregroundImage: "./assets/adaptive-icon.png",
          backgroundColor: "#ffffff"
        },
      },

      // iOS-specific
      ios: {
        ...ios,
        bundleIdentifier: ios.bundleIdentifier || "com.lornedev.nativo",
        buildNumber:      ios.buildNumber     || "1.0.50",
      },

      // Web fallback (optional)
      web: {
        ...expo.web,
        favicon: expo.web?.favicon || "./assets/favicon.png",
      },

      // Environment variables accessible at runtime
      extra: {
        ...extra,
        BACKEND_URL: process.env.BACKEND_URL,
        SENTRY_DSN:  process.env.SENTRY_DSN,
        eas: {
          projectId: extra.eas?.projectId || "c67e99b4-c79e-4cbe-9dda-b546aa49538b"
        }
      }
    }
  };
};
