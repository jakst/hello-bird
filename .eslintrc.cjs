const disableOverZealousRules = {
  "no-empty": "off",
  "no-unused-vars": "off",

  "@typescript-eslint/no-unused-vars": "off",
  "@typescript-eslint/no-empty-function": "off",
  "@typescript-eslint/no-empty-interface": "off",
  "@typescript-eslint/no-floating-promises": "off",
  "@typescript-eslint/no-explicit-any": "off",
  "@typescript-eslint/no-unsafe-argument": "off",
  "@typescript-eslint/no-non-null-assertion": "off",
  "@typescript-eslint/restrict-template-expressions": "off",
  "@typescript-eslint/require-await": "off",

  // These don't seem to work properly across package boundaries
  "@typescript-eslint/no-unsafe-member-access": "off",
  "@typescript-eslint/no-unsafe-call": "off",
  "@typescript-eslint/no-unsafe-assignment": "off",
};

module.exports = {
  ignorePatterns: [
    "node_modules",
    "dist",
    ".cache",
    ".solid",
    ".turbo",
    ".vercel",
    ".eslintrc.cjs",
    "postcss.config.cjs",
    "tailwind.config.cjs",
    "vite.config.ts",
  ],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
  ],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  root: true,
  parserOptions: {
    tsconfigRootDir: ".",
    project: ["./packages/*/tsconfig.json"],
  },
  rules: {
    "object-shorthand": "warn",
    "@typescript-eslint/switch-exhaustiveness-check": "warn",

    ...disableOverZealousRules,
  },
};
