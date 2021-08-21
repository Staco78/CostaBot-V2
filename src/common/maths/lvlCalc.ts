export default function calcLvl(xp: number): number {
    return Math.floor(Math.sqrt(xp / 100));
}

export function calcXpForLvl(lvl: number): number {
    return Math.floor(lvl) ** 2 * 100;
}

export function calcNextLvl(xp: number): number {
    return calcXpForLvl(calcLvl(xp) + 1);
}
