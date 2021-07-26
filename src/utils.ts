
// Merge objects from https://stackoverflow.com/a/46973278/16002616

export const mergeObjects = (target: any, ...sources: any[]): any => {
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
};

const isObject = (item: any): boolean => {
    return item !== null && typeof item === "object";
};

const isMergebleObject = (item: any): boolean => {
    return isObject(item) && !Array.isArray(item);
};
