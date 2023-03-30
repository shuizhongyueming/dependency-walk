export interface Module {
  code: string;
  filePath: string;
  fileName: string;
  isEntry: boolean;
  dependencies: Module[];
}

export interface EntryModule extends Module {
  isEntry: true;
}

export interface ModuleParserOptions extends Module {
  moduleProcessor: (dependencyPath: string) => void;
}

export type ModuleParser = (opt: ModuleParserOptions) => void;

export type ModuleTransformer = (module: Module) => Module;

export interface WalkOptions {
  entry: string;
  // do some transform on the module before parse and traverse
  transformer?: ModuleTransformer;
  // parse the module to get the dependencies
  parser?: ModuleParser;
  // detect whether to traverse the dependency
  filter?: (module: Module) => boolean;
  // callback before traverse the module
  onModule?: (module: Module) => void;
  // callback after traverse the module
  afterModule?: (module: Module) => void;
}

export type Walk = (opt: WalkOptions) => EntryModule;
