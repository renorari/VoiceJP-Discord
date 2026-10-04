/*
    No unquoted keys in objects
*/

import { type Rule } from "eslint";

const rule: Rule.RuleModule = {
    "meta": {
        "type": "suggestion",
        "docs": {
            "description": "disallow unquoted keys in objects",
            "category": "Best Practices",
            "recommended": false
        },
        "fixable": "code",
        "schema": []
    },
    "create": function (context) {
        return {
            "Property"(node) {
                if (!node.computed && node.key.type === "Identifier") {
                    if (node.parent.type === "ObjectPattern") {
                        return;
                    }
                    if (node.shorthand) {
                        return;
                    }
                    context.report({
                        "node": node.key,
                        "message": "Unquoted key \"{{ key }}\" found.",
                        "data": {
                            "key": node.key.name
                        },
                        "fix": function (fixer) {
                            const keyText = context.sourceCode.getText(node.key);
                            return fixer.replaceText(node.key, `"${keyText}"`);
                        }
                    });
                }
            }
        };
    }
};

export default rule;
