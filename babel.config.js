module.exports = function (api) {
  api.cache(true);
  const presets = ['babel-preset-expo'];
  if (process.env.NODE_ENV !== 'test') {
    presets.push('nativewind/babel');
  }
  return {
    presets,
    plugins: [
      // The worklets plugin MUST be last. From Reanimated 4 it lives in
      // `react-native-worklets`; `react-native-reanimated/plugin` is now a
      // one-line re-export, so naming the real package means the day that shim
      // is dropped is not the day every animation silently stops working.
      'react-native-worklets/plugin',
    ],
  };
};
