# Corona

CLI for tracking the ongoing pandemic of COVID-19.

## Source

Data is fetched from https://corona.lmao.ninja/countries. I don't have any control over the data, nor am I responsible for any inaccuracies of the provided information. Refer to the [API repository](https://github.com/NovelCOVID/API) for more details.

## Installation

There is no installation required, but you need to have [Deno](https://deno.land) installed.

## Usage

### List

Renders a table with the current data per country.

```
deno --allow-net https://raw.githubusercontent.com/aethe/corona/master/corona.ts list
```

### Live

Renders real-time updates.

```
deno --allow-net https://raw.githubusercontent.com/aethe/corona/master/corona.ts live
```

