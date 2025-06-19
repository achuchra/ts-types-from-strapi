#!/usr/bin/env node

/**
 * Generate TypeScript interfaces for frontend from Strapi content types
 *
 * Usage:
 *   node generate-types.ts [backend-types-path] [frontend-types-path]
 *
 * Arguments:
 *   backend-types-path   Path to Strapi generated content types (default: ../backend/types/generated/contentTypes.d.ts)
 *   frontend-types-path  Path to output frontend types (default: ../frontend/src/types/strapi.ts)
 *
 * Examples:
 *   node generate-types.ts
 *   node generate-types.ts ./backend/types/generated/contentTypes.d.ts ./frontend/src/types/strapi.ts
 *   node generate-types.ts /path/to/backend/types.d.ts /path/to/frontend/types.ts
 */
"use strict";
import fs from "fs";
import path from "path";

interface Attribute {
  name: string;
  type: string;
  required: boolean;
}

interface ParsedInterface {
  name: string;
  attributes: Attribute[];
}

// Show help if requested
if (process.argv.includes("-h") || process.argv.includes("--help")) {
  console.log(`
Generate TypeScript interfaces for frontend from Strapi content types

Usage:
  node generate-types.ts [backend-types-path] [frontend-types-path]

Arguments:
  backend-types-path   Path to Strapi generated content types (default: ../backend/types/generated/contentTypes.d.ts)
  frontend-types-path  Path to output frontend types (default: ../frontend/src/types/strapi.ts)

Examples:
  node generate-types.ts
  node generate-types.ts ./backend/types/generated/contentTypes.d.ts ./frontend/src/types/strapi.ts
  node generate-types.ts /path/to/backend/types.d.ts /path/to/frontend/types.ts
`);
  process.exit(0);
}

// Get paths from command line arguments or use defaults
const args = process.argv.slice(2);
const BACKEND_TYPES_PATH =
  args[0] ||
  path.join(__dirname, "../backend/types/generated/contentTypes.d.ts");
const FRONTEND_TYPES_PATH =
  args[1] || path.join(__dirname, "../frontend/src/types/strapi.ts");

function convertTypeNameToPascalCase(typeName: string): string {
  return typeName
    .split("::")
    .map((part) =>
      part
        .split(/[-.]/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join("")
    )
    .join("");
}

function transformAttributeType(attributeType: string): string {
  // Handle enumeration types first (before cleaning)
  if (attributeType.includes("Schema.Attribute.Enumeration")) {
    // Handle both single-line and multi-line enumerations, ignoring everything after &
    const enumMatch = attributeType.match(/Enumeration<\s*\[([^\]]+)\]\s*>/);
    if (enumMatch && enumMatch[1]) {
      // Clean up the enumeration values and convert to TypeScript union type
      const enumValues = enumMatch[1]
        .replace(/\s+/g, " ") // Replace multiple whitespace with single space
        .replace(/,\s*/g, " | ") // Convert commas to union operators
        .trim();
      return enumValues;
    }
    return "string";
  }

  // Handle relation types (before cleaning)
  if (attributeType.includes("Schema.Attribute.Relation")) {
    const relationMatch = attributeType.match(
      /Relation<'([^']+)',\s*'([^']+)'/
    );
    if (relationMatch && relationMatch[1] && relationMatch[2]) {
      const relationType = relationMatch[1];
      const targetType = relationMatch[2];

      // Convert to proper TypeScript type name
      const typeName = convertTypeNameToPascalCase(targetType);

      // Handle one-to-many and many-to-many relations as arrays
      if (relationType === "oneToMany" || relationType === "manyToMany") {
        return `${typeName}[]`;
      }
      return typeName;
    }
    return "any";
  }

  // Handle JSON types with default values
  if (attributeType.includes("Schema.Attribute.JSON")) {
    // Check for array default values
    if (
      attributeType.includes("DefaultTo<'[]'>") ||
      attributeType.includes("DefaultTo<[]>")
    ) {
      return "any[]";
    }
    // Check for object default values
    if (
      attributeType.includes("DefaultTo<'{}'>") ||
      attributeType.includes("DefaultTo<{}>")
    ) {
      return "Record<string, any>";
    }
    // Default to Record for JSON types
    return "Record<string, any>";
  }

  // Handle basic types
  if (attributeType.includes("Schema.Attribute.String")) {
    return "string";
  }
  if (attributeType.includes("Schema.Attribute.Email")) {
    return "string";
  }
  if (attributeType.includes("Schema.Attribute.Password")) {
    return "string";
  }
  if (attributeType.includes("Schema.Attribute.Text")) {
    return "string";
  }
  if (attributeType.includes("Schema.Attribute.Integer")) {
    return "number";
  }
  if (attributeType.includes("Schema.Attribute.BigInteger")) {
    return "number";
  }
  if (attributeType.includes("Schema.Attribute.Decimal")) {
    return "number";
  }
  if (attributeType.includes("Schema.Attribute.Boolean")) {
    return "boolean";
  }
  if (attributeType.includes("Schema.Attribute.DateTime")) {
    return "string";
  }

  return "any";
}

function parseAttributes(attributesContent: string): Attribute[] {
  const attributes: Attribute[] = [];

  // More sophisticated parsing to handle nested structures properly
  // Split the content into potential attribute definitions
  const lines = attributesContent
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line);

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Check if this line starts an attribute definition (word followed by colon)
    const attrMatch = line?.match(/^(\w+):\s*(.*)/);
    if (attrMatch && attrMatch[1] && attrMatch[2]) {
      const attrName = attrMatch[1];
      let attrType = attrMatch[2];
      i++;

      // Continue reading lines until we find a line that ends with semicolon
      // and we've balanced all brackets/braces/angles
      let openAngle =
        (attrType.match(/</g) || []).length -
        (attrType.match(/>/g) || []).length;
      let openBrace =
        (attrType.match(/\{/g) || []).length -
        (attrType.match(/\}/g) || []).length;
      let openBracket =
        (attrType.match(/\[/g) || []).length -
        (attrType.match(/\]/g) || []).length;

      while (
        i < lines.length &&
        (!attrType.endsWith(";") ||
          openAngle > 0 ||
          openBrace > 0 ||
          openBracket > 0)
      ) {
        const nextLine = lines[i];
        attrType += " " + nextLine;

        // Update counts
        openAngle +=
          (nextLine?.match(/</g) || []).length -
          (nextLine?.match(/>/g) || []).length;
        openBrace +=
          (nextLine?.match(/\{/g) || []).length -
          (nextLine?.match(/\}/g) || []).length;
        openBracket +=
          (nextLine?.match(/\[/g) || []).length -
          (nextLine?.match(/\]/g) || []).length;

        i++;
      }

      // Clean up the attribute type
      attrType = attrType.replace(/;$/, "").replace(/\s+/g, " ").trim();

      // Skip private attributes
      if (attrType.includes("Schema.Attribute.Private")) {
        continue;
      }

      // Check if required
      const isRequired = attrType.includes("Schema.Attribute.Required");

      // Transform the type
      const transformedType = transformAttributeType(attrType);

      attributes.push({
        name: attrName,
        type: transformedType,
        required: isRequired,
      });
    } else {
      // Skip lines that don't start attribute definitions
      i++;
    }
  }

  return attributes;
}

function generateTypes(): void {
  try {
    // Validate input file exists
    if (!fs.existsSync(BACKEND_TYPES_PATH)) {
      throw new Error(`Backend types file not found: ${BACKEND_TYPES_PATH}`);
    }

    // Ensure output directory exists
    const outputDir = path.dirname(FRONTEND_TYPES_PATH);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`Reading backend types from: ${BACKEND_TYPES_PATH}`);
    console.log(`Writing frontend types to: ${FRONTEND_TYPES_PATH}`);

    // Read the backend types file
    const backendContent = fs.readFileSync(BACKEND_TYPES_PATH, "utf8");

    // Split content by interfaces using a more robust approach
    const interfaceRegex = /export interface (\w+)[^{]*\{([\s\S]*?)\n\}/g;
    const interfaces: ParsedInterface[] = [];
    let match: RegExpExecArray | null;

    while ((match = interfaceRegex.exec(backendContent)) !== null) {
      if (match[1] && match[2]) {
        const interfaceName = match[1];
        const interfaceContent = match[2];

        // Find attributes section
        const attributesMatch = interfaceContent.match(
          /attributes:\s*\{([\s\S]*?)\s*\};?\s*$/m
        );
        if (!attributesMatch || !attributesMatch[1]) {
          continue;
        }

        const attributesContent = attributesMatch[1];
        const attributes = parseAttributes(attributesContent);

        if (attributes.length > 0) {
          interfaces.push({
            name: interfaceName,
            attributes,
          });
        }
      }
    }

    // Generate TypeScript interfaces
    const generatedTypes = interfaces
      .map((iface) => {
        const props = iface.attributes
          .map((attr) => {
            const optional = attr.required ? "" : "?";
            return `  ${attr.name}${optional}: ${attr.type};`;
          })
          .join("\n");

        return `export interface ${iface.name} {\n${props}\n}`;
      })
      .join("\n\n");

    // Write to frontend types file
    fs.writeFileSync(FRONTEND_TYPES_PATH, generatedTypes);

    console.log(
      `Generated ${interfaces.length} interfaces in ${FRONTEND_TYPES_PATH}`
    );
  } catch (error) {
    console.error("Error generating types:", error);
    process.exit(1);
  }
}

generateTypes();
