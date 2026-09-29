// Зберігаємо курси валют відносно базової валюти
const exchangeRates = {
  USD: 1,
  EUR: 0.92,
  UAH: 41.5,
};

// Функція проходить по ключах об'єкта і виводить усі курси в консоль
function showRates() {
  console.log("Доступні курси валют");
  for (const currency of Object.keys(exchangeRates)) {
    console.log(`${currency}: ${exchangeRates[currency]}`);
  }
}

showRates();

// Функція приймає суму та курс і повертає результат конвертації
const convert = (amount, rate) => amount * rate;

// Функція обчислює результат
function processConversion(amount, targetCurrency) {
  const rate = exchangeRates[targetCurrency];
  const finalAmount = convert(amount, rate);

  console.log(`Конвертуємо ${amount} USD у ${targetCurrency}...`);
  console.log(`Результат: ${finalAmount}`);

  if (finalAmount > 10000) {
    console.log("Увага: це велика сума!");
  }
}

// Тест
processConversion(300, "UAH");
processConversion(100, "EUR");
