// lib/money.ts

export function formatPrice(price: number): string {
  // تنسيق السعر بالدرهم المغربي مباشرة
  return new Intl.NumberFormat('ar-MA', {
    style: 'currency',
    currency: 'MAD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

export function formatMoney(amount: number): string {
  // نفس وظيفة formatPrice ولكن باسم مختلف للتوافق
  return formatPrice(amount);
}