import React, { createContext, useContext, useReducer } from 'react';

export const StateContext = createContext();

export const StateProvider = ({ reducer, initialState, children }) => {
  const reducerOutput = useReducer(reducer, initialState);
  // console.log('reducerOutput: ',reducerOutput);
  return <StateContext.Provider value={reducerOutput}>
    {children}
  </StateContext.Provider>
}

export const useStateValue = () => useContext(StateContext);