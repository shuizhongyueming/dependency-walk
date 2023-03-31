import * as fs from 'node:fs';
import * as path from 'node:path';
import { parserCjs } from './parser-cjs';
import { Walk, Module, EntryModule, ModuleTransformer } from './types';

const defaultTransformer: ModuleTransformer = (moduleInfo) => moduleInfo;
const defaultFilter = () => true;

export const walk: Walk = (options) => {
  const {
    entry,
    parser = parserCjs(),
    transformer = defaultTransformer,
    filter = defaultFilter,
    onModule,
    afterModule,
  } = options;
  const moduleCache = new Map<string, Module>();
  const parsedModule = new Set<string>();

  const resolveModule = (filePath: string, opt: { isEntry: boolean }): Module => {
    if (moduleCache.has(filePath)) {
      return moduleCache.get(filePath)!;
    }

    const code = fs.readFileSync(filePath, 'utf-8');
    const moduleInfo: Module = {
      code,
      filePath,
      fileName: path.basename(filePath),
      isEntry: opt.isEntry,
      dependencies: [],
    };

    moduleCache.set(filePath, moduleInfo);

    return moduleInfo;
  };

  const entryModule: EntryModule = resolveModule(entry, { isEntry: true }) as EntryModule;

  const traverse = (moduleInfo: Module) => {
    console.log('traverse', moduleInfo.filePath);
    transformer(moduleInfo);

    if (onModule) {
      onModule(moduleInfo);
    }

    if (!parsedModule.has(moduleInfo.filePath)) {
      parsedModule.add(moduleInfo.filePath);
      parser({
        ...moduleInfo,
        moduleProcessor(dependencyPath) {
          const absolutePath = require.resolve(dependencyPath, {
            paths: [path.dirname(moduleInfo.filePath)],
          });
          const depModule = resolveModule(absolutePath, { isEntry: false });
          moduleInfo.dependencies.push(depModule);

          const parsed = parsedModule.has(depModule.filePath);

          // filter is just use to detect whether a module should be parsed
          if (filter(depModule) === false) {
            parsedModule.add(depModule.filePath);
          }

          if (!parsed) {
            traverse(depModule);
          }
        },
      });
    }

    if (afterModule) {
      afterModule(moduleInfo);
    }
  };

  traverse(entryModule);

  return entryModule;
};
