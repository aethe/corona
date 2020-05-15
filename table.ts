import { red, yellow, green, blue } from "https://deno.land/std/fmt/colors.ts";

export enum Color {
    Default,
    Red,
    Yellow,
    Green,
    Blue
}

export class Column {
    constructor(
        public header: string,
        public width: number,
        public color: Color
    ) { }
}

export class Table {
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
