import * as path from "node:path";
import {walk} from "./main";
import * as assert from "power-assert";
import {parserCjs} from "./parser-cjs";

describe("custom", function() {
  it("should work for entry without dependency", function(){
    const entryPath = path.resolve(__dirname, "../test/customRequire/a/a2.js");

    const entryModule = walk({
      parser: parserCjs(['customRequire', 'require']),
      entry: entryPath,
      onModule(module) {
        assert.ok(module.filePath);
        console.log(module.filePath);
      }
    });

    assert.equal(entryModule.dependencies.length, 0);
  });
  it("should parse once for every module", function(){
    const entryPath = path.resolve(__dirname, "../test/customRequire/c/c.js");
    const countMap = new Map<string, number>();

    walk({
      parser: parserCjs(['customRequire', 'require']),
      entry: entryPath,
      onModule(module) {
        countMap.set(module.filePath, (countMap.get(module.filePath) || 0) + 1);
      }
    });

    for (const [filePath, count] of countMap.entries()) {
      assert.ok(count === 1, `${filePath} is parsed ${count} times`);
    }
  });

  it("should skip module if filter return false", function(){
    const entryPath = path.resolve(__dirname, "../test/customRequire/b/index.js");

    walk({
      parser: parserCjs(['customRequire', 'require']),
      entry: entryPath,
      filter(moduleInfo) {
        return !moduleInfo.filePath.endsWith("b2a.js");
      },
      onModule(module) {
        assert.ok(!module.filePath.endsWith("b2a.js"), `should skip ${module.filePath}`);
      }
    });
  });

  it("should place skipped module in parent's dependencies", function(){
    const entryPath = path.resolve(__dirname, "../test/customRequire/c/c.js");

    const entryModule = walk({
      parser: parserCjs(['customRequire', 'require']),
      entry: entryPath,
      filter(moduleInfo) {
        return !moduleInfo.filePath.endsWith("cc.js");
      },
      onModule(module) {
        assert.ok(!module.filePath.endsWith("cc.js"), `should skip ${module.filePath}`);
      }
    });

    assert.ok(entryModule.dependencies.some(dep => dep.filePath.endsWith("cc.js")), 'cc.js is required by c.js');
    assert.ok(entryModule.dependencies
      .filter(dep => !dep.filePath.endsWith("cc.js"))
      .every(dep => dep.dependencies.some(d => d.filePath.endsWith('cc.js'))), 'cc.js is required by cb.js and ca.js');
  });

  it("should transform before parse", function() {
    const entryPath = path.resolve(__dirname, "../test/customRequire/c/c.js");

    const entryModule = walk({
      parser: parserCjs(['customRequire', 'require']),
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
    const entryPath = path.resolve(__dirname, "../test/customRequire/main.js");
    const dependencyGraph = [
      'test/customRequire/main.js',
      [
        [
          'test/customRequire/a/a.js',
          [
            [
              'test/customRequire/a/a2.js',
              []
            ],
            [
              'test/customRequire/a/ab/ab.js',
              [
                [
                  'test/customRequire/util.js',
                  []
                ]
              ]
            ]
          ]
        ],
        [
          'test/customRequire/b/index.js',
          [
            [
              "test/customRequire/b/b2/b2.js",
              [
                [
                  "test/customRequire/b/b2/b2a/b2a.js",
                  [
                    [
                      "test/customRequire/util.js",
                      []
                    ]
                  ]
                ],
                [
                  "test/customRequire/b/b2/b2b/b2b.js",
                  [
                    [
                      "test/customRequire/b/b2/b2a/b2a.js",
                      [
                        [
                          "test/customRequire/util.js",
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
          'test/customRequire/util.js',
          []
        ]
      ]
    ];

    const entryModule = walk({
      parser: parserCjs(['customRequire', 'require']),
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
