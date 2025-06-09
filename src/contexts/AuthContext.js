// src/contexts/AuthContext.js
import React from 'react';

export const AuthContext = React.createContext({
  userToken: null,
  setUserToken: () => {},
});
