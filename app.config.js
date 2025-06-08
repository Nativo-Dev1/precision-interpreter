// app.config.js

export default ({ config }) => {
  const expo    = config.expo  || {};
  const android= expo.android || {};

  return {
    ...config,
    expo: {
      ...expo,
      name:    "Nativo Interpreter",
      slug:    "frontend",
      version: "1.0.49",

      scheme: "nativo",

      plugins: [
        "expo-dev-client"
      ],

      android: {
        ...android,
        package:        android.package     || "com.lornedev.frontend",
        versionCode:    (android.versionCode||48) + 1,
        edgeToEdgeEnabled: android.edgeToEdgeEnabled ?? true,
        adaptiveIcon:   android.adaptiveIcon || {
          foregroundImage: "./assets/adaptive-icon.png",
          backgroundColor: "#ffffff"
        },
      },

      ios: {
        ...expo.ios,
        bundleIdentifier: expo.ios?.bundleIdentifier || "com.lornedev.nativo",
      },

      extra: {
        ...(expo.extra||{}),
        BACKEND_URL: process.env.BACKEND_URL,
        eas: {
          projectId: "c67e99b4-c79e-4cbe-9dda-b546aa49538b"
        },
      },
    },
  };
};
