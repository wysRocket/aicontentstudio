import assert from "node:assert/strict";
import test from "node:test";
import {
  formatCreditAmount,
  formatEuroAmount,
  formatEuroRatePerHundredCredits,
} from "./formatting";

test("euro amounts always show two decimals", () => {
  assert.equal(formatEuroAmount(5), "EUR 5.00");
  assert.equal(formatEuroAmount(20), "EUR 20.00");
  assert.equal(formatEuroAmount(12.5), "EUR 12.50");
});

test("credit amounts stay grouped without decimal noise", () => {
  assert.equal(formatCreditAmount(1000), "1,000");
  assert.equal(formatCreditAmount(2500), "2,500");
});

test("per-hundred rates are normalized to two decimal places", () => {
  assert.equal(formatEuroRatePerHundredCredits(5, 100), "EUR 5.00");
  assert.equal(formatEuroRatePerHundredCredits(110, 5000), "EUR 2.20");
});
