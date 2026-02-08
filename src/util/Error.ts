const kCode = Symbol('code');

type ErrorBaseConstructor = new (message?: string) => Error;

function createErrorMessage(
    ErrorBase: ErrorBaseConstructor = Error as ErrorBaseConstructor
): new (key: string, ...args: string[]) => InstanceType<ErrorBaseConstructor> & { code: string } {
    class DiscordFivemApiError extends ErrorBase {
        constructor(key: string, ...args: string[]) {
            super(...args);
            (this as unknown as { [kCode]: string })[kCode] = key;
            if (Error.captureStackTrace) {
                Error.captureStackTrace(this, DiscordFivemApiError);
            }
        }

        get name(): string {
            return `[DiscordFivemApi] ${super.name} [${(this as unknown as { [kCode]: string })[kCode]}]`;
        }

        get code(): string {
            return (this as unknown as { [kCode]: string })[kCode];
        }

        override toString(): string {
            return `[DiscordFivemApi] ${super.toString()} [${(this as unknown as { [kCode]: string })[kCode]}]`;
        }
    }

    return DiscordFivemApiError as new (
        key: string,
        ...args: string[]
    ) => InstanceType<ErrorBaseConstructor> & { code: string };
}

export const DfaError = createErrorMessage(Error);
export const DfaTypeError = createErrorMessage(TypeError as ErrorBaseConstructor);
export { createErrorMessage };
