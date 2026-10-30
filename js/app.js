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

// Створюємо історію конвертацій
const historyArray = [];
const historyListContainer = document.querySelector("#history-list");

function renderHistory(historyData) {
  historyListContainer.innerHTML = "";

  for (const item of historyData) {
    const liElement = document.createElement("li");
    liElement.textContent = `Конвертація: ${item.amount} ${item.from} ➔ ${item.to}`;
    historyListContainer.append(liElement);
  }
}

// Вибираємо форму валют за ID
const currencyForm = document.querySelector("#currancy");

currencyForm.addEventListener("submit", function (event) {
  event.preventDefault();

  // Зчитуємо значення полів і приводимо суму до Number
  const amountField = document.querySelector("#number-of-currency");
  const amountValue = Number(amountField.value);
  const fromValue = document.querySelector("#from-currency").value;
  const toValue = document.querySelector("#to-currency").value;

  // Збираємо об'єкт і додаємо в масив
  const newHistoryRecord = {
    amount: amountValue,
    from: fromValue,
    to: toValue,
  };
  historyArray.push(newHistoryRecord);

  // Перемальовуємо список історії
  renderHistory(historyArray);

  currencyForm.reset();
});

// Додаткова валідація для поля суми
const amountInput = document.querySelector("#number-of-currency");

amountInput.addEventListener("input", function () {
  const currentValue = Number(amountInput.value);
  if (currentValue <= 0) {
    amountInput.setCustomValidity("Сума має бути додатною");
  } else {
    amountInput.setCustomValidity("");
  }
});

// Миттєвий перерахунок при зміні валюти
const fromSelectElem = document.querySelector("#from-currency");
const toSelectElem = document.querySelector("#to-currency");
const resultOutput = document.querySelector("#result-currancy");

function calculateInstantResult() {
  const amount = Number(amountInput.value);
  const from = fromSelectElem.value;
  const to = toSelectElem.value;

  if (amount <= 0) {
    resultOutput.textContent = "";
    return;
  }

  const result = (amount / exchangeRates[from]) * exchangeRates[to];

  resultOutput.textContent = `${result.toFixed(2)} ${to}`;
}

// Реагуємо на зміну селектів (change) та введення суми (input)
fromSelectElem.addEventListener("change", calculateInstantResult);
toSelectElem.addEventListener("change", calculateInstantResult);
amountInput.addEventListener("input", calculateInstantResult);

const API_URL = "https://api.frankfurter.app/latest?from=USD&to=UAH";

// Функція для отримання актуальних даних із зовнішнього API
async function loadData() {
  const submitBtn = document.querySelector("#update-rates-btn");
  const errorDisplay = document.querySelector("#error-message");

  if (submitBtn) {
    submitBtn.value = "Завантаження...";
    submitBtn.disabled = true;
  }

  if (errorDisplay) {
    errorDisplay.style.display = "none";
  }

  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error("Перевірте код валюти");
    }

    const data = await response.json();
    console.log("Дані успішно отримано:", data);

    // Виведення даних в DOM
    if (data.rates) {
      listContainer.innerHTML = "";
      renderRates(data.rates);
    }
  } catch (error) {
    console.error("Сталася помилка під час запиту:", error.message);

    if (errorDisplay) {
      errorDisplay.textContent =
        "Перевірте код валюти. Сервер не зміг обробити запит.";
      errorDisplay.style.display = "block";
    }
  } finally {
    if (submitBtn) {
      submitBtn.value = "Оновити курси";
      submitBtn.disabled = false;
    }
  }
}

// Прив'язка мережевого запиту до події натискання для ручного оновлення курсів
const updateBtn = document.querySelector("#update-rates-btn");
if (updateBtn) {
  updateBtn.addEventListener("click", loadData);
}

// автоматичне приховування повідомлення про помилку, коли користувач починає нове введення
const formToWatch = document.querySelector("#currancy");
const errorMsg = document.querySelector("#error-message");

if (formToWatch && errorMsg) {
  formToWatch.addEventListener("input", () => {
    errorMsg.style.display = "none";
  });

  formToWatch.addEventListener("change", () => {
    errorMsg.style.display = "none";
  });
}
