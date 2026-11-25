const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('../js/budget.js');
const BASIC = `Date,Description,Amount
2026-11-01,Salary - Acme Ltd,2400.00
2026-11-02,Tesco Groceries,-68.40
2026-11-03,Rent - Landlord,-950.00`;

test('parses standard Date/Description/Amount headers', () => {
  const rows = L.parseCSV(BASIC);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], { date: '2026-11-01', description: 'Salary - Acme Ltd', amount: 2400, category: 'Income' });
  assert.equal(rows[1].category, 'Groceries');
  assert.equal(rows[2].category, 'Rent');
});

test('parses alternate header names (Transaction Date / Narrative / Debit + Credit)', () => {
  const csv = `Transaction Date,Narrative,Debit,Credit
01/11/2026,Tesco,68.40,
02/11/2026,Salary,,2400.00
03/11/2026,Rent,950.00,`;
  const rows = L.parseCSV(csv);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].amount, -68.4); // debit = money out
  assert.equal(rows[0].date, '2026-11-01'); // dd/mm/yyyy
  assert.equal(rows[1].amount, 2400); // credit = money in
  assert.equal(rows[2].amount, -950);
});

test('parses merchant header and £ amounts with commas and parentheses', () => {
  const csv = 'Date,Merchant,Amount\n2026-11-01,"Tesco, Superstore","£1,234.56"\n2026-11-02,Refund,(45.00)';
  const rows = L.parseCSV(csv);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].amount, 1234.56);
  assert.equal(rows[0].description, 'Tesco, Superstore'); // quoted comma stays in one field
  assert.equal(rows[1].amount, -45); // (45.00) is negative
});

test('ignores blank lines and rows with no usable amount', () => {
  const rows = L.parseCSV('Date,Description,Amount\n\n2026-11-01,Tesco,-10\n2026-11-02,Pending,\n');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].amount, -10);
});

test('returns [] for empty input or unrecognised headers', () => {
  assert.deepEqual(L.parseCSV(''), []);
  assert.deepEqual(L.parseCSV('Foo,Bar,Baz\n1,2,3'), []);
});

test('categorises common merchants', () => {
  assert.equal(L.categorize('Sainsbury\'s Supermarkets'), 'Groceries');
  assert.equal(L.categorize('Uber'), 'Transport');
  assert.equal(L.categorize('Netflix'), 'Subscriptions');
  assert.equal(L.categorize('British Gas'), 'Utilities');
  assert.equal(L.categorize('Odeon Cinema'), 'Entertainment');
  assert.equal(L.categorize('Something unknown'), 'Other');
});

test('category totals: only money-out counts as spending', () => {
  const s = L.computeSummary(L.parseCSV(BASIC));
  assert.equal(s.income, 2400);
  assert.equal(s.spending, 1018.4);
  assert.deepEqual(s.byCategory, { Groceries: 68.4, Rent: 950 });
});

test('money left = income minus spending', () => {
  const s = L.computeSummary(L.parseCSV(BASIC));
  assert.equal(s.moneyLeft, 1381.6);
});

test('budget remaining maths, including over-budget', () => {
  const status = L.budgetStatus({ Groceries: 320, Rent: 950 }, { Groceries: 300, Rent: 950 });
  const g = status.find(b => b.category === 'Groceries');
  const r = status.find(b => b.category === 'Rent');
  assert.equal(g.remaining, -20);
  assert.equal(g.over, true);
  assert.equal(r.remaining, 0);
  assert.equal(r.over, false);
});

test('filterByMonth keeps only that month', () => {
  const rows = L.parseCSV(BASIC + '\n2026-12-01,Tesco,-20');
  assert.equal(L.filterByMonth(rows, '2026-11').length, 3);
  assert.equal(L.filterByMonth(rows, '2026-12').length, 1);
  assert.equal(L.filterByMonth(rows, null).length, 4);
});

test('sample data hand-check: income 2400, spending 1823.16, left 576.84', () => {
  const csv = require('../js/sample-data.js');
  const rows = L.parseCSV(csv);
  const s = L.computeSummary(rows);
  assert.equal(s.count, 27);
  assert.equal(s.income, 2400);
  assert.equal(s.spending, 1823.16);
  assert.equal(s.moneyLeft, 576.84);
  assert.equal(s.byCategory['Groceries'], 275.35);
  assert.equal(s.byCategory['Rent'], 950);
  assert.equal(s.byCategory['Utilities'], 283.4);
  assert.equal(s.byCategory['Eating Out'], 60.14);
});
