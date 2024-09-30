# if-core

Here you can find all the necessary utilities for plugin development.

 - Plugin Factory
 - Utils for advanced plugin development
 - Types

## Installing

Run the command below in your project root:

```bash
npm install @grnsft/if-core
```

## Usage

> Note: For proper error handling, you have to use error classes from `@grnsft/if-core/utils`.

Here you can see usage example for plugin development:

```ts
import {PluginFactory} from '@grnsft/if-core/interfaces';
import {ERRORS} from '@grnsft/if-core/utils';
import {PluginParams, CustomConfig} from '@grnsft/if-core/types';

const {ConfigError, MissingInputDataError} = ERRORS;

const CustomPlugin = PluginFactory<CustomConfig>({
  configValidation: (config: CustomConfig) => {
    if (!config) {
      throw new ConfigError('My message here');
    }

    return config
  },
  implementation: async (inputs: PluginParams[], config: ConfigParams) => {
    // plugin related stuff here
  }
})
```
