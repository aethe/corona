import { parse } from "https://deno.land/std/flags/mod.ts";
import { red, yellow, green, blue } from "https://deno.land/std/fmt/colors.ts";

class APIError extends Error { }
class CodingError extends Error { }

function asNumber(value: any): number {
    if (typeof value === "number") {
        return value;
    } else {
        throw new CodingError();
    }
}

function asString(value: any): string {
    if (typeof value === "string") {
        return value;
    } else {
        throw new CodingError();
    }
}

class Summary {
    constructor(
        public cases: number,
        public deaths: number,
        public recovered: number
    ) { }

    get treated(): number {
        return this.cases - this.deaths - this.recovered;
    }

    static parseJSON = (json: any): Summary => new Summary(
        asNumber(json.cases),
        asNumber(json.deaths),
        asNumber(json.recovered)
    );
}

class Item {
    constructor(
        public country: string,
        public cases: number,
        public todayCases: number,
        public deaths: number,
        public todayDeaths: number,
        public recovered: number
    ) { }

    get treated(): number {
        return this.cases - this.deaths - this.recovered;
    }

    static parseJSON = (json: any): Item => new Item(
        asString(json.country),
        asNumber(json.cases),
        asNumber(json.todayCases),
        asNumber(json.deaths),
        asNumber(json.todayDeaths),
        asNumber(json.recovered)
    );
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

class NumberFormatter {
    constructor(public includesPlusSign: boolean) { }

    format = (value: number): string => {
        if (value > 0 && this.includesPlusSign) {
            return `+${value}`;
        }

        return `${value}`;
    };
}

function time(): string {
    const date = new Date();
    return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}

async function fetchSummary(): Promise<Summary> {
    const response = await fetch("https://corona.lmao.ninja/all");

    if (!response.ok) {
        throw new APIError();
    }

    return Summary.parseJSON((await response.json() as [any]));
}

async function fetchStats(): Promise<Array<Item>> {
    const response = await fetch("https://corona.lmao.ninja/countries");

    if (!response.ok) {
        throw new APIError();
    }
    
    return (await response.json() as [any]).map(e => Item.parseJSON(e));
}

async function runSummary() {
    try{
        const summary = await fetchSummary();

        console.log(`There are currently ${yellow(summary.cases.toString())} cases, ${red(summary.deaths.toString())} deaths, ${green(summary.recovered.toString())} recoveries, ${blue(summary.treated.toString())} under treatment.`);
    } catch (error) {
        console.error("Failed to fetch data.");
    }
}

async function runList() {
    try {
        const stats = await fetchStats();

        const table = new Table([
            new Column("TERRITORY", 24, Color.Default),
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
    } catch (error) {
        console.error("Failed to fetch data.");
    }
}

async function runLive() {
    const cachedItems: { [country: string]: Item } = {};

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const table = new Table([
        new Column("TIME", 8, Color.Default),
        new Column("TERRITORY", 24, Color.Default),
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
        try {
            const items = await fetchStats();
            const differenceFormatter = new NumberFormatter(true);

            items.forEach(async item => {
                const cachedItem = cachedItems[item.country];

                if (cachedItem) {
                    const difference = new Difference(cachedItem, item);

                    if (!difference.isEmpty) {
                        table.printRow([
                            time(),
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
                        ]);
                    }
                }

                cachedItems[item.country] = item;
            });

            await delay(1 * 60 * 1000 + Math.random() * 9 * 60 * 1000);
        } catch (error) {
            console.error("Failed to fetch data. Retrying in 1 minute.");
            await delay(60 * 1000);
        }
    }
}

const args = parse(Deno.args);
const command = args._[0];

switch (command) {
    case "summary":
        runSummary();
        break;

    case "list":
        runList();
        break;

    case "live":
        runLive();
        break;

    default:
        console.error(`No such command '${command}'. Use one of the available commands: 'summary', 'list', 'live'.`);
        break;
}
