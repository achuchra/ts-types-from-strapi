# ts-types-from-strapi

[![npm version](https://badge.fury.io/js/ts-types-from-strapi.svg)](https://badge.fury.io/js/ts-types-from-strapi)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

🚀 **Generate TypeScript readable interfaces for your frontend from Strapi content types automatically**

Transform your Strapi schema content type definitions into clean, type-safe TypeScript interfaces for your frontend applications. This tool parses Strapi's generated content types and creates corresponding TypeScript interfaces with proper type mapping, relation handling, and enumeration support.

## ✨ Features

- 🔄 **Automatic Type Conversion**: Converts Strapi schema attributes to TypeScript types
- 🔗 **Relation Support**: Handles one-to-many and many-to-many relations as arrays
- 📝 **Enumeration Mapping**: Converts Strapi enumerations to TypeScript union types
- 🎯 **Required Field Detection**: Marks required fields appropriately
- 🛡️ **Type Safety**: Generates strongly-typed interfaces for better development experience
- 📁 **Flexible Paths**: Supports custom input and output file paths
- 🚫 **Private Field Filtering**: Automatically excludes private attributes

## 📦 Installation

```bash
npm install ts-types-from-strapi
```

## 🚀 Usage

### Command Line Interface

After installation, you can use the CLI tool in several ways:

```bash
# Using npx (recommended)
npx ts-types-from-strapi <strapi-content-types-path> <output-types-path>

# Using npm exec
npm exec ts-types-from-strapi <strapi-content-types-path> <output-types-path>

# Using the global command (after npm install -g)
ts-types-from-strapi <strapi-content-types-path> <output-types-path>

# Show help
npx ts-types-from-strapi --help
```

### Required Arguments

Both paths are required when running the command:

- **strapi-content-types-path**: Path to Strapi generated content types
- **output-types-path**: Output path

### Examples

```bash
# With relative paths
npx ts-types-from-strapi ./backend/types/generated/contentTypes.d.ts ./frontend/src/types/strapi.ts

# With absolute paths
npx ts-types-from-strapi /path/to/strapi/types.d.ts /path/to/output/types.ts
```

### Adding to Package Scripts

Add the command to your `package.json` scripts for easy access:

```json
{
  "scripts": {
    "generate-types": "ts-types-from-strapi ./backend/types/generated/contentTypes.d.ts ./frontend/src/types/strapi.ts",
    "generate-types:custom": "ts-types-from-strapi ./strapi/types.d.ts ./src/types/api.ts"
  }
}
```

Then run:

```bash
npm run generate-types
```

## 🔧 Type Mapping

The tool automatically converts Strapi schema types to TypeScript equivalents:

| Strapi Type                           | TypeScript Type                             |
| ------------------------------------- | ------------------------------------------- |
| `Schema.Attribute.String`             | `string`                                    |
| `Schema.Attribute.Email`              | `string`                                    |
| `Schema.Attribute.Password`           | `string`                                    |
| `Schema.Attribute.Text`               | `string`                                    |
| `Schema.Attribute.Integer`            | `number`                                    |
| `Schema.Attribute.BigInteger`         | `number`                                    |
| `Schema.Attribute.Decimal`            | `number`                                    |
| `Schema.Attribute.Boolean`            | `boolean`                                   |
| `Schema.Attribute.DateTime`           | `string`                                    |
| `Schema.Attribute.JSON`               | `Record<string, any>` or `any[]`            |
| `Schema.Attribute.Enumeration<[...]>` | Union type (e.g., `"active" \| "inactive"`) |
| `Schema.Attribute.Relation`           | Related type or array of related types      |

## 🎯 Input/Output Example

### Input (Strapi Content Types)

```typescript
export interface ApiArticleArticle {
  id: number;
  attributes: {
    title: Schema.Attribute.String & Schema.Attribute.Required;
    content: Schema.Attribute.Text;
    status: Schema.Attribute.Enumeration<["draft", "published"]> &
      Schema.Attribute.Required;
    author: Schema.Attribute.Relation<"oneToOne", "api::author.author">;
    tags: Schema.Attribute.Relation<"oneToMany", "api::tag.tag">;
    metadata: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
  };
}
```

### Output (Generated TypeScript)

```typescript
export interface ApiArticleArticle {
  title: string;
  content?: string;
  status: "draft" | "published";
  author?: ApiAuthorAuthor;
  tags?: ApiTagTag[];
  metadata?: Record<string, any>;
}
```

## 🛠️ Development

### Build the Project

```bash
npm run build
```

This compiles the TypeScript source to JavaScript in the `dist/` directory.

### Running from Source (Development)

During development, you can run the TypeScript file directly:

```bash
# Install dependencies first
npm install

# Run from source
npx tsx src/generate.ts [strapi-content-types-path] [output-types-path]

# Or build and run
npm run build
node dist/generate.js [strapi-content-types-path] [output-types-path]
```

### Global Installation

For frequent use across multiple projects:

```bash
npm install -g ts-types-from-strapi
ts-types-from-strapi
```

## 📋 Requirements

- Node.js 16+
- TypeScript project with Strapi content types

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT © [Andrzej Chuchra](https://github.com/achuchra)

## 🔗 Links

- [GitHub Repository](https://github.com/achuchra/ts-types-from-strapi)
- [npm Package](https://www.npmjs.com/package/ts-types-from-strapi)
- [Issues](https://github.com/achuchra/ts-types-from-strapi/issues)

---

**Made with ❤️ for the Strapi community**
