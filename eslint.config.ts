import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

import renorari from "./eslint/index";

export default defineConfig([
    { "ignores": ["src/generated/**"] },
    { "files": ["**/*.{js,mjs,cjs,ts,mts,cts}"], "plugins": { js }, "extends": ["js/recommended"], "languageOptions": { "globals": globals.node } },
    tseslint.configs.recommended,
    {
        "plugins": {
            "@renorari": renorari
        },
        "rules": {
            "func-style": [
                "error",
                "declaration",
                {
                    "allowArrowFunctions": false
                }
            ],
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    "argsIgnorePattern": "^_",
                    "caughtErrorsIgnorePattern": "^_",
                    "destructuredArrayIgnorePattern": "^_",
                    "varsIgnorePattern": "^_"
                }
            ],
            "linebreak-style": ["error", "unix"],
            "indent": ["error", 4, { "SwitchCase": 1 }],
            "quotes": ["error", "double"],
            "semi": ["error", "always"],
            "comma-dangle": ["error", "never"],
            "@renorari/no-unquoted-keys": "error"
        }
    }
]);
