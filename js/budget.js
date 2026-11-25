// local-budget-dashboard — core logic (pure, no DOM).
// Shared by the browser app (window.BudgetLogic) and the Node test suite.
(function (root) {
  'use strict';

  // Split one CSV line, honouring quoted fields and "" escapes.
  function splitLine(line) {
    const out = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQ) {
        if (c === '"') {
          if (line[i + 1] === '"') { cur += '"'; i++; } else { inQ = false; }
        } else cur += c;
      } else if (c === '"') inQ = true;
      else if (c === ',') { out.push(cur); cur = ''; }
      else cur += c;
    }
    out.push(cur);
    return out.map(s => s.trim());
  }

  function normHeader(h) {
    return (h || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  const DATE_HEADERS = ['date', 'transactiondate', 'transdate', 'postingdate', 'valuedate', 'time'];
  const DESC_HEADERS = ['description', 'desc', 'merchant', 'payee', 'narrative', 'details', 'transaction', 'name', 'memo'];
  const AMOUNT_HEADERS = ['amount', 'value', 'total', 'sum', 'transactionamount'];
  const DEBIT_HEADERS = ['debit', 'moneyout', 'withdrawal', 'paidout', 'spent'];
  const CREDIT_HEADERS = ['credit', 'moneyin', 'deposit', 'paidin', 'received'];

  function findCol(headers, candidates) {
    for (const c of candidates) {
      const i = headers.indexOf(c);
      if (i !== -1) return i;
    }
    return -1;
  }

  function parseAmount(raw) {
    if (raw == null) return null;
    let s = String(raw).trim();
    if (!s) return null;
    let neg = false;
    if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
    s = s.replace(/[£$€,\s]/g, '');
    if (s.startsWith('-')) { neg = true; s = s.slice(1); }
    else if (s.startsWith('+')) s = s.slice(1);
    if (!/^\d+(\.\d+)?$/.test(s)) return null;
    const v = parseFloat(s);
    return neg ? -v : v;
  }

  function parseDate(raw) {
    if (raw == null) return null;
    const s = String(raw).trim();
    if (!s) return null;
    // ISO yyyy-mm-dd
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    // dd/mm/yyyy or dd-mm-yyyy
    m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    // mm/dd/yyyy (only unambiguous when first part > 12, handled by dd/mm above)
    const d = new Date(s);
    if (!isNaN(d)) return d.toISOString().slice(0, 10);
    return s;
  }

  const CATEGORY_RULES = [
    [/tesco|sainsbury|asda|aldi|lidl|morrisons|waitrose|iceland|co-op|coop|supermarket|grocery|grocer|walmart|kroger|safeway|whole foods|trader joe/i, 'Groceries'],
    [/rent|landlord|mortgage|estate agent/i, 'Rent'],
    [/restaurant|cafe|coffee|starbucks|costa|pret|mcdonald|burger|pizza|kfc|subway|takeaway|deliveroo|just eat|ubereats|uber eats|dominos|nando/i, 'Eating Out'],
    [/\b(uber|lyft|taxi|train|trainline|rail|petrol|fuel|shell|bp|esso|tfl|tube|bus|oyster|parking)\b|national rail/i, 'Transport'],
    [/netflix|spotify|disney|prime video|amazon prime|apple music|gym|fitness|audible|youtube premium|hulu|hbo/i, 'Subscriptions'],
    [/electric|gas|water|utility|utilities|council tax|broadband|internet|o2|vodafone|ee |three|mobile|energy|octopus|british gas/i, 'Utilities'],
    [/cinema|odeon|vue|theatre|theater|concert|ticket/i, 'Entertainment'],
    [/pharmacy|boots|dentist|doctor|hospital|chemist|optician/i, 'Health'],
    [/amazon|h&m|zara|ikea|primark|next|asos|ebay|argos|john lewis|shopping|clothes/i, 'Shopping'],
    [/salary|payroll|employer|wages|pay |income/i, 'Income'],
  ];

  function categorize(description) {
    const d = String(description || '');
    for (const [re, cat] of CATEGORY_RULES) {
      if (re.test(d)) return cat;
    }
    return 'Other';
  }

  // Parse CSV text -> [{ date, description, amount, category }]
  // amount: negative = money out (spending), positive = money in (income).
  // Supports: single Amount column, or Debit/Credit column pairs.
  function parseCSV(text) {
    if (!text || !String(text).trim()) return [];
    const lines = String(text).replace(/\r\n?/g, '\n').split('\n').filter(l => l.trim() !== '');
    if (lines.length < 2) return [];
    const headers = splitLine(lines[0]).map(normHeader);
    const dateCol = findCol(headers, DATE_HEADERS);
    const descCol = findCol(headers, DESC_HEADERS);
    const amtCol = findCol(headers, AMOUNT_HEADERS);
    const debitCol = findCol(headers, DEBIT_HEADERS);
    const creditCol = findCol(headers, CREDIT_HEADERS);
    if (descCol === -1 && amtCol === -1 && debitCol === -1 && creditCol === -1) return [];
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const cells = splitLine(lines[i]);
      let amount = null;
      if (amtCol !== -1) amount = parseAmount(cells[amtCol]);
      else {
        const d = debitCol !== -1 ? parseAmount(cells[debitCol]) : null;
        const c = creditCol !== -1 ? parseAmount(cells[creditCol]) : null;
        if (d != null && d !== 0) amount = -Math.abs(d);
        else if (c != null && c !== 0) amount = Math.abs(c);
      }
      if (amount == null) continue;
      const description = descCol !== -1 ? (cells[descCol] || '') : '';
      rows.push({
        date: dateCol !== -1 ? parseDate(cells[dateCol]) : null,
        description,
        amount: Math.round(amount * 100) / 100,
        category: categorize(description),
      });
    }
    return rows;
  }

  function round2(n) { return Math.round(n * 100) / 100; }

  function computeSummary(rows) {
    let income = 0, spending = 0;
    const byCategory = {};
    for (const r of rows) {
      if (r.amount >= 0) income += r.amount;
      else {
        spending += -r.amount;
        byCategory[r.category] = round2((byCategory[r.category] || 0) + -r.amount);
      }
    }
    return {
      income: round2(income),
      spending: round2(spending),
      moneyLeft: round2(income - spending),
      byCategory,
      count: rows.length,
    };
  }

  const DEFAULT_BUDGETS = {
    'Groceries': 300, 'Rent': 950, 'Transport': 120, 'Eating Out': 150,
    'Subscriptions': 40, 'Utilities': 180, 'Entertainment': 60,
    'Health': 50, 'Shopping': 100, 'Other': 80,
  };

  function budgetStatus(byCategory, budgets) {
    const b = budgets || DEFAULT_BUDGETS;
    return Object.keys(b).map(cat => {
      const spent = byCategory[cat] || 0;
      return { category: cat, budget: b[cat], spent: round2(spent), remaining: round2(b[cat] - spent), over: spent > b[cat] };
    }).sort((a, z) => z.spent - a.spent);
  }

  function filterByMonth(rows, ym) {
    if (!ym) return rows;
    return rows.filter(r => r.date && r.date.slice(0, 7) === ym);
  }

  const api = { splitLine, parseAmount, parseDate, categorize, parseCSV, computeSummary, budgetStatus, filterByMonth, DEFAULT_BUDGETS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BudgetLogic = api;
})(typeof window !== 'undefined' ? window : globalThis);
