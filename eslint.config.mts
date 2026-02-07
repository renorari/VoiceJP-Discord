import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

import js from "@eslint/js";

import renorari from "./eslint/index.ts";

export default defineConfig([
    {
        "files": [
            "**/*.{js,mjs,cjs,ts,mts,cts}"
        ],
        "plugins": {
            js,
            "@renorari": renorari
        },
        "extends": [
            "js/recommended"
        ],
        "languageOptions": {
            "globals": {
                ...globals.browser,
                ...globals.node
            }
        },
        "rules": {
            "no-unused-vars": [
                "error",
                {
                    "argsIgnorePattern": "^_",
                    "caughtErrorsIgnorePattern": "^_",
                    "destructuredArrayIgnorePattern": "^_",
                    "varsIgnorePattern": "^_"
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
    },
    tseslint.configs.recommended
]);
