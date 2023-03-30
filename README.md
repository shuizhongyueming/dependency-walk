## Introduction

`dependency-walk` allows you to traverse the dependency graph of a module.

## Installation

```bash
npm install dependency-walk
```

## Usage

To use the walk function, you must first import it from the `dependency-walk` module:

```javascript
import { walk } from 'dependency-walk';
```

Next, define the options object with the following properties:

- `entry`: the path to the entry module
- `parser`: (optional) a custom parser function for the module code
- `transformer`: (optional) a custom transformer function for the module info
- `filter`: (optional) a custom filter function to exclude certain modules
- `onModule`: (optional) a callback function to be called for each module
- `afterModule`: (optional) a callback function to be called after processing each module


Finally, call the `walk` function with the options object as its argument:

```javascript
const entryModule = walk({
  entry: '/path/to/entry/module.js',
  parser: customParserFunction,
  transformer: customTransformerFunction,
  filter: customFilterFunction,
  onModule: (moduleInfo) => console.log(moduleInfo.filePath),
  afterModule: (moduleInfo) => console.log('Finished processing', moduleInfo.filePath),
});
```

The `walk` function returns the entry module as a `Module` object.

### Module Object

The `Module` object has the following properties:

```typescript
interface Module {
  code: string;
  filePath: string;
  fileName: string;
  isEntry: boolean;
  dependencies: Module[];
}
```

### Custom parser function

The `parser` is a function that takes a `Module` object and a `moduleProcessor` as a parameter and output the detected dependency's path to `moduleProcessor`.

If the `parser` is not set when calling the walk function, a default parser that can detect `CommonJS Module` will be used.

