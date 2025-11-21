import eslintrc from "./eslint.config.mjs";

export default eslintrc.map((config) => {
  if (config.ignores) {
    return config;
  }

  let newRules = {};

  if (config.rules) {
    for (const key of Object.keys(config.rules)) {
      newRules[key] =
        config.rules[key] === "warn" ? "error" : config.rules[key];
    }
  }
  newRules = {
    ...newRules,
    indent: "off",
    //    "no-restricted-globals": ["error", "console"],
  };

  return {
    ...config,
    rules: newRules,
  };
});
