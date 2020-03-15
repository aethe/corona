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

class Difference {
    cases: number;
    deaths: number;
    recovered: number;

    constructor(oldItem: Item, newItem: Item) {
        this.cases = newItem.cases - oldItem.cases;
        this.deaths = newItem.deaths - oldItem.deaths;
        this.recovered = newItem.recovered - oldItem.recovered;
    }

    get isEmpty(): boolean {
        return this.cases == 0 && this.deaths == 0 && this.recovered == 0;
    }
}

enum Color {
    Default,
    Red,
    Yellow,
    Green,
    Blue
}

class Column {
    constructor(
        public header: string,
        public width: number,
        public color: Color
    ) { }
}

class NumberFormatter {
    constructor(public includesPlusSign: boolean) { }

    format = (value: number): string => {
        if (value > 0 && this.includesPlusSign) {
            return `+${value}`;
        }

        return `${value}`;
    };
}

class Table {
    constructor(public columns: Column[]) { }

    printHeaders = () => {
        console.log(this.columns.map(e => this.colorize(e.header.padEnd(e.width, " "), e.color)).join(""));
    };

    printRow = (data: string[]) => {
        if (data.length != this.columns.length) {
            return;
        }

        console.log(data.map((e, i) => this.colorize(e.padEnd(this.columns[i].width), this.columns[i].color)).join(""));
    };

    private colorize = (text: string, color: Color): string => {
        switch (color) {
            case Color.Default: return text;
            case Color.Red: return red(text);
            case Color.Yellow: return yellow(text);
            case Color.Green: return green(text);
            case Color.Blue: return blue(text);
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
            const table = new Table([
                new Column("COUNTRY", 24, Color.Default),
                new Column("CASE ALL", 12, Color.Yellow),
                new Column("CASE DAY", 12, Color.Yellow),
                new Column("DTH ALL", 12, Color.Red),
                new Column("DTH DAY", 12, Color.Red),
                new Column("REC ALL", 12, Color.Green),
                new Column("TREATED", 12, Color.Blue)
            ]);

            table.printHeaders();

            stats.forEach(e => {
                table.printRow([
                    e.country,
                    e.cases.toString(),
                    e.todayCases.toString(),
                    e.deaths.toString(),
                    e.todayDeaths.toString(),
                    e.recovered.toString(),
                    e.treated.toString()
                ]);
            });
        })
        .catch(error => {
            console.error("Failed to fetch data.");
        });
};

const runLive = async () => {
    const cachedItems: { [country: string]: Item } = {};

    const delay = (ms: number) => {
        return new Promise(resolve => setTimeout(resolve, ms));
    };

    const table = new Table([
        new Column("COUNTRY", 24, Color.Default),
        new Column("CASE NEW", 12, Color.Yellow),
        new Column("CASE ALL", 12, Color.Yellow),
        new Column("CASE DAY", 12, Color.Yellow),
        new Column("DTH NEW", 12, Color.Red),
        new Column("DTH ALL", 12, Color.Red),
        new Column("DTH DAY", 12, Color.Red),
        new Column("REC NEW", 12, Color.Green),
        new Column("REC ALL", 12, Color.Green),
        new Column("TREATED", 12, Color.Blue)
        
    ]);

    table.printHeaders();

    while (true) {
        const items = await fetchStats();
        const differenceFormatter = new NumberFormatter(true);

        items.forEach(async item => {
            const cachedItem = cachedItems[item.country];

            if (cachedItem) {
                const difference = new Difference(cachedItem, item);

                if (!difference.isEmpty) {
                    const data = [
                        item.country,
                        difference.cases != 0 ? differenceFormatter.format(difference.cases) : "",
                        `${item.cases}`,
                        `${item.todayCases}`,
                        difference.deaths != 0 ? differenceFormatter.format(difference.deaths) : "",
                        `${item.deaths}`,
                        `${item.todayDeaths}`,
                        difference.recovered != 0 ? differenceFormatter.format(difference.recovered) : "",
                        `${item.recovered}`,
                        `${item.treated}`
                    ];

                    table.printRow(data);
                }
            }

            cachedItems[item.country] = item;
        });

        await delay(60000);
    }
};

const args = parse(Deno.args);
const command = args._[0];

switch (command) {
    case "list":
        runList();
        break;

    case "live":
        runLive();
        break;

    default:
        console.error(`No such command '${command}'. Use 'list' to fetch the current data, or 'live' to receive real-time updates.`);
        break;
}
