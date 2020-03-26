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

function asNumberOrNull(value: any): number | null {
    if (typeof value === "number") {
        return value;
    } else {
        return null;
    }
}

function asStringOrNull(value: any): string | null {
    if (typeof value === "string") {
        return value;
    } else {
        return null;
    }
}

class Summary {
    constructor(
        public cases: number,
        public deaths: number,
        public recovered: number
    ) { }

    get active(): number {
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
        public cases: number | null,
        public casesToday: number | null,
        public casesPerMillion: number | null,
        public deaths: number | null,
        public deathsToday: number | null,
        public recovered: number | null,
        public active: number | null
    ) { }

    static parseJSON = (json: any): Item => new Item(
        asString(json.country),
        asNumberOrNull(json.cases),
        asNumberOrNull(json.todayCases),
        asNumberOrNull(json.casesPerOneMillion),
        asNumberOrNull(json.deaths),
        asNumberOrNull(json.todayDeaths),
        asNumberOrNull(json.recovered),
        asNumberOrNull(json.active)
    );
}

class Difference {
    cases: number;
    deaths: number;
    recovered: number;

    constructor(oldItem: Item, newItem: Item) {
        this.cases = oldItem.cases && newItem.cases ? newItem.cases - oldItem.cases : 0;
        this.deaths = oldItem.deaths && newItem.deaths ? newItem.deaths - oldItem.deaths : 0;
        this.recovered = oldItem.recovered && newItem.recovered ? newItem.recovered - oldItem.recovered : 0;
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

    printHeaders = () => console.log(
        this.columns.map(e => 
            this.colorize(
                e.header.padEnd(e.width, " "), 
                e.color
            )
        ).join("")
    );

    printRow = (data: string[]) => {
        if (data.length != this.columns.length) {
            return;
        }

        console.log(
            data.map((e, i) =>
                this.colorize(
                    this.clip(
                        e, 
                        this.columns[i].width - 1
                    ).padEnd(this.columns[i].width),
                    this.columns[i].color
                )
            ).join("")
        );
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

    private clip = (text: string, maxLength: number): string => text.length > maxLength
        ? `${text.slice(0, maxLength - 3)}...`
        : text;
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

        console.log(`There are currently ${yellow(summary.cases.toString())} cases, ${red(summary.deaths.toString())} deaths, ${green(summary.recovered.toString())} recoveries, ${blue(summary.active.toString())} active.`);
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
            new Column("CASE PMI", 12, Color.Yellow),
            new Column("DTH ALL", 12, Color.Red),
            new Column("DTH DAY", 12, Color.Red),
            new Column("REC ALL", 12, Color.Green),
            new Column("ACTIVE", 12, Color.Blue)
        ]);

        table.printHeaders();

        stats.forEach(e => {
            table.printRow([
                e.country,
                e.cases !== null ? e.cases.toString() : "-",
                e.casesToday !== null ? e.casesToday.toString() : "-",
                e.casesPerMillion !== null ? e.casesPerMillion.toString() : "-",
                e.deaths !== null ? e.deaths.toString() : "-",
                e.deathsToday !== null ? e.deathsToday.toString() : "-",
                e.recovered !== null ? e.recovered.toString() : "-",
                e.active !== null ? e.active.toString() : "-"
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
        new Column("CASE PMI", 12, Color.Yellow),
        new Column("DTH NEW", 12, Color.Red),
        new Column("DTH ALL", 12, Color.Red),
        new Column("DTH DAY", 12, Color.Red),
        new Column("REC NEW", 12, Color.Green),
        new Column("REC ALL", 12, Color.Green),
        new Column("ACTIVE", 12, Color.Blue)
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
                            item.cases !== null ? item.cases.toString() : "-",
                            item.casesToday !== null ? item.casesToday.toString() : "-",
                            item.casesPerMillion !== null ? item.casesPerMillion.toString() : "-",
                            difference.deaths != 0 ? differenceFormatter.format(difference.deaths) : "",
                            item.deaths !== null ? item.deaths.toString() : "-",
                            item.deathsToday !== null ? item.deathsToday.toString() : "-",
                            difference.recovered != 0 ? differenceFormatter.format(difference.recovered) : "",
                            item.recovered !== null ? item.recovered.toString() : "-",
                            item.active !== null ? item.active.toString() : "-"
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
