namespace Utils {


    // Merge objects from https://stackoverflow.com/a/46973278/16002616
    export function mergeObjects(target: any, ...sources: any[]): any {
        if (!sources.length) {
            return target;
        }
        const source = sources.shift();
        if (source === undefined) {
            return target;
        }

        if (isMergebleObject(target) && isMergebleObject(source)) {
            Object.keys(source).forEach(function (key: string) {
                if (isMergebleObject(source[key])) {
                    if (!target[key]) {
                        target[key] = {};
                    }
                    mergeObjects(target[key], source[key]);
                } else {
                    target[key] = source[key];
                }
            });
        }

        return mergeObjects(target, ...sources);
    }

    function isObject(item: any): boolean {
        return item !== null && typeof item === "object";
    }

    function isMergebleObject(item: any): boolean {
        return isObject(item) && !Array.isArray(item);
    }

    export function random(min: number, max: number): number {
        return Math.round(Math.random() * (max - min) + min);
    }
}


export default Utils;