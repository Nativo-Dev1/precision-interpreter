// metro.config.js
const { getDefaultConfig } = require('@expo/metro-config');

// pull in Expo's defaults and point it at this directory
module.exports = getDefaultConfig(__dirname);
