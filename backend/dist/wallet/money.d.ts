/**
 * Exact monetary utility for financial calculations.
 *
 * Avoids JavaScript floating-point arithmetic errors by converting
 * 2-decimal monetary values into integer subunits (BigInt) for calculation,
 * and serializing back to normalized 2-decimal string format.
 */
export declare class Money {
    private static readonly SCALE;
    /**
     * Converts a monetary string or number into BigInt subunits.
     * Throws Error on negative or invalid formats.
     */
    static toSubunits(amount: string | number): bigint;
    /**
     * Converts BigInt subunits back to a 2-decimal string representation.
     */
    static fromSubunits(subunits: bigint): string;
    /**
     * Adds two monetary string amounts with exact precision.
     */
    static add(a: string, b: string): string;
    /**
     * Subtracts amount b from amount a with exact precision.
     * Throws if result would be negative (enforcing non-negative balance rule).
     */
    static subtract(a: string, b: string): string;
    /**
     * Compares whether a >= b.
     */
    static isGreaterThanOrEqual(a: string, b: string): boolean;
    /**
     * Checks whether an amount is strictly greater than zero.
     */
    static isPositive(amount: string): boolean;
    /**
     * Formats and normalizes a monetary string to exactly 2 decimal places.
     */
    static format(amount: string | number): string;
}
