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

function asObject(value: any): { [index: string]: any } {
    if (typeof value === "object" && value !== null) {
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

function asObjectOrNull(value: any): { [index: string]: any } | null {
    if (typeof value === "object") {
        return value;
    } else {
        return null;
    }
}

class Summary {
    constructor(
        public cases: number,
        public deaths: number,
        public recovered: number,
        public affectedTerritories: number
    ) { }

    get active(): number {
        return this.cases - this.deaths - this.recovered;
    }

    static parseJSON = (json: any): Summary => new Summary(
        asNumber(json.cases),
        asNumber(json.deaths),
        asNumber(json.recovered),
        asNumber(json.affectedCountries)
    );
}

enum SortRule {
    Cases,
    CasesToday,
    Deaths,
    DeathsToday,
    Recovered,
    RecoveredToday,
    Active
}

class ListEntry {
    constructor(
        public territory: string,
        public cases: number | null,
        public casesToday: number | null,
        public deaths: number | null,
        public deathsToday: number | null,
        public recovered: number | null,
        public recoveredToday: number | null,
        public active: number | null
    ) { }

    static parseJSON = (json: any): ListEntry => new ListEntry(
        asString(json.country),
        asNumberOrNull(json.cases),
        asNumberOrNull(json.todayCases),
        asNumberOrNull(json.deaths),
        asNumberOrNull(json.todayDeaths),
        asNumberOrNull(json.recovered),
        asNumberOrNull(json.todayRecovered),
        asNumberOrNull(json.active)
    );

    compare = (other: ListEntry, sortRule: SortRule): number => {
        switch (sortRule) {
            case SortRule.Cases: return (this.cases ?? 0) - (other.cases ?? 0);
            case SortRule.CasesToday: return (this.casesToday ?? 0) - (other.casesToday ?? 0);
            case SortRule.Deaths: return (this.deaths ?? 0) - (other.deaths ?? 0);
            case SortRule.DeathsToday: return (this.deathsToday ?? 0) - (other.deathsToday ?? 0);
            case SortRule.Recovered: return (this.recovered ?? 0) - (other.recovered ?? 0);
            case SortRule.RecoveredToday: return (this.recoveredToday ?? 0) - (other.recoveredToday ?? 0);
            case SortRule.Active: return (this.active ?? 0) - (other.active ?? 0);
        }
    }
}

class ListEntryDifference {
    cases: number;
    deaths: number;
    recovered: number;

    constructor(oldEntry: ListEntry, newEntry: ListEntry) {
        this.cases = oldEntry.cases && newEntry.cases ? newEntry.cases - oldEntry.cases : 0;
        this.deaths = oldEntry.deaths && newEntry.deaths ? newEntry.deaths - oldEntry.deaths : 0;
        this.recovered = oldEntry.recovered && newEntry.recovered ? newEntry.recovered - oldEntry.recovered : 0;
    }

    get isEmpty(): boolean {
        return this.cases == 0 && this.deaths == 0 && this.recovered == 0;
    }
}

enum TimelineSubject {
    Cases,
    Deaths,
    Recovered,
    Active
}

class TimelineEntry {
    constructor(
        public date: string,
        public cases: number | null,
        public casesIncrease: number | null,
        public deaths: number | null,
        public deathsIncrease: number | null,
        public recovered: number | null,
        public recoveredIncrease: number | null,
        public active: number | null,
        public activeIncrease: number | null
    ) { }

    getTotalBySubject = (subject: TimelineSubject): number | null => {
        switch (subject) {
            case TimelineSubject.Cases: return this.cases;
            case TimelineSubject.Deaths: return this.deaths;
            case TimelineSubject.Recovered: return this.recovered;
            case TimelineSubject.Active: return this.active;
        }
    };

    getIncreaseBySubject = (subject: TimelineSubject): number | null => {
        switch (subject) {
            case TimelineSubject.Cases: return this.casesIncrease;
            case TimelineSubject.Deaths: return this.deathsIncrease;
            case TimelineSubject.Recovered: return this.recoveredIncrease;
            case TimelineSubject.Active: return this.activeIncrease;
        }
    };
}

class Timeline {
    constructor(public entries: TimelineEntry[]) { }

    static parseJSON = (json: any): Timeline => {
        const casesJSON = asObjectOrNull(json.timeline.cases) ?? {};
        const deathsJSON = asObjectOrNull(json.timeline.deaths) ?? {};
        const recoveredJSON = asObjectOrNull(json.timeline.recovered) ?? {};

        const intermediateEntries: { [territory: string]: { [subject: string]: number }} = {};

        for (const date in casesJSON) {
            const cases = asNumber(casesJSON[date]);

            if (intermediateEntries[date] === undefined) {
                intermediateEntries[date] = {};
            }

            intermediateEntries[date].cases = cases;
        }

        for (const date in deathsJSON) {
            const deaths = asNumber(deathsJSON[date]);

            if (intermediateEntries[date] === undefined) {
                intermediateEntries[date] = {};
            }

            intermediateEntries[date].deaths = deaths;
        }

        for (const date in recoveredJSON) {
            const recovered = asNumber(recoveredJSON[date]);

            if (intermediateEntries[date] === undefined) {
                intermediateEntries[date] = {};
            }

            intermediateEntries[date].recovered = recovered;
        }

        const entries = new Array<TimelineEntry>();

        for (const date in intermediateEntries) {
            const intermediateEntry = intermediateEntries[date];

            const cases = intermediateEntry.cases !== undefined
                ? intermediateEntry.cases
                : null;

            const deaths = intermediateEntry.deaths !== undefined
                ? intermediateEntry.deaths
                : null;

            const recovered = intermediateEntry.recovered !== undefined
                ? intermediateEntry.recovered
                : null;

            const active = cases !== null && deaths !== null && recovered !== null
                ? cases - deaths - recovered
                : null;

            let previousEntry: TimelineEntry | null = null;
            if (entries.length > 0) {
                previousEntry = entries[entries.length - 1];
            }

            const casesIncrease = previousEntry !== null && previousEntry.cases !== null && previousEntry.cases !== 0 && cases !== null && previousEntry.cases !== cases
                ? (cases - previousEntry.cases) / previousEntry.cases
                : null;

            const deathsIncrease = previousEntry !== null && previousEntry.deaths !== null && previousEntry.deaths !== 0 && deaths !== null && previousEntry.deaths !== deaths
                ? (deaths - previousEntry.deaths) / previousEntry.deaths
                : null;

            const recoveredIncrease = previousEntry !== null && previousEntry.recovered !== null && previousEntry.recovered !== 0 && recovered !== null && previousEntry.recovered !== recovered
                ? (recovered - previousEntry.recovered) / previousEntry.recovered
                : null;

            const activeIncrease = previousEntry !== null && previousEntry.active !== null && previousEntry.active !== 0 && active !== null && previousEntry.active !== active
                ? (active - previousEntry.active) / previousEntry.active
                : null;

            entries.push(
                new TimelineEntry(
                    date,
                    cases,
                    casesIncrease,
                    deaths,
                    deathsIncrease,
                    recovered,
                    recoveredIncrease,
                    active,
                    activeIncrease
                )
            );
        }

        return new Timeline(entries);
    };
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
        console.log(
            this.columns.map(e =>
                this.colorize(
                    e.header.padEnd(e.width, " "),
                    e.color
                )
            ).join("")
        );
    };

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
    constructor(
        public includesPlusSign: boolean,
        public roundsFloats: boolean
    ) { }

    format = (value: number): string => {
        let prefix = "";
        if (this.includesPlusSign && value > 0) prefix = "+";
        if (value < 0) prefix = "-";

        let normalizedValue = value;
        if (this.roundsFloats) {
            normalizedValue = Math.round(normalizedValue);
        }

        normalizedValue = Math.abs(normalizedValue);
        return `${prefix}${normalizedValue}`;
    };
}

function time(): string {
    const date = new Date();
    return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}

async function fetchSummary(): Promise<Summary> {
    const response = await fetch("https://corona.lmao.ninja/v2/all");

    if (!response.ok) {
        throw new APIError();
    }

    return Summary.parseJSON((await response.json() as [any]));
}

async function fetchListEntries(): Promise<Array<ListEntry>> {
    const response = await fetch("https://corona.lmao.ninja/v2/countries");

    if (!response.ok) {
        throw new APIError();
    }

    return (await response.json() as any[]).map(e => ListEntry.parseJSON(e));
}

async function fetchTimeline(territory: string, count: number): Promise<Timeline> {
    const response = await fetch(`https://corona.lmao.ninja/v2/historical/${territory}?lastdays=${count}`);

    if (!response.ok) {
        throw new APIError();
    }

    return Timeline.parseJSON(await response.json());
}

function wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runSummary() {
    try {
        const summary = await fetchSummary();

        console.log(`There are currently ${yellow(summary.cases.toString())} cases, ${red(summary.deaths.toString())} deaths, ${green(summary.recovered.toString())} recoveries, ${blue(summary.active.toString())} active in ${summary.affectedTerritories} affected countries and territories.`);
    } catch (error) {
        console.error("Failed to fetch data.");
    }
}

async function runList(sortRule: SortRule) {
    try {
        const entries = (await fetchListEntries()).sort((a, b) => -a.compare(b, sortRule));

        const table = new Table([
            new Column("TERRITORY", 24, Color.Default),
            new Column("CASE ALL", 12, Color.Yellow),
            new Column("CASE DAY", 12, Color.Yellow),
            new Column("DTH ALL", 12, Color.Red),
            new Column("DTH DAY", 12, Color.Red),
            new Column("REC ALL", 12, Color.Green),
            new Column("REC DAY", 12, Color.Green),
            new Column("ACTIVE", 12, Color.Blue)
        ]);

        table.printHeaders();

        entries.forEach(e => {
            table.printRow([
                e.territory,
                e.cases !== null ? e.cases.toString() : "-",
                e.casesToday !== null ? e.casesToday.toString() : "-",
                e.deaths !== null ? e.deaths.toString() : "-",
                e.deathsToday !== null ? e.deathsToday.toString() : "-",
                e.recovered !== null ? e.recovered.toString() : "-",
                e.recoveredToday !== null ? e.recoveredToday.toString() : "-",
                e.active !== null ? e.active.toString() : "-"
            ]);
        });
    } catch (error) {
        console.error("Failed to fetch data.");
    }
}

async function runLive() {
    const cachedEntries: { [territory: string]: ListEntry } = {};

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
        new Column("REC DAY", 12, Color.Green),
        new Column("ACTIVE", 12, Color.Blue)
    ]);

    table.printHeaders();

    while (true) {
        try {
            const entries = await fetchListEntries();
            const differenceFormatter = new NumberFormatter(true, true);

            entries.forEach(async entry => {
                const cachedEntry = cachedEntries[entry.territory];

                if (cachedEntry) {
                    const difference = new ListEntryDifference(cachedEntry, entry);

                    if (!difference.isEmpty) {
                        table.printRow([
                            time(),
                            entry.territory,
                            difference.cases != 0 ? differenceFormatter.format(difference.cases) : "",
                            entry.cases !== null ? entry.cases.toString() : "-",
                            entry.casesToday !== null ? entry.casesToday.toString() : "-",
                            difference.deaths != 0 ? differenceFormatter.format(difference.deaths) : "",
                            entry.deaths !== null ? entry.deaths.toString() : "-",
                            entry.deathsToday !== null ? entry.deathsToday.toString() : "-",
                            difference.recovered != 0 ? differenceFormatter.format(difference.recovered) : "",
                            entry.recovered !== null ? entry.recovered.toString() : "-",
                            entry.recoveredToday !== null ? entry.recoveredToday.toString() : "-",
                            entry.active !== null ? entry.active.toString() : "-"
                        ]);
                    }
                }

                cachedEntries[entry.territory] = entry;
            });

            await wait(1 * 60 * 1000 + Math.random() * 9 * 60 * 1000);
        } catch (error) {
            console.error("Failed to fetch data. Retrying in 1 minute.");
            await wait(60 * 1000);
        }
    }
}

async function runTimeline(territory: string, count: number, subject: TimelineSubject | null) {
    try {
        const timeline = await fetchTimeline(territory, count);
        const percentageFormatter = new NumberFormatter(true, true);

        if (subject === null) {
            const table = new Table([
                new Column("DATE", 10, Color.Default),
                new Column("CASE ALL", 12, Color.Yellow),
                new Column("CASE INC", 12, Color.Yellow),
                new Column("DTH ALL", 12, Color.Red),
                new Column("DTH INC", 12, Color.Red),
                new Column("REC ALL", 12, Color.Green),
                new Column("REC INC", 12, Color.Green),
                new Column("ACT ALL", 12, Color.Blue),
                new Column("ACT INC", 12, Color.Blue)
            ]);

            table.printHeaders();

            for (const entry of timeline.entries) {
                table.printRow([
                    entry.date,
                    entry.cases !== null ? entry.cases.toString() : "-",
                    entry.casesIncrease !== null ? `${percentageFormatter.format(entry.casesIncrease * 100)}%` : "-",
                    entry.deaths !== null ? entry.deaths.toString() : "-",
                    entry.deathsIncrease !== null ? `${percentageFormatter.format(entry.deathsIncrease * 100)}%` : "-",
                    entry.recovered !== null ? entry.recovered.toString() : "-",
                    entry.recoveredIncrease !== null ? `${percentageFormatter.format(entry.recoveredIncrease * 100)}%` : "-",
                    entry.active !== null ? entry.active.toString() : "-",
                    entry.activeIncrease !== null ? `${percentageFormatter.format(entry.activeIncrease * 100)}%` : "-"
                ]);
            }
        } else {
            let subjectName = "";
            let subjectColor = Color.Default;
            switch (subject) {
                case TimelineSubject.Cases:
                    subjectName = "CASES";
                    subjectColor = Color.Yellow;
                    break;

                case TimelineSubject.Deaths:
                    subjectName = "DEATHS";
                    subjectColor = Color.Red;
                    break;

                case TimelineSubject.Recovered:
                    subjectName = "RECOVERED";
                    subjectColor = Color.Green;
                    break;

                case TimelineSubject.Active:
                    subjectName = "ACTIVE";
                    subjectColor = Color.Blue;
                    break
            }

            const table = new Table([
                new Column("DATE", 10, Color.Default),
                new Column(subjectName, 96, subjectColor)
            ]);

            table.printHeaders();

            const maximumTotal = timeline.entries.reduce((result, next) => Math.max(result, next.getTotalBySubject(subject) ?? 0), 0);

            for (const entry of timeline.entries) {
                const total = entry.getTotalBySubject(subject);
                const increase = entry.getIncreaseBySubject(subject);

                let graph = total !== null && total > 0 && maximumTotal > 0
                    ? "█".repeat(Math.round(total / maximumTotal * 80))
                    : "";

                if (graph !== "") {
                    graph += " ";
                }

                graph += total !== null ? total.toString() : "-";

                if (increase !== null) {
                    graph += ` (${percentageFormatter.format(increase * 100)}%)`;
                }

                table.printRow([
                    entry.date,
                    graph
                ]);
            }
        }
    } catch (error) {
        console.log("Failed to fetch data.");
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

    case "timeline":
        const territoryArg = args._[1];

        if (territoryArg === undefined) {
            console.error("The territory is not speicified.");
            break;
        }

        const territory = territoryArg.toString();

        let days = 30;
        const daysArg = args.days;
        if (daysArg !== undefined && typeof daysArg === "number") {
            days = daysArg;
        }

        let subject: TimelineSubject | null = null;
        switch (args["subject"]) {
            case "cases":
                subject = TimelineSubject.Cases;
                break;

            case "deaths":
                subject = TimelineSubject.Deaths;
                break;

            case "recovered":
                subject = TimelineSubject.Recovered;
                break;

            case "active":
                subject = TimelineSubject.Active;
                break;
        }

        runTimeline(territory, days, subject);
        break;

    default:
        console.error(`No such command '${command}'. Use one of the available commands: 'summary', 'list', 'live', 'timeline'.`);
        break;
}
