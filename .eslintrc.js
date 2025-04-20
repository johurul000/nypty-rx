/** @type {import('eslint').Linter.Config} */
module.exports = {
    root: true,
    extends: [
      "next",
      "next/core-web-vitals",
      "eslint:recommended",
      "plugin:@typescript-eslint/recommended"
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",  // Allow use of `any`
      "no-unused-vars": "warn",                     // Warn instead of error
      "no-console": "off",                          // Allow console logs
    },
  };
  