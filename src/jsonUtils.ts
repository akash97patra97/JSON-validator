import React from "react";

export interface LintIssue {
  line: number;
  column: number;
  severity: "error" | "warning";
  message: string;
  fixSuggestion?: string;
  context?: string;
}

export interface ValidationResult {
  isValid: boolean;
  parsedObject: any | null;
  error: {
    message: string;
    line?: number;
    column?: number;
    position?: number;
  } | null;
  issues: LintIssue[];
}

/**
 * Parses raw JSON position to line and column
 */
export function getLineCol(str: string, index: number): { line: number; column: number } {
  const safeIndex = Math.max(0, Math.min(index, str.length));
  const sub = str.substring(0, safeIndex);
  const lines = sub.split("\n");
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
  };
}

/**
 * Lints JSON string to find issues that modern JS parser rejects
 */
export function performSmartLint(raw: string, errorPos: number | null): LintIssue[] {
  const issues: LintIssue[] = [];
  const lines = raw.split("\n");

  // 1. Check for Javascript style comments
  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;
    // Check single line comments
    if (/\/\/|(?<!:)\/\*/.test(lineText)) {
      if (!lineText.includes("http://") && !lineText.includes("https://")) {
        issues.push({
          line: lineNum,
          column: lineText.indexOf("//") + 1 || lineText.indexOf("/*") + 1,
          severity: "error",
          message: "Standard JSON does not support comments.",
          fixSuggestion: "Remove single-line '//' or multi-line '/*' comments.",
          context: lineText.trim(),
        });
      }
    }
  });

  // 2. Check for Single Quotes
  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;
    // Look for single quotes that wrap keys or values
    // regex checks for 'word' or 'something'
    const singleQuoteRegex = /'(.*?)'/g;
    let match;
    while ((match = singleQuoteRegex.exec(lineText)) !== null) {
      // Find out if the line already contains a double quoted string, avoid false positives inside normal strings
      const doubleQuotesCount = (lineText.substring(0, match.index).match(/"/g) || []).length;
      if (doubleQuotesCount % 2 === 0) {
        issues.push({
          line: lineNum,
          column: match.index + 1,
          severity: "error",
          message: `Single quotes are not allowed in JSON. You used: '${match[1]}'.`,
          fixSuggestion: `Replace '${match[1]}' with "${match[1]}".`,
          context: lineText.trim(),
        });
        break; // one warning per line is enough
      }
    }
  });

  // 3. Check for Trailing Commas
  // e.g. , followed by closing } or ] optionally with whitespaces/newlines between them
  const trailingCommaRegex = /,\s*([}\]])/g;
  let tMatch;
  while ((tMatch = trailingCommaRegex.exec(raw)) !== null) {
    const { line, column } = getLineCol(raw, tMatch.index);
    issues.push({
      line,
      column,
      severity: "error",
      message: "Trailing commas are not allowed in standard JSON.",
      fixSuggestion: "Remove the comma before the closing bracket or curly brace.",
      context: lines[line - 1]?.trim() || "",
    });
  }

  // 4. Check for Unquoted Keys
  // E.g. { key: "value" } or {key: 123} instead of {"key": "value"}
  // Looking for keys that start after '{' or ',' and are alpha-numeric words not wrapped in quotes
  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;
    const unquotedKeyRegex = /(?:[{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g;
    let uMatch;
    while ((uMatch = unquotedKeyRegex.exec(lineText)) !== null) {
      const keyName = uMatch[1];
      if (keyName !== "true" && keyName !== "false" && keyName !== "null") {
        issues.push({
          line: lineNum,
          column: lineText.indexOf(keyName) + 1,
          severity: "error",
          message: `Keys must be double-quoted in JSON. You have unquoted key: ${keyName}`,
          fixSuggestion: `Add double quotes around your key: "${keyName}"`,
          context: lineText.trim(),
        });
      }
    }
  });

  // 5. Check for capitalization of true, false, null
  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;
    const badCaps = [/\bTrue\b/g, /\bFalse\b/g, /\bNull\b/g];
    badCaps.forEach((regex, rIdx) => {
      let m;
      while ((m = regex.exec(lineText)) !== null) {
        const word = m[0];
        issues.push({
          line: lineNum,
          column: m.index + 1,
          severity: "error",
          message: `JSON is case-sensitive. Value '${word}' must be lowercase.`,
          fixSuggestion: `Change '${word}' to '${word.toLowerCase()}'.`,
          context: lineText.trim(),
        });
      }
    });
  });

  // 6. Check for Special Numbers/NaN/Infinity/undefined
  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;
    const badValues = [/\bNaN\b/g, /\bInfinity\b/g, /\bundefined\b/g];
    badValues.forEach((regex) => {
      let m;
      while ((m = regex.exec(lineText)) !== null) {
        const term = m[0];
        issues.push({
          line: lineNum,
          column: m.index + 1,
          severity: "error",
          message: `Value '${term}' is not a valid JSON value. JSON only supports numbers, strings, booleans, objects, arrays, and null.`,
          fixSuggestion: `Wrap in double quotes to make it a string, or replace with null/valid value.`,
          context: lineText.trim(),
        });
      }
    });
  });

  // If there's a parse error index, and we didn't find specific issues, add at least the specific exception line
  if (errorPos !== null && issues.length === 0) {
    const { line, column } = getLineCol(raw, errorPos);
    issues.push({
      line,
      column,
      severity: "error",
      message: "Syntax error detected near this position.",
      fixSuggestion: "Review keys, values, matching brackets, or missing commas.",
      context: lines[line - 1]?.trim() || "",
    });
  }

  // Deduplicate issues on the same line with same message
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.line}:${issue.column}:${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Validates JSON string and returns structured diagnostics
 */
export function validateJSON(raw: string): ValidationResult {
  const result: ValidationResult = {
    isValid: false,
    parsedObject: null,
    error: null,
    issues: [],
  };

  const trimmed = raw.trim();
  if (!trimmed) {
    result.error = { message: "Input is empty." };
    return result;
  }

  try {
    const parsed = JSON.parse(trimmed);
    result.isValid = true;
    result.parsedObject = parsed;

    // Check warnings even if parse succeeded (like checking for excessive nesting, or potentially strange keys)
    // For valid JSON, no errors from performSmartLint should be present, but some warnings could theoretically exist.
    return result;
  } catch (err: any) {
    const message = err.message || "Unknown JSON syntax error";
    let positionOfError: number | null = null;
    let line: number | undefined;
    let column: number | undefined;

    // Extract exact index position if available
    const posMatch = message.match(/at position (\d+)/i);
    if (posMatch) {
      positionOfError = parseInt(posMatch[1], 10);
      const loc = getLineCol(raw, positionOfError);
      line = loc.line;
      column = loc.column;
    } else {
      // Find position of syntax error on browser
      // E.g. Chrome says `Unexpected token } in JSON at position 122`
      // Safari/Firefox might say `JSON.parse: unexpected character at line 1 column 6 of the JSON data`
      const lineColMatch = message.match(/line (\d+)\s+column\s+(\d+)/i);
      if (lineColMatch) {
        line = parseInt(lineColMatch[1], 10);
        column = parseInt(lineColMatch[2], 10);
        // compute mock raw position
        const lines = raw.split("\n");
        let offset = 0;
        for (let i = 0; i < line - 1; i++) {
          offset += lines[i].length + 1; // plus newline
        }
        offset += (column - 1);
        positionOfError = offset;
      }
    }

    result.error = {
      message,
      line,
      column,
      position: positionOfError ?? undefined,
    };

    result.issues = performSmartLint(raw, positionOfError);
    return result;
  }
}

/**
 * Quick JSON Schema Evaluator
 */
export interface SchemaIssue {
  path: string;
  message: string;
  expected: string;
  actual: string;
}

export function validateSchema(jsonObj: any, schemaObj: any, currentPath: string = "root"): SchemaIssue[] {
  const issues: SchemaIssue[] = [];

  if (!schemaObj || typeof schemaObj !== "object") {
    return issues;
  }

  const { type, required, properties, items, minimum, maximum, minLength, maxLength, minItems, maxItems } = schemaObj;

  // 1. Type validation
  const actualType = jsonObj === null ? "null" : Array.isArray(jsonObj) ? "array" : typeof jsonObj;

  if (type) {
    if (actualType !== type) {
      issues.push({
        path: currentPath,
        message: `Value must be of type '${type}' but found '${actualType}'.`,
        expected: type,
        actual: actualType,
      });
      return issues; // no need to check further constraints if type mismatch
    }
  }

  // 2. Object Properties check
  if (actualType === "object" && properties) {
    // Check required properties
    if (required && Array.isArray(required)) {
      required.forEach((reqProp: string) => {
        if (!(reqProp in jsonObj)) {
          issues.push({
            path: `${currentPath}.${reqProp}`,
            message: `Property '${reqProp}' is required but is missing.`,
            expected: "present",
            actual: "missing",
          });
        }
      });
    }

    // Recursively check properties
    for (const key in properties) {
      if (key in jsonObj) {
        const subIssues = validateSchema(jsonObj[key], properties[key], `${currentPath}.${key}`);
        issues.push(...subIssues);
      }
    }
  }

  // 3. Array Items check
  if (actualType === "array") {
    // Length constraints
    if (minItems !== undefined && jsonObj.length < minItems) {
      issues.push({
        path: currentPath,
        message: `Array has ${jsonObj.length} items, but schema requires at least ${minItems}.`,
        expected: `>= ${minItems} items`,
        actual: `${jsonObj.length} items`,
      });
    }
    if (maxItems !== undefined && jsonObj.length > maxItems) {
      issues.push({
        path: currentPath,
        message: `Array has ${jsonObj.length} items, but schema permits at most ${maxItems}.`,
        expected: `<= ${maxItems} items`,
        actual: `${jsonObj.length} items`,
      });
    }

    // Check standard array items
    if (items) {
      jsonObj.forEach((val: any, idx: number) => {
        const subIssues = validateSchema(val, items, `${currentPath}[${idx}]`);
        issues.push(...subIssues);
      });
    }
  }

  // 4. Numerical constraints
  if (actualType === "number") {
    if (minimum !== undefined && jsonObj < minimum) {
      issues.push({
        path: currentPath,
        message: `Value '${jsonObj}' is less than the minimum permitted value (${minimum}).`,
        expected: `>= ${minimum}`,
        actual: String(jsonObj),
      });
    }
    if (maximum !== undefined && jsonObj > maximum) {
      issues.push({
        path: currentPath,
        message: `Value '${jsonObj}' exceeds the maximum permitted value (${maximum}).`,
        expected: `<= ${maximum}`,
        actual: String(jsonObj),
      });
    }
  }

  // 5. String length constraints
  if (actualType === "string") {
    if (minLength !== undefined && jsonObj.length < minLength) {
      issues.push({
        path: currentPath,
        message: `String length is ${jsonObj.length} chars, must be at least ${minLength}.`,
        expected: `>= ${minLength} chars`,
        actual: `${jsonObj.length} chars`,
      });
    }
    if (maxLength !== undefined && jsonObj.length > maxLength) {
      issues.push({
        path: currentPath,
        message: `String length is ${jsonObj.length} chars, must be at most ${maxLength}.`,
        expected: `<= ${maxLength} chars`,
        actual: `${jsonObj.length} chars`,
      });
    }
  }

  return issues;
}

/**
 * Filter JSON by path name (simple query support)
 * E.g. "profile.firstName" or "roles[0]"
 */
export function queryByPath(obj: any, pathStr: string): any {
  if (!pathStr || pathStr.trim() === "") return obj;

  // Normalize path segments: change .property and [index] to paths
  // e.g. "users[0].name" -> ["users", "0", "name"]
  const cleaned = pathStr
    .replace(/\[(\w+)\]/g, ".$1")
    .replace(/^\./, ""); // remove leading dots

  const segments = cleaned.split(".");
  let current = obj;

  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }
    // query is index or key
    if (Array.isArray(current)) {
      const idx = parseInt(segment, 10);
      if (isNaN(idx)) {
        // try querying by object property name if standard array contains matching keys
        // or support projection like "inventory.name" on an array of inventories!
        // This is extremely convenient: "inventory.sku" returns an array of skus!
        const projected = current.map((item) => (item ? item[segment] : undefined)).filter(v => v !== undefined);
        if (projected.length > 0) {
          current = projected;
          continue;
        }
        return undefined;
      }
      current = current[idx];
    } else if (typeof current === "object") {
      current = current[segment];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Formats standard output with space/tabs
 */
export function formatJSON(obj: any, spaceType: "2" | "4" | "tab" | "compress"): string {
  if (spaceType === "compress") {
    return JSON.stringify(obj);
  }
  const spaceVal = spaceType === "tab" ? "\t" : parseInt(spaceType, 10);
  return JSON.stringify(obj, null, spaceVal);
}

/**
 * Simple Escape or Unescaped helper
 */
export function escapeString(str: string): string {
  return JSON.stringify(str).slice(1, -1);
}

export function unescapeString(str: string): string {
  try {
    // Wrap in double quotes to parse correctly
    return JSON.parse(`"${str}"`);
  } catch {
    return str;
  }
}

/**
 * Attempts to automatically repair common syntax anomalies in malformed JSON files.
 */
export function autoFixJSON(raw: string): string {
  let fixed = raw;

  // 1. Strip Javascript block comments /* ... */
  fixed = fixed.replace(/\/\*[\s\S]*?\*\//g, "");

  // 2. Strip single-line comments //, preserving web links
  fixed = fixed.split("\n").map(line => {
    // Check if the line has a comment sequence
    const commentIdx = line.indexOf("//");
    if (commentIdx !== -1) {
      // Don't strip if it is part of http:// or https:// unless preceded by spaces
      const beforeComment = line.substring(0, commentIdx);
      if (!beforeComment.match(/https?:$/i)) {
        return beforeComment;
      }
    }
    return line;
  }).join("\n");

  // 3. Convert single quoted string values to double quotes
  // Match key values or array primitives, like : 'string' or , 'string'
  fixed = fixed.replace(/(:\s*)'([\s\S]*?)'/g, '$1"$2"');
  fixed = fixed.replace(/(,\s*)'([\s\S]*?)'/g, '$1"$2"');
  fixed = fixed.replace(/(\[\s*)'([\s\S]*?)'/g, '$1"$2"');

  // 4. Convert single quoted keys to double quotes
  // Match 'key': or {'key':
  fixed = fixed.replace(/([{\s,]+)'([a-zA-Z0-9_\-]+)'\s*:/g, '$1"$2":');

  // 5. Double quote unquoted keys
  fixed = fixed.replace(/([{\s,]+)([a-zA-Z_][a-zA-Z0-9_-]*)\s*:/g, (match, p1, p2) => {
    if (["true", "false", "null"].includes(p2)) {
      return match;
    }
    return `${p1}"${p2}":`;
  });

  // 6. Fix casing mismatch for true/false/null
  fixed = fixed.replace(/\bTrue\b/g, "true");
  fixed = fixed.replace(/\bFalse\b/g, "false");
  fixed = fixed.replace(/\bNull\b/g, "null");

  // 7. Strip trailing commas before closing braces/brackets
  fixed = fixed.replace(/,\s*([}\]])/g, "$1");

  // Try formatting it to be neat
  try {
    const parsed = JSON.parse(fixed);
    return JSON.stringify(parsed, null, 2);
  } catch {
    // If it still has syntax errors, return the best-effort fixed text
    return fixed;
  }
}

