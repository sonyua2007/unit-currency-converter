// Зберігаємо курси валют відносно базової валюти
const exchangeRates = {
  USD: 1,
  EUR: 0.92,
  UAH: 41.5,
};

const listContainer = document.querySelector("#rates-list");
const countElement = document.querySelector("#rates-count");

// Видалення статичного прикладу
const staticExample = document.querySelector(".static-example");
if (staticExample) {
  staticExample.remove();
}

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

// Функція рендеру
function renderRates(ratesData) {
  const ratesArray = Object.entries(ratesData);

  for (const entry of ratesArray) {
    const currency = entry[0];
    const rate = entry[1];

    const liElement = document.createElement("li");
    liElement.textContent = `${currency}: ${rate}`;
    liElement.setAttribute("data-rate", rate);
    if (rate > 10) {
      liElement.classList.add("big-rate");
    }

    listContainer.append(liElement);
  }
}

// Виклик функції та оновлення підсумкового елемента
renderRates(exchangeRates);
const ratesCount = Object.keys(exchangeRates).length;
countElement.textContent = `Кількість валют у списку: ${ratesCount}`;
