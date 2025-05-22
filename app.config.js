// app.config.js
export default ({ config }) => ({
  ...config,
  expo: {
    ...config.expo,
    name: "Nativo Interpreter",
    extra: {
      // This is your real backend
      BACKEND_URL: process.env.BACKEND_URL,

      // This line links to your EAS project
      eas: {
        projectId: "c67e99b4-c79e-4cbe-9dda-b546aa49538b"
      }
    }
  }
});
