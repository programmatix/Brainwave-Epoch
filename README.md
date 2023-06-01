# Build A Desktop Application Using NW.js and React

## Summary
This is a basic guide for building a desktop application using <a href="https://nwjs.io/">NW.js</a> and <a href="https://reactjs.org/">React</a>.
It should work in both Windows and Linux and most of it will possibly also work in macOS. This is not meant to be an end-to-end build solution, but more
as a guide to getting started with using NW.js together with React.

This repository can be cloned, for a copy of the `nw-react-example` app generated by following the instructions below.

## Requirements
The following is expected to already be installed/configured before starting this guide.
- <a target="_blank" href="https://nodejs.org/">Node.js</a> - The latest Long-Term Support (LTS) release of Node.js should be installed and in your <span class="code">PATH</span>.
- <a target="_blank" href="https://code.visualstudio.com/">Visual Studio Code</a> - A decent JavaScript editor/IDE should be installed. Some steps in this guide may assume Visual Studio Code is being used but other options are available.

## Getting Started
The following steps will result in a development environment, where your React application will be running in NW.js and automatically reload for any changes. Note that all instances of `nw-react-example` should be replaced with the name of your application.

1. Open a terminal, navigate to a directory where you have write permission, then run the following commands:

    ```sh
    npx create-react-app nw-react-example
    cd nw-react-example
    npm i concurrently wait-on react-devtools nw-builder cross-env
    npm i --save-exact nw@0.70.1-sdk
    ```

    __Note #1__: The latest available version of NW.js should be installed above.

    __Note #2__: The above NPM commands would normally be `--save-dev` to make them `devDependencies`. However, `create-react-app` incorrectly marks all of its dependencies as `dependencies`. So, we'll be renaming the entire section in step #2 below.

    __Note #3__: When using macOS on Apple Silicon, installation of `nw` will fail. As a workaround until an ARM build of NW.js is available, set the NPM environment  variable to force the x64 build to be used (e.g. `npm_config_nwjs_process_arch=x64 npm i`). First launch of the application will be slower as Rosetta 2 translates the binary.

2. Open the file `nw-react-example/package.json` and make the following changes:
    - Rename `dependencies` to `devDependencies`.
    - Add the following:
        ```json
        "main": "main.js",
        "homepage": ".",
        "node-remote": [
          "http://127.0.0.1:3042",
          "file://*"
        ],
        "build": {
            "manifestProps": [
                "name",
                "version",
                "main",
                "node-remote"
            ],
            "osTypes": [
                "windows"
            ]
        },
        "eslintConfig": {
            "globals": {
              "nw": true
            }
        },
        "scripts": {
            "dev": "concurrently \"npm start\" \"wait-on http://127.0.0.1:3042 && cross-env NWJS_START_URL=http://127.0.0.1:3042 nw --enable-logging=stderr .\"",
            "dev-tools": "concurrently \"react-devtools\" \"cross-env REACT_APP_DEVTOOLS=enabled npm start\" \"wait-on http://127.0.0.1:3042 && cross-env NWJS_START_URL=http://127.0.0.1:3042 nw --enable-logging=stderr .\"",
            "predist": "cross-env GENERATE_SOURCEMAP=false BUILD_PATH=./dist/app/build/ npm run build",
            "dist": "node dist.mjs"
        }
        ```
        __Note #1__: Both `eslintConfig` and `scripts` should already exist. The above items should be added to the existing sections.

3. Add the following to `nw-react-example\.env` (new file):
    ```
    PORT=3042
    BROWSER=none
    ```

4. Add the following to `nw-react-example\main.js` (new file):
    ```js
    const url = require('node:url');

    const baseUri = url.pathToFileURL(__dirname).toString();

    const interfaceUri = process.env.NWJS_START_URL
      ? process.env.NWJS_START_URL.trim()
      : `${baseUri}/build/`;

    const startUri = `${interfaceUri}/index.html`;

    nw.Window.open(startUri);
    ```

5. Add the following to `nw-react-example\dist.mjs` (new file):
    ```js
    import { copyFile, readFile, writeFile } from 'node:fs/promises';
    import path from 'node:path';
    import { nwbuild } from 'nw-builder';

    const packageManifest = JSON.parse(await readFile('./package.json'));
    const appBaseDir = path.resolve('./dist/app/');

    const defaultBuildCfg = {
    manifestProps: [
        'name',
        'version',
        'main',
    ],
    osTypes: [
        'windows',
        'linux',
    ],
    nwVersion: '0.70.1',
    };

    // Copy main.js to dist/app/ directory for packaging
    // NOTE: The predist script should run webpack (or something similar) after `npm run build`, to bundle main.js and any Node.js dependencies into a single file.
    // NOTE: If this isn't done, the following will need to be modified to copy all necessary files/dependencies to the dist/app/ directory.
    console.log(`Copying Node-context script to ${appBaseDir}`);
    try {
    await copyFile('main.js', path.resolve(appBaseDir, 'main.js'));
    } catch (error) {
    console.error('Unable to copy Node-context script to app directory:', error);
    }

    // Create production package.json
    console.log('Generating application manifest (package.json)...');
    const manifestProps = packageManifest.build?.manifestProps || defaultBuildCfg.manifestProps;
    const prodManifest = {};
    for (const propName of manifestProps) {
    prodManifest[propName] = packageManifest[propName];
    }
    try {
    await writeFile(path.resolve(appBaseDir, 'package.json'), JSON.stringify(prodManifest, null, 4));
    } catch (error) {
    console.error('Unable to generate application manifest:', error);
    }

    // Build package for each OS type
    const appOsTypes = packageManifest.build?.osTypes || defaultBuildCfg.osTypes;
    const appName = packageManifest.build?.appName || packageManifest.name;
    const appVersion = packageManifest.version || '1.0.0';
    for (const osType of appOsTypes) {
    console.log(`Building package for ${osType}...`);
    const platform = osType === 'windows' ? 'win' : osType;
    const nwVersion = packageManifest.devDependencies.nw.split('-')[0] || defaultBuildCfg.nwVersion;
    const outDir = path.resolve(`./dist/${appName}-${appVersion}-${osType}/`);
    const nwBuildArgs = {
        srcDir: appBaseDir,
        version: nwVersion,
        flavour: 'normal',
        platform: platform,
        arch: 'x64',
        outDir,
        run: false,
        zip: true
    };
    try {
        await nwbuild(nwBuildArgs);
    } catch (error) {
        console.error(`Error building package for ${osType}`);
    }
    console.log(`Finished building package for ${osType}`);
    }
    ```

6. Add the following at the top of the `<head>` block in `nw-react-example\public\index.html`:
    ```html
    <script>if ('%REACT_APP_DEVTOOLS%'.trim() === 'enabled') document.write('<script src="http:\/\/127.0.0.1:8097"><\/script>')</script>
    ```

## Development Notes
- At this point, you can run `npm run dev`. The React development "live" server will be started and NW.js will be launched, connecting to that "live" server. Any updates to your React application will automatically be reflected in the NW.js window.

- To access Chrome developer tools, right-click on the window that opens. Selecting "Inspect" will show DevTools for the current window. Selecting "Inspect background page" shows DevTools for the Node.js process running `main.js`.

- Running `npm run dev-tools` will behave the same as above, but will also start a standalone version of React DevTools which the React application will connect to.

- Any NPM packages used with the React portion of your application should be installed as `devDependencies` (`npm install --save-dev <package>`). Any NPM packages use by `main.js` (or any other Node.js-context scripts) that need to be included in the "production" application, should be installed as `dependencies` (`npm install <package>`). This will be further-clarified in the "Production Build" section below.

- Attempting to install the NW.js NPM package on an Apple Silicon system will fail unless you set the architecture:
    ```sh
    npm_config_nwjs_process_arch=x64 npm i nw@0.70.1-sdk
    ```

- **NOTE:** There is currently an issue (https://github.com/nwjs/nw.js/issues/7852) where "zombie" NW.js processes stick around and chew up system memory, when the application is closed by pressing CTRL-C in the terminal where `npm run dev` was executed. A decent workaround for this behavior would be much appreciated!

## Production Build

### Automatic Production Build

To automatically create a "production" build of your application, run the command `npm run dist`. This will use <a href="https://github.com/nwutils/nw-builder">nw-builder</a> to create ZIP files for all specified operating systems, which contain a fully-functional and distributable application.

The following properties are available for the `build` configuration object in `package.json`. These control behavior of the `dist.mjs` script.

```json
"build": {
    "appName": "ApplicationName",
    "manifestProps": [
        "name",
        "version",
        "main",
        "node-remote"
    ],
    "osTypes": [
        "windows",
        "linux",
        "osx"
    ]
}
```
- `appName`: Optional property which will be used to name the directories and ZIP files generated by `dist.mjs`. If not specified, the `name` property from `package.json` will be used.
- `manifestProps`: Array of property names which will be copied from the development `package.json` into the production `package.json`. If not specified, will default to "name", "version", and "main".
- `osTypes`: Array of operating systems for which distribution packages should be built. If not specified, defaults to "windows" and "linux".

Notes:
- The `version` property from `package.json` will be used in the generated directories and ZIP files.
- To use Node.js or NW.js APIs inside the React application, the `node-remote` property must be included in the production `package.json`.
- The generated ZIP/directory can be used to create an installation package (see below for suggestions).
- The `nw-builder` package is undergoing a significant updates with v4 and functionality may change or break behavior of this build process. Current issues (as of 4.0.1):
  - Linux builds will fail: https://github.com/nwutils/nw-builder/issues/699
  - MacOS (osx) builds will fail: https://github.com/nwutils/nw-builder/issues/705
  - The `nw.exe` file included in the production file is not renamed: https://github.com/nwutils/nw-builder/issues/695
- No testing has been done on Linux or macOS. Please report any observed issues.

### Manual Production Build

The following steps can be followed to manually create a "production" build of your application. This will use the "built" version of your React application and the "normal" (non-SDK) build of NW.js (disabling DevTools).

1. Run the command `npm run build` inside the application development directory (`nw-react-example` from the example above). This will generate a `nw-react-example/build/` directory, which is the production version of the React application.
2. Download the "Normal" (non-SDK) build of NW.js (https://nwjs.io/downloads/), which matches the version being used for development (0.70.1 in the example above). Extract the files into a **new** directory (e.g. `nw-react-example/dist/`). Note that the NW.js zip/tgz contains a directory similar to `nwjs-v0.70.1-win-x64`. It's the content of that directory, which need to be extracted to `nw-react-example/dist/` (resulting in `/nw-react-example/dist/nw.exe`).
3. Rename the NW.js executable file to match your application name (Windows: `nw.exe` to `nw-react-example.exe` | Linux: `nw` to `nw-react-example`). This can be **any** name.
4. Create a directory named `package.nw` inside the directory created in step #2 above (e.g. `nw-react-example/dist/package.nw/`).
5. Copy the following files to this new `package.nw` directory: `nw-react-example/main.js`, `nw-react-example/package.json`, `nw-react-example/build/` (the entire directory).
6. Edit the new copy of `package.json` (in the `nw-react-example/dist/` directory) and remove all of the following properties/sections: `private`, `devDependencies`, `scripts`, `eslintConfig`, and `browserslist`.
7. If the Node.js context of your application uses any NPM packages (anything in `dependencies`), these need to be installed into the `package.nw` directory. To do this, run `npm install --no-save` inside `nw-react-example/dist/package.nw/`.

The main directory from step #2 will now include your fully-functional application. It can be zipped and/or copied anywhere and used without needing anything else pre-installed. Ideally, this directory would now be turned into an "installer" for easy distribution. This can be done with tools like <a href="https://jrsoftware.org/isinfo.php">InnoSetup</a> for Windows or building a DEB/RPM for Linux.

## Build Tools
Often, it's fairly-trivial at this point to write a custom "build system" that automatically runs through the above steps (as well as any additional customization steps needed), and generates installers for all supported operating systems. There are some existing packages for this task, but most have not been maintained:
- <a href="https://www.npmjs.com/package/nw-builder">nw-builder</a> - Currently, the only actively-maintained NW.js build tool.
- <a href="https://www.npmjs.com/package/nwjs-builder-phoenix">nwjs-builder-phoenix</a> - This was an excellent set of build scripts, but it has not been maintained. It's still a good reference, if building a custom build system.
- <a href="https://gitlab.com/TheJaredWilcurt/battery-app-workshop#packaging-your-app-for-distribution">battery-app-workshop</a> - While some of the details are outdated, this is another excellent resource for manual builds.


## Alternatives

* [create-nw-react-app](https://github.com/naviapps/create-nw-react-app) - A highly opinionated NW.js/React boilerplate based around Create React App (CRA) and Webpack. Has lots of choices and additional tooling already made for you, set up and installed.
