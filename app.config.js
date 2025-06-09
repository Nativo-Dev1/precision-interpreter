// app.config.js
import 'dotenv/config';

export default ({ config }) => {
  const { expo = {} } = config;
  const { android = {}, ios = {}, web = {}, extra = {} } = expo;

  return {
    ...config,
    expo: {
      ...expo,
      name:    "Nativo Interpreter",
      slug:    "frontend",
      scheme:  "nativo",
      version: "1.0.55",
      plugins: ["expo-dev-client"],
      android: {
        ...android,
        package:           android.package    || "com.lornedev.nativo",
        versionCode:       (android.versionCode || 53) + 1,
        edgeToEdgeEnabled: android.edgeToEdgeEnabled ?? true,
        adaptiveIcon:      android.adaptiveIcon || {
          foregroundImage: "./assets/adaptive-icon.png",
          backgroundColor: "#ffffff"
        },
      },
      ios: {
        ...ios,
        bundleIdentifier: ios.bundleIdentifier || "com.lornedev.nativo",
        buildNumber:     ios.buildNumber     || "1.0.55",
      },
      web: {
        ...web,
        favicon: web.favicon || "./assets/favicon.png",
      },
      extra: {
        ...extra,
        // Always use your real backend URL
        BACKEND_URL: process.env.BACKEND_URL || "https://nativo-backend.onrender.com",
        // Sentry DSN if you need crash reporting
        SENTRY_DSN: process.env.SENTRY_DSN || "",
        eas: {
          projectId: "c67e99b4-c79e-4cbe-9dda-b546aa49538b"
        }
      }
    }
  };
};
