// app.config.js

// load .env into process.env at config time
require('dotenv/config');

export default ({ config }) => {
  const { expo = {} }   = config;
  const { android = {}, ios = {}, web = {}, extra = {} } = expo;

  return {
    ...config,
    expo: {
      ...expo,

      // App identity
      name:    "Nativo Interpreter",
      slug:    "frontend",
      version: "1.0.76",
      scheme:  "nativo",

      // Plugins
      plugins: [
        "expo-dev-client",
        "expo-in-app-purchases"
      ],

      // Android build settings
      android: {
        ...android,
        package:           android.package    || "com.lornedev.nativo",
        versionCode:       (android.versionCode || 75) + 1,
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
