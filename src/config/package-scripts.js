import path from 'path';
import merge from 'deepmerge';
import * as npsUtils from 'nps-utils';

import {
  EXTENSIONS_WITH_DOT,
  SRC_DIR,
  OUT_DIR
} from 'etc/constants';


/**
 * If required by our local package-scripts file, returns the provided binary
 * name unmodified. Otherwise, prepends the bin prefix used by this package to
 * ensure that consumers reference our binaries.
 */
const prefixBin = binName => {
  const binPrefix = 'unified';

  if (module.parent && module.parent.id === path.resolve(__dirname, '..', '..', 'package-scripts.js')) {
    return binName;
  }

  return `${binPrefix}.${binName}`;
};


export default userArgument => {
  let userScripts;

  if (typeof userArgument === 'function') {
    userScripts = userArgument({
      npsUtils,
      bin: prefixBin
    });
  } else if (typeof userArgument === 'object') {
    userScripts = userArgument;
  } else {
    userScripts = {};
  }

  const scripts = {};


  // ----- Misc ----------------------------------------------------------------

  scripts.checkDeps = {
    description: 'Check for newer versions of installed dependencies.',
    script: 'npm-check --skip-unused || true'
  };

  scripts.lint = {
    description: 'Lint the project.',
    script: `${prefixBin('eslint')} src --ext .ts,.tsx,.js,.jsx --format=node_modules/eslint-codeframe-formatter`,
    fix: {
      description: 'Lint the project and automatically fix all fixable errors.',
      script: `${prefixBin('eslint')} src --ext .ts,.tsx,.js,.jsx --format=node_modules/eslint-codeframe-formatter --fix`
    }
  };


  // ----- Testing -------------------------------------------------------------

  scripts.test = {
    default: {
      description: 'Run unit tests.',
      script: prefixBin('jest')
    },
    watch: {
      description: 'Run unit tests in watch mode.',
      script: `${prefixBin('jest')} --watch`
    },
    coverage: {
      description: 'Run unit tests and generate a coverage report.',
      script: `${prefixBin('jest')} --coverage`
    }
  };


  // ----- Building ------------------------------------------------------------

  const babel = [
    `${prefixBin('babel')} ${SRC_DIR}`,
    `--extensions="${EXTENSIONS_WITH_DOT.join(',')}"`,
    '--ignore="**/*.d.ts"',
    `--out-dir="${OUT_DIR}"`,
    '--copy-files',
    '--source-maps=true',
    '--delete-dir-on-start'
  ].join(' ');

  const ttsc = `${prefixBin('ttsc')} --pretty`;

  // Babel's --ignore argument doesn't work as explained in the docs, especially
  // with multiple patterns. It is easier to just go through the output folder
  // and remove what we don't want.
  const postBuild = `${prefixBin('del')} "${OUT_DIR}/**/*.spec.*" "${OUT_DIR}/**/*.test.*"`;

  // N.B. This is typically only needed in Webpack projects where the project
  // is not built using the Babel CLI but instead using the Webpack CLI.
  scripts.typeCheck = {
    description: 'Type-check the project.',
    script: `${ttsc} --noEmit`
  };

  scripts.build = {
    default: {
      description: 'Build the project.',
      script: npsUtils.series(...[
        // If there is a user-defined script named 'prebuild', run it.
        userScripts?.scripts?.prebuild ? 'nps prebuild' : undefined,
        npsUtils.concurrent({
          lint: scripts.lint.script,
          babel,
          tsc: `${ttsc} --emitDeclarationOnly`
        }),
        postBuild,
        // If there is a user-defined script named 'postbuild', run it.
        userScripts?.scripts?.postbuild ? 'nps postbuild' : undefined
      ].filter(Boolean))
    },
    watch: {
      description: 'Continuously build the project',
      script: npsUtils.series(...[
        // If there is a user-defined script named 'prebuild', run it.
        userScripts?.scripts?.prebuild ? 'nps prebuild' : undefined,
        npsUtils.concurrent({
          tsc: `${ttsc} --emitDeclarationOnly --preserveWatchOutput --watch`,
          babel: `${babel} --watch --verbose`
        })
      ].filter(Boolean))
    }
  };


  // ----- Versioning ----------------------------------------------------------

  scripts.bump = {
    default: {
      description: 'Generates a change log and tagged commit for a release.',
      script: npsUtils.series(...[
        // If there is a user-defined script named 'prebump', run it.
        userScripts?.scripts?.prebump ? 'nps prebump' : undefined,
        scripts.build.default.script,
        prefixBin('standard-version'),
        // If there is a user-defined script named 'postbump', run it.
        userScripts?.scripts?.postbump ? 'nps postbump' : undefined
      ].filter(Boolean))
    },
    beta: {
      description: 'Generates a change log and tagged commit for a beta release.',
      script: npsUtils.series(...[
        // If there is a user-defined script named 'prebump', run it.
        userScripts?.scripts?.prebump ? 'nps prebump' : undefined,
        scripts.build.default.script,
        `${prefixBin('standard-version')} --prerelease=beta`,
        // If there is a user-defined script named 'postbump', run it.
        userScripts?.scripts?.postbump ? 'nps postbump' : undefined
      ].filter(Boolean))
    },
    first: {
      description: 'Generates a changelog and tagged commit for a project\'s first release.',
      script: npsUtils.series(...[
        // If there is a user-defined script named 'prebump', run it.
        userScripts?.scripts?.prebump ? 'nps prebump' : undefined,
        scripts.build.default.script,
        `${prefixBin('standard-version')} --first-release`,
        // If there is a user-defined script named 'postbump', run it.
        userScripts?.scripts?.postbump ? 'nps postbump' : undefined
      ].filter(Boolean))
    }
  };


  // ----- Life Cycles ---------------------------------------------------------

  scripts.prepare = {
    description: 'Runs after "npm install" to ensure the package compiles correctly.',
    script: npsUtils.series(scripts.build.default.script, `${scripts.test.default.script} --passWithNoTests`)
  };


  return merge({
    scripts,
    options: {
      logLevel: 'warn'
    }
  }, userScripts);
};
