// Sample month: November 2026, one salary in, everyday spending out.
// Hand-checked totals: income £2,400.00, spending £1,823.16, money left £576.84.
const SAMPLE_CSV = [
  'Date,Description,Amount',
  '2026-11-01,Salary - Acme Ltd,2400.00',
  '2026-11-01,Rent - Landlord,-950.00',
  '2026-11-02,Tesco Groceries,-68.40',
  '2026-11-03,Starbucks Coffee,-4.85',
  '2026-11-04,TfL Oyster Top Up,-32.50',
  '2026-11-05,Netflix,-10.99',
  '2026-11-06,Sainsbury\'s Groceries,-54.20',
  '2026-11-07,Pret A Manger,-7.20',
  '2026-11-08,Shell Petrol,-45.00',
  '2026-11-09,British Gas,-78.40',
  '2026-11-10,Spotify,-11.99',
  '2026-11-11,Aldi Groceries,-41.75',
  '2026-11-12,Nando\'s Restaurant,-24.50',
  '2026-11-13,Uber,-18.40',
  '2026-11-14,Amazon Order,-34.99',
  '2026-11-15,Water Bill,-32.00',
  '2026-11-16,Tesco Groceries,-72.10',
  '2026-11-17,Deliveroo,-19.99',
  '2026-11-18,Odeon Cinema,-16.50',
  '2026-11-19,PureGym,-25.00',
  '2026-11-20,Boots Pharmacy,-12.40',
  '2026-11-21,Costa Coffee,-3.60',
  '2026-11-22,Broadband,-28.00',
  '2026-11-23,H&M,-28.50',
  '2026-11-24,Lidl Groceries,-38.90',
  '2026-11-25,Council Tax,-145.00',
  '2026-11-26,Barber,-18.00',
].join('\n');
if (typeof window !== 'undefined') window.SAMPLE_CSV = SAMPLE_CSV;
if (typeof module !== 'undefined' && module.exports) module.exports = SAMPLE_CSV;
