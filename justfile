tsc:
  ./node_modules/.bin/tsc --project ./tsconfig.json

publish versionType="patch":
  rm -rf {{justfile_directory()}}/dist;
  just tsc;
  npm version {{versionType}};
  npm publish;
  git push;
