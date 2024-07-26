interface WaitForConditionOptions<T> {
    targetFunction: () => T | Promise<T>;
    validatorFunction?: (result: T) => boolean;
    interval?: number;
    timeout?: number;
}

export async function waitForCondition<T>({
    targetFunction,
    validatorFunction = (result) => Boolean(result) === true,
    interval = 500,
    timeout = 10000
}: WaitForConditionOptions<T>): Promise<T> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        let result: T;

        try {
            result = await Promise.resolve(targetFunction());
        } catch (error) {
            throw new Error('Error in targetFunction: ' + (error as Error).message);
        }

        if (validatorFunction(result)) {
            return result;
        }

        await delay(interval);
    }

    throw new Error('Timeout waiting for condition');
}

export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
