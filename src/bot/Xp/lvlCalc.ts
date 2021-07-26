export default function calcLvl(x: number): number {
    return Math.floor(Math.sqrt(x / 100));
}

export function calcXpForLvl(lvl: number): number {
    return Math.floor(lvl) ** 2 * 100;
}

export function calcNextLvl(x: number): number {
    return calcXpForLvl(calcLvl(x) + 1);
}
