# Corona

CLI for tracking the ongoing pandemic of COVID-19.

## Source

Data is fetched from https://corona.lmao.ninja/all and https://corona.lmao.ninja/countries. I don't have any control over the data, nor am I responsible for any inaccuracies of the provided information. Refer to the [API repository](https://github.com/NovelCOVID/API) for more details.

## Installation

There is no installation required, but you need to have [Deno](https://deno.land) installed.

## Usage

### Summary

Renders the current data from all territories combined.

```
deno --allow-net https://raw.githubusercontent.com/aethe/corona/master/corona.ts summary
```

### List

Renders a table with the current data per territory.

```
deno --allow-net https://raw.githubusercontent.com/aethe/corona/master/corona.ts list
```

To sort the output, use the `--sort <column>` argument with one of the following values: `cases`, `cases-today`, `deaths`, `deaths-today`, `recovered`, `active`. In case the sort argument is not specified, the output is sorted by `cases`.

```
deno --allow-net https://raw.githubusercontent.com/aethe/corona/master/corona.ts list --sort active
```

### Live

Renders real-time updates.

```
deno --allow-net https://raw.githubusercontent.com/aethe/corona/master/corona.ts live
```

