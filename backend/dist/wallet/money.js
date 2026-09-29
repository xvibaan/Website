"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Money = void 0;
/**
 * Exact monetary utility for financial calculations.
 *
 * Avoids JavaScript floating-point arithmetic errors by converting
 * 2-decimal monetary values into integer subunits (BigInt) for calculation,
 * and serializing back to normalized 2-decimal string format.
 */
class Money {
    static SCALE = 100n; // 2 decimal places (e.g., paise)
    /**
     * Converts a monetary string or number into BigInt subunits.
     * Throws Error on negative or invalid formats.
     */
    static toSubunits(amount) {
        const str = typeof amount === 'number' ? amount.toFixed(2) : String(amount).trim();
        if (!/^\d+(\.\d{1,2})?$/.test(str)) {
            throw new Error(`Invalid monetary amount format: '${str}'`);
        }
        const parts = str.split('.');
        const whole = BigInt(parts[0]);
        let fracStr = parts[1] || '';
        if (fracStr.length === 1) {
            fracStr += '0';
        }
        else if (fracStr.length === 0) {
            fracStr = '00';
        }
        const fraction = BigInt(fracStr);
        return whole * Money.SCALE + fraction;
    }
    /**
     * Converts BigInt subunits back to a 2-decimal string representation.
     */
    static fromSubunits(subunits) {
        if (subunits < 0n) {
            throw new Error(`Monetary subunits cannot be negative: ${subunits}`);
        }
        const whole = subunits / Money.SCALE;
        const fraction = subunits % Money.SCALE;
        const fracStr = fraction < 10n ? `0${fraction}` : fraction.toString();
        return `${whole}.${fracStr}`;
    }
    /**
     * Adds two monetary string amounts with exact precision.
     */
    static add(a, b) {
        const sum = Money.toSubunits(a) + Money.toSubunits(b);
        return Money.fromSubunits(sum);
    }
    /**
     * Subtracts amount b from amount a with exact precision.
     * Throws if result would be negative (enforcing non-negative balance rule).
     */
    static subtract(a, b) {
        const subA = Money.toSubunits(a);
        const subB = Money.toSubunits(b);
        if (subA < subB) {
            throw new Error(`Insufficient funds: ${a} < ${b}`);
        }
        return Money.fromSubunits(subA - subB);
    }
    /**
     * Compares whether a >= b.
     */
    static isGreaterThanOrEqual(a, b) {
        return Money.toSubunits(a) >= Money.toSubunits(b);
    }
    /**
     * Checks whether an amount is strictly greater than zero.
     */
    static isPositive(amount) {
        return Money.toSubunits(amount) > 0n;
    }
    /**
     * Formats and normalizes a monetary string to exactly 2 decimal places.
     */
    static format(amount) {
        return Money.fromSubunits(Money.toSubunits(amount));
    }
}
exports.Money = Money;
