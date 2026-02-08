const isObject = (d: unknown): d is Record<string, unknown> =>
    typeof d === 'object' && d !== null;

type FlattenProps = Record<string, string | boolean>;

export function flatten<T>(obj: T, ...props: FlattenProps[]): unknown {
    if (!isObject(obj)) return obj;

    const objProps = Object.keys(obj)
        .filter((k) => !k.startsWith('_'))
        .reduce<Record<string, boolean>>((acc, k) => {
            acc[k] = true;
            return acc;
        }, {});

    const mergedProps: FlattenProps =
        Object.keys(objProps).length > 0
            ? (Object.assign({}, objProps, ...props) as FlattenProps)
            : (Object.assign({}, ...props) as FlattenProps);

    const out: Record<string, unknown> = {};

    for (const [prop, newProp] of Object.entries(mergedProps)) {
        if (!newProp) continue;
        const resolvedProp = newProp === true ? prop : (newProp as string);
        const element = (obj as Record<string, unknown>)[prop];
        const elemIsObj = isObject(element);
        const valueOf =
            elemIsObj && typeof (element as { valueOf?: () => unknown }).valueOf === 'function'
                ? (element as { valueOf: () => unknown }).valueOf()
                : null;
        const hasToJSON = elemIsObj && typeof (element as { toJSON?: () => unknown }).toJSON === 'function';

        if (Array.isArray(element)) {
            out[resolvedProp] = element.map((e) =>
                typeof (e as { toJSON?: () => unknown }).toJSON === 'function'
                    ? (e as { toJSON: () => unknown }).toJSON()
                    : flatten(e)
            );
        } else if (typeof valueOf !== 'object' && valueOf !== null) {
            out[resolvedProp] = valueOf;
        } else if (hasToJSON) {
            out[resolvedProp] = (element as { toJSON: () => unknown }).toJSON();
        } else if (typeof element === 'object' && element !== null) {
            out[resolvedProp] = flatten(element);
        } else if (!elemIsObj) {
            out[resolvedProp] = element;
        }
    }

    return out;
}

export async function timeoutPromise<T>(promise: Promise<T>, ms: number): Promise<T> {
    return await Promise.race([
        promise,
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('TIMEOUT')), ms)
        ),
    ]);
}
