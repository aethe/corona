import { parse } from "https://deno.land/std/flags/mod.ts";
import { red, yellow, green, blue } from "https://deno.land/std/fmt/colors.ts";

class Item {
    country = "";
    cases = 0;
    todayCases = 0;
    deaths = 0;
    todayDeaths = 0;
    recovered = 0;
    critical = 0;

    get treated(): number {
        return this.cases - this.deaths - this.recovered;
    }

    constructor(partial: Partial<Item>) {
        Object.assign(this, partial);
    }
}

enum Color {
    Default,
    Red,
    Yellow,
    Green,
    Blue
}

class Table {
    data: string[][];
    colors: Color[];

    constructor(data: string[][], colors: Color[]) {
        this.data = data;
        this.colors = colors;
    }

    private colorize = (text: string, color: Color): string => {
        switch (color) {
            case Color.Default: return text;
            case Color.Red: return red(text);
            case Color.Yellow: return yellow(text);
            case Color.Green: return green(text);
            case Color.Blue: return blue(text);
        }
    };

    print = () => {
        const columns = this.data
            .map(e => e.length)
            .reduce((p, n) => Math.max(p, n), 0);

        const widths = [...Array(columns).keys()].map(column => Math.max(...this.data.map(e => e[column].length + 2)));

        for (const row of this.data) {
            console.log(row.map((e, i) => this.colorize(e.padEnd(widths[i], " "), this.colors[i])).join(""));
        }
    };
}

const fetchStats = async (): Promise<Array<Item>> => {
    const response = await fetch("https://corona.lmao.ninja/countries");
    const json = await response.json();
    return (json as [any]).map(e => new Item(e));
};

const runList = () => {
    fetchStats()
        .then(stats => {
            const headers = [
                "COUNTRY",
                "CASES TOTAL",
                "CASES TODAY",
                "DEATHS TOTAL",
                "DEATHS TODAY",
                "TREATED",
                "RECOVERED"
            ];

            const data = [headers]
                .concat(
                    stats.map(e => {
                        return [
                            e.country,
                            e.cases.toString(),
                            e.todayCases.toString(),
                            e.deaths.toString(),
                            e.todayDeaths.toString(),
                            e.treated.toString(),
                            e.recovered.toString()
                        ];
                    })
                );

            const colors = [
                Color.Default,
                Color.Yellow,
                Color.Yellow,
                Color.Red,
                Color.Red,
                Color.Blue,
                Color.Green
            ];

            new Table(
                data,
                colors
            ).print();
        })
        .catch(error => {
            console.error("Failed to fetch data.");
        });
};

const args = parse(Deno.args);
const command = args._[0];

switch (command) {
    case "list":
        runList();
        break;

    default:
        console.error(`No such command '${command}'. Use 'all' to fetch the current data.`);
        break;
}
