import { ModuleParser } from './types';
import { parse } from 'acorn';
import { visit, namedTypes } from 'ast-types';

// inspired by
// https://github.com/dependents/node-detective-cjs
// https://github.com/dependents/node-ast-module-types

export const extractDependencyFromRequire = (node: namedTypes.CallExpression) => {
  const arg = node.arguments[0];
  if (namedTypes.Literal.check(arg) || namedTypes.StringLiteral.check(arg)) {
    return arg.value as string;
  }
  if (namedTypes.TemplateLiteral.check(arg)) {
    return arg.quasis[0].value.raw as string;
  }
};

export const extractDependencyFromMainRequire = (node: namedTypes.CallExpression) => {
  return (node.arguments[0] as any).value as string;
};

// ${requireFunctionNames}('xxx')
const isPlainRequire = (node: namedTypes.CallExpression, requireFunctionNames: string[]) => {
  return (
    namedTypes.Identifier.check(node.callee) && requireFunctionNames.includes(node.callee.name)
  );
};

// ${requireFunctionNames}.main.require('xxx')
const isMainScopeRequire = (node: namedTypes.CallExpression, requireFunctionNames: string[]) => {
  const { callee } = node;
  return (
    namedTypes.MemberExpression.check(callee) &&
    namedTypes.MemberExpression.check(callee.object) &&
    namedTypes.Identifier.check(callee.object.object) &&
    requireFunctionNames.includes(callee.object.object.name) &&
    namedTypes.Identifier.check(callee.object.property) &&
    callee.object.property.name === 'main' &&
    namedTypes.Identifier.check(callee.property) &&
    callee.property.name === 'require'
  );
};

export const parserCjs: (requireFunctionNames?: string[]) => ModuleParser = (
  requireFunctionNames = ['require']
) => {
  return ({ code, moduleProcessor }) => {
    const ast = parse(code, { ecmaVersion: 'latest' });
    visit(ast, {
      visitCallExpression(nodePath) {
        const { node } = nodePath;
        if (isPlainRequire(node, requireFunctionNames)) {
          moduleProcessor(extractDependencyFromRequire(node));
          return false;
        } else if (isMainScopeRequire(node, requireFunctionNames)) {
          moduleProcessor(extractDependencyFromMainRequire(node));
          return false;
        }
        this.traverse(nodePath);
      },
    });
  };
};
