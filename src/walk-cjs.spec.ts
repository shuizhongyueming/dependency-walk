import * as path from 'node:path';
import * as assert from 'power-assert';
import { walk } from './main';
import {parserCjs} from "./parser-cjs";

describe("cjs", function() {
  it("should work for entry without dependency", function(){
    const entryPath = path.resolve(__dirname, "../test/cjs/a/a2.js");

    const entryModule = walk({
      entry: entryPath,
      onModule(module) {
        assert.ok(module.filePath);
        console.log(module.filePath);
      }
    });

    assert.equal(entryModule.dependencies.length, 0);
  });
  it("should parse once for every module", function(){
    const entryPath = path.resolve(__dirname, "../test/cjs/c/c.js");
    const countMap = new Map<string, number>();

    walk({
      entry: entryPath,
      onModule(module) {
        countMap.set(module.filePath, (countMap.get(module.filePath) || 0) + 1);
      }
    });

    for (const [filePath, count] of countMap.entries()) {
      assert.ok(count === 1, `${filePath} is parsed ${count} times`);
    }
  });

  it("should skip parse module if filter return false", function(){
    const entryPath = path.resolve(__dirname, "../test/cjs/b/index.js");

    const parser = parserCjs();
    const skippedFileName = 'b2a.js';
    let onModuleDetectedSkipped = false;
    let afterModuleDetectedSkipped = false;

    walk({
      entry: entryPath,
      filter(moduleInfo) {
        return !moduleInfo.filePath.endsWith(skippedFileName);
      },
      parser(moduleInfo) {
        assert.ok(!moduleInfo.filePath.endsWith(skippedFileName), `should skip parse ${moduleInfo.filePath}`);
        return parser(moduleInfo)
      },
      onModule(moduleInfo) {
        if (moduleInfo.filePath.endsWith(skippedFileName)) {
          onModuleDetectedSkipped = true
        }
      },
      afterModule(moduleInfo) {
        if (moduleInfo.filePath.endsWith(skippedFileName)) {
          afterModuleDetectedSkipped = true
        }
      }
    });
    assert.equal(onModuleDetectedSkipped, true, 'skipped module should also processed by onModule');
    assert.equal(afterModuleDetectedSkipped, true, 'skipped module should also processed by afterModule');
  });

  it("should place skipped module in parent's dependencies", function(){
    const entryPath = path.resolve(__dirname, "../test/cjs/c/c.js");
    const skippedFileName = "cc.js";

    const entryModule = walk({
      entry: entryPath,
      filter(moduleInfo) {
        return !moduleInfo.filePath.endsWith(skippedFileName);
      },
    });

    assert.ok(entryModule.dependencies.some(dep => dep.filePath.endsWith(skippedFileName)), 'cc.js is required by c.js');
    assert.ok(entryModule.dependencies
      .filter(dep => !dep.filePath.endsWith(skippedFileName))
      .every(dep => dep.dependencies.some(d => d.filePath.endsWith(skippedFileName))), 'cc.js is required by cb.js and ca.js');
  });

  it("should transform before parse", function() {
    const entryPath = path.resolve(__dirname, "../test/cjs/c/c.js");

    const entryModule = walk({
      entry: entryPath,
      transformer(moduleInfo) {
        if (moduleInfo.filePath.endsWith("c.js")) {
          moduleInfo.code = "true";
        }
        return moduleInfo;
      },
      onModule(module) {
        assert.equal(module.code, "true", `should transform ${module.filePath}`);
      }
    });
    assert.equal(entryModule.dependencies.length, 0);
  });
  it("should work as expected for entry with dependency", function(){
    const entryPath = path.resolve(__dirname, "../test/cjs/main.js");
    const dependencyGraph = [
        'test/cjs/main.js',
        [
          [
            'test/cjs/a/a.js',
            [
              [
                'test/cjs/a/a2.js',
                []
              ],
              [
                'test/cjs/a/ab/ab.js',
                [
                  [
                    'test/cjs/util.js',
                    []
                  ]
                ]
              ]
            ]
          ],
          [
            'test/cjs/b/index.js',
            [
              [
                "test/cjs/b/b2/b2.js",
                [
                  [
                    "test/cjs/b/b2/b2a/b2a.js",
                    [
                      [
                        "test/cjs/util.js",
                        []
                      ]
                    ]
                  ],
                  [
                    "test/cjs/b/b2/b2b/b2b.js",
                    [
                      [
                        "test/cjs/b/b2/b2a/b2a.js",
                        [
                          [
                            "test/cjs/util.js",
                            []
                          ]
                        ]
                      ]
                    ]
                  ]
                ]
              ]
            ]
          ],
          [
            'test/cjs/util.js',
            []
          ]
        ]
      ];

    const entryModule = walk({
      entry: entryPath,
      onModule(module) {
        assert.ok(module.filePath);
        console.log(module.filePath);
      }
    });

    function compareGraph(graph, moduleInfo) {
      assert.ok(moduleInfo.filePath.endsWith(graph[0]), `${moduleInfo.filePath} should end with ${graph[0]}`);
      const graphDependencies = graph[1].map(dep => dep[0]);
      const moduleDependencies = moduleInfo.dependencies.map(dep => dep.filePath);
      console.log(moduleInfo.filePath, graphDependencies, moduleDependencies);
      assert.equal(graphDependencies.length, moduleDependencies.length, `${moduleInfo.filePath} should have ${JSON.stringify(graphDependencies)} dependencies, but actually ${JSON.stringify(moduleDependencies)}`);
      graph[1].forEach((dep, i) => {
        compareGraph(dep, moduleInfo.dependencies[i]);
      });
    }

    compareGraph(dependencyGraph, entryModule);
  });
})


