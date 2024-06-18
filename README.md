# if-core

Here you can find all the necessary utilities for plugin development.

## Installing

Run the command below in your project root:

```bash
npm install @grnsft/if-core
```

## Usage

>Note: For proper error handling, you have to use error classes from `@grnsft/if-core/utils`.

Here you can see usage example for plugin development:

```ts
import {ERRORS} from "@grnsft/if-core/utils"
import {PluginParams, CustomConfig} from "@grnsft/if-core/types"

const {GlobalConfigError, MissingInputDataError} = ERRORS

const CustomPlugin = (globalConfig: CustomConfig) => {
  // plugin related stuff here
  const validateConfig = () => {
    if (!globalConfig) {
      throw new GlobalConfigError("My message here")
    }
  }

  const execute = (inputs: PluginParams[]) => {
    validateConfig()
    // plugin logic here
  }

  return {
    execute
  }
}
```
