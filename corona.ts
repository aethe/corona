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

enum SortRule {
    Cases,
    CasesToday,
    Deaths,
    DeathsToday,
    Recovered,
    Active
}

class Entry {
    constructor(
        public country: string,
        public cases: number | null,
        public casesToday: number | null,
        public deaths: number | null,
        public deathsToday: number | null,
        public recovered: number | null,
        public active: number | null
    ) { }

    static parseJSON = (json: any): Entry => new Entry(
        asString(json.country),
        asNumberOrNull(json.cases),
        asNumberOrNull(json.todayCases),
        asNumberOrNull(json.deaths),
        asNumberOrNull(json.todayDeaths),
        asNumberOrNull(json.recovered),
        asNumberOrNull(json.active)
    );

    compare = (other: Entry, sortRule: SortRule): number => {
        switch (sortRule) {
            case SortRule.Cases: return (this.cases ?? 0) - (other.cases ?? 0);
            case SortRule.CasesToday: return (this.casesToday ?? 0) - (other.casesToday ?? 0);
            case SortRule.Deaths: return (this.deaths ?? 0) - (other.deaths ?? 0);
            case SortRule.DeathsToday: return (this.deathsToday ?? 0) - (other.deathsToday ?? 0);
            case SortRule.Recovered: return (this.recovered ?? 0) - (other.recovered ?? 0);
            case SortRule.Active: return (this.active ?? 0) - (other.active ?? 0);
        }
    }
}

class Difference {
    cases: number;
    deaths: number;
    recovered: number;

    constructor(oldEntry: Entry, newEntry: Entry) {
        this.cases = oldEntry.cases && newEntry.cases ? newEntry.cases - oldEntry.cases : 0;
        this.deaths = oldEntry.deaths && newEntry.deaths ? newEntry.deaths - oldEntry.deaths : 0;
        this.recovered = oldEntry.recovered && newEntry.recovered ? newEntry.recovered - oldEntry.recovered : 0;
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

async function fetchEntries(): Promise<Array<Entry>> {
    const response = await fetch("https://corona.lmao.ninja/countries");

    if (!response.ok) {
        throw new APIError();
    }
    
    return (await response.json() as [any]).map(e => Entry.parseJSON(e));
}

async function wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runSummary() {
    try {
        const summary = await fetchSummary();

        console.log(`There are currently ${yellow(summary.cases.toString())} cases, ${red(summary.deaths.toString())} deaths, ${green(summary.recovered.toString())} recoveries, ${blue(summary.active.toString())} active.`);
    } catch (error) {
        console.error("Failed to fetch data.");
    }
}

async function runList(sortRule: SortRule) {
    try {
        const stats = (await fetchEntries()).sort((a, b) => -a.compare(b, sortRule));

        const table = new Table([
            new Column("TERRITORY", 24, Color.Default),
            new Column("CASE ALL", 12, Color.Yellow),
            new Column("CASE DAY", 12, Color.Yellow),
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
    const cachedEntries: { [country: string]: Entry } = {};

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
        new Column("ACTIVE", 12, Color.Blue)
    ]);

    table.printHeaders();

    while (true) {
        try {
            const entries = await fetchEntries();
            const differenceFormatter = new NumberFormatter(true);

            entries.forEach(async entry => {
                const cachedEntry = cachedEntries[entry.country];

                if (cachedEntry) {
                    const difference = new Difference(cachedEntry, entry);

                    if (!difference.isEmpty) {
                        table.printRow([
                            time(),
                            entry.country,
                            difference.cases != 0 ? differenceFormatter.format(difference.cases) : "",
                            entry.cases !== null ? entry.cases.toString() : "-",
                            entry.casesToday !== null ? entry.casesToday.toString() : "-",
                            difference.deaths != 0 ? differenceFormatter.format(difference.deaths) : "",
                            entry.deaths !== null ? entry.deaths.toString() : "-",
                            entry.deathsToday !== null ? entry.deathsToday.toString() : "-",
                            difference.recovered != 0 ? differenceFormatter.format(difference.recovered) : "",
                            entry.recovered !== null ? entry.recovered.toString() : "-",
                            entry.active !== null ? entry.active.toString() : "-"
                        ]);
                    }
                }

                cachedEntries[entry.country] = entry;
            });
            
            await wait(1 * 60 * 1000 + Math.random() * 9 * 60 * 1000);
        } catch (error) {
            console.error("Failed to fetch data. Retrying in 1 minute.");
            await wait(60 * 1000);
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
        let sortRule = SortRule.Cases;
        switch (args["sort"]) {
            case "cases":
                sortRule = SortRule.Cases;
                break;

            case "cases-today":
                sortRule = SortRule.CasesToday;
                break;

            case "deaths":
                sortRule = SortRule.Deaths;
                break;

            case "deaths-today":
                sortRule = SortRule.DeathsToday;
                break;
                
            case "recovered":
                sortRule = SortRule.Recovered;
                break;

            case "active":
                sortRule = SortRule.Active;
                break;
        }

        runList(sortRule);
        break;

    case "live":
        runLive();
        break;

    default:
        console.error(`No such command '${command}'. Use one of the available commands: 'summary', 'list', 'live'.`);
        break;
}
