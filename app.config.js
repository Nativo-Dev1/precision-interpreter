// app.config.js

export default ({ config }) => {
  const expo = config.expo || {};
  const android = expo.android || {};

  return {
    ...config,
    expo: {
      ...expo,

      // App identity
      name: "Nativo Interpreter",
      slug: "frontend",         // must match your EAS project slug
      version: "1.0.38",

      // Plugins
      plugins: [
        "expo-dev-client",
        // ...add other plugins here if you have them
      ],

      android: {
        ...android,
        package: android.package || "com.lornedev.frontend",
        versionCode: 39,
        adaptiveIcon: android.adaptiveIcon || {
          foregroundImage: "./assets/adaptive-icon.png",
          backgroundColor: "#ffffff"
        },
        edgeToEdgeEnabled: android.edgeToEdgeEnabled ?? true,
      },

      // Pass extra values into your JS via Constants.manifest
      extra: {
        ...(expo.extra || {}),
        BACKEND_URL: process.env.BACKEND_URL,
        eas: {
          projectId: "c67e99b4-c79e-4cbe-9dda-b546aa49538b"
        },
      },
    },
  };
};
