# if-core

Here you can find necessary utilities for plugin development.

## Installing

Run the command below in your project root:

```bash
npm install @grnsft/if-core
```

## Usage

Here you can see usage example for plugin development:

```ts
import {ERRORS} from "@grnsft/if-core"
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
