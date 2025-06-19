#!/usr/bin/env node

/**
 * Generate TypeScript interfaces for frontend from Strapi content types
 *
 * Usage:
 *   node generate-types.ts <strapi-content-types-path> <output-types-path>
 *
 * Arguments:
 *   strapi-content-types-path   Path to Strapi generated content types (required)
 *   output-types-path  Path to output frontend types (required)
 *
 * Examples:
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
  node generate-types.ts <strapi-content-types-path> <output-types-path>

Arguments:
  strapi-content-types-path   Path to Strapi generated content types (required)
  output-types-path  Path to output frontend types (required)

Examples:
  node generate-types.ts ./backend/types/generated/contentTypes.d.ts ./frontend/src/types/strapi.ts
  node generate-types.ts /path/to/backend/types.d.ts /path/to/frontend/types.ts
`);
  process.exit(0);
}

// Get paths from command line arguments - both are required
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("Error: Both input and output paths are required.");
  console.log(`
Usage:
  ts-types-from-strapi <strapi-content-types-path> <output-types-path>

Arguments:
  strapi-content-types-path   Path to Strapi generated content types
  output-types-path  Path to output frontend types

Examples:
  ts-types-from-strapi ./strapi/types/generated/contentTypes.d.ts ./frontend/src/types/strapi.ts
  ts-types-from-strapi /path/to/strapi/types.d.ts /path/to/output/types.ts
`);
  process.exit(1);
}
const STRAPI_CONTENT_TYPES_PATH = args[0];
const OUTPUT_TYPES_PATH = args[1];

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
    if (!STRAPI_CONTENT_TYPES_PATH || !OUTPUT_TYPES_PATH) {
      console.error("Error: Both input and output paths must be provided.");
      process.exit(1);
    }
    // Validate input file exists
    if (!fs.existsSync(STRAPI_CONTENT_TYPES_PATH)) {
      throw new Error(
        `Strapi content types file not found: ${STRAPI_CONTENT_TYPES_PATH}`
      );
    }

    // Ensure output directory exists
    const outputDir = path.dirname(OUTPUT_TYPES_PATH);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(
      `Reading Strapi content types from: ${STRAPI_CONTENT_TYPES_PATH}`
    );
    console.log(`Writing types to: ${OUTPUT_TYPES_PATH}`);

    // Read the input types file
    const inputContent = fs.readFileSync(STRAPI_CONTENT_TYPES_PATH, "utf8");

    // Split content by interfaces using a more robust approach
    const interfaceRegex = /export interface (\w+)[^{]*\{([\s\S]*?)\n\}/g;
    const interfaces: ParsedInterface[] = [];
    let match: RegExpExecArray | null;

    while ((match = interfaceRegex.exec(inputContent)) !== null) {
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

    // Write to output path
    fs.writeFileSync(OUTPUT_TYPES_PATH, generatedTypes);

    console.log(
      `\x1b[32mGenerated ${interfaces.length} interfaces in ${OUTPUT_TYPES_PATH}\x1b[0m`
    );
  } catch (error) {
    console.error("Error generating types:", error);
    process.exit(1);
  }
}

generateTypes();
