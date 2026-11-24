// Було обрано React, оскільки за результатами порівняння він виявився ближчим до звичайного JavaScript,
// тоді як Vue використовує специфічні HTML-шаблони

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

/*
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
*/

// Виклик функції та оновлення підсумкового елемента
//renderRates(exchangeRates);

const ratesCount = Object.keys(exchangeRates).length;
countElement.textContent = `Кількість валют у списку: ${ratesCount}`;

// Створюємо історію конвертацій
const STORAGE_KEY = "conversion_history";

// Зберігає масив записів історії у localStorage
function saveToLocalStorage(items) {
  try {
    const jsonString = JSON.stringify(items);
    localStorage.setItem(STORAGE_KEY, jsonString);
  } catch (error) {
    console.error("Помилка збереження у localStorage:", error);
  }
}

// Завантажує масив записів із localStorage (повертає [] у разі помилки або відсутності даних)
function loadFromLocalStorage() {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    if (!rawData) {
      return [];
    }
    const parsedData = JSON.parse(rawData);
    return Array.isArray(parsedData) ? parsedData : [];
  } catch (error) {
    console.error("Помилка читання з localStorage:", error);
    return [];
  }
}

const DB_NAME = "CurrencyConverterDB";
const DB_VERSION = 1;
const STORE_NAME = "history";

// Підключення до IndexedDB та створення object store при першому запуску
function openDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("Браузер не підтримує IndexedDB"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject(
        event.target.error ||
          new Error("Помилка відкриття бази даних IndexedDB"),
      );
    };
  });
}

async function runStoreRequest(mode, operation) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const store = db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
    const request = operation(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// CRUD-функції
const addItem = (item) =>
  runStoreRequest("readwrite", (store) => store.add(item));
const updateItem = (item) =>
  runStoreRequest("readwrite", (store) => store.put(item));
const getAllItems = () =>
  runStoreRequest("readonly", (store) => store.getAll());
const deleteItem = (id) =>
  runStoreRequest("readwrite", (store) => store.delete(id));

const MIGRATION_FLAG = "history_migrated_to_idb";

// Одноразова міграція даних із localStorage в IndexedDB
async function migrateFromLocalStorage() {
  if (localStorage.getItem(MIGRATION_FLAG) === "true") {
    return;
  }

  const existingItems = await getAllItems();
  const localItems = loadFromLocalStorage();

  if (existingItems.length === 0 && localItems.length > 0) {
    for (const item of localItems) {
      // Призначаємо новий id через autoIncrement
      const { id, ...recordWithoutId } = item;
      await addItem(recordWithoutId);
    }
  }

  localStorage.setItem(MIGRATION_FLAG, "true");
}

const historyListContainer = document.querySelector("#history-list");

// Отримання елемента Canvas та його 2D-контексту
const historyCanvas = document.querySelector("#history-chart");
const ctx = historyCanvas ? historyCanvas.getContext("2d") : null;
const chartToggleBtn = document.querySelector("#chart-toggle-btn");

let animationFrameId = null;
let isChartPaused = false;
let chartProgress = 0;
let lastChartRecords = [];
let lastChartCurrency = "EUR";
let currentChartCurrency = "EUR";
let resumeChartFn = null;

// Малювання міні-графіка останніх результатів для обраної цільової валюти
function drawHistoryChart(records, targetCurrency = currentChartCurrency) {
  if (!ctx || !historyCanvas) return;

  lastChartRecords = records;
  lastChartCurrency = targetCurrency;

  // Зупиняємо попередню анімацію перед запуском нової
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  const width = historyCanvas.width;
  const height = historyCanvas.height;
  const paddingTop = 34;
  const paddingSide = 34;
  const paddingBottom = 20;

  // Фільтруємо останні 10 записів для обраної цільової валюти
  const filteredByCurrency = records
    .filter((item) => item.to === targetCurrency)
    .slice(0, 10)
    .reverse();

  const values = filteredByCurrency
    .map((item) => Number(item.result))
    .filter((num) => !Number.isNaN(num));

  // Якщо записів менше 2 - показуємо підказку
  if (values.length < 2) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#64748b";
    ctx.font = "13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      `Додайте мінімум 2 конвертації у ${targetCurrency} для графіка`,
      width / 2,
      height / 2,
    );
    if (chartToggleBtn) chartToggleBtn.style.display = "none";
    return;
  }

  if (chartToggleBtn) {
    chartToggleBtn.style.display = "inline-block";
    chartToggleBtn.textContent = "Пауза";
  }

  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  // Обчислюємо координати (x, y) для кожної точки на Canvas
  const plotWidth = width - paddingSide * 2;
  const plotHeight = height - paddingTop - paddingBottom;
  const points = values.map((val, index) => {
    const x = paddingSide + (index / (values.length - 1)) * plotWidth;
    const normalizedY = (val - minVal) / range;
    const y = height - paddingBottom - normalizedY * plotHeight;
    return { x, y, val };
  });

  chartProgress = 0;
  isChartPaused = false;

  function renderFrame() {
    if (isChartPaused) return;

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = "#2b3a67";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`Динаміка результатів у ${targetCurrency}`, paddingSide, 16);

    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 2; i++) {
      const gridY = paddingTop + (plotHeight / 2) * i;
      ctx.beginPath();
      ctx.moveTo(paddingSide, gridY);
      ctx.lineTo(width - paddingSide, gridY);
      ctx.stroke();
    }

    // Обмежуємо область малювання по ширині відповідно до прогресу анімації
    const currentClipX = paddingSide + plotWidth * chartProgress;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, currentClipX + 16, height);
    ctx.clip();

    // Лінія графіка
    ctx.strokeStyle = "#2b3a67";
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    points.forEach((pt, idx) => {
      if (idx === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();

    // Точки та числові значення біля них
    points.forEach((pt) => {
      ctx.fillStyle = "#2b3a67";
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#334155";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(pt.val.toFixed(2), pt.x, pt.y - 8);
    });

    ctx.restore();

    if (chartProgress < 1) {
      chartProgress = Math.min(1, chartProgress + 0.005);
      animationFrameId = requestAnimationFrame(renderFrame);
    } else {
      animationFrameId = null;
      if (chartToggleBtn) chartToggleBtn.textContent = "Повторити анімацію";
    }
  }

  resumeChartFn = renderFrame;
  animationFrameId = requestAnimationFrame(renderFrame);
}

// Керування анімацією
if (chartToggleBtn) {
  chartToggleBtn.addEventListener("click", () => {
    if (chartProgress >= 1) {
      drawHistoryChart(lastChartRecords, lastChartCurrency);
    } else if (isChartPaused) {
      isChartPaused = false;
      chartToggleBtn.textContent = "Пауза";
      if (resumeChartFn)
        animationFrameId = requestAnimationFrame(resumeChartFn);
    } else {
      isChartPaused = true;
      chartToggleBtn.textContent = "Продовжити";
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    }
  });
}

// Зупинка анімації при згортанні вкладки або виході зі сторінки
document.addEventListener("visibilitychange", () => {
  if (document.hidden && animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  } else if (
    !document.hidden &&
    !isChartPaused &&
    chartProgress < 1 &&
    resumeChartFn
  ) {
    animationFrameId = requestAnimationFrame(resumeChartFn);
  }
});

window.addEventListener("beforeunload", () => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
});

/*function renderHistory(historyData) {
  if (!historyListContainer) return;
  historyListContainer.innerHTML = "";

  for (const item of historyData) {
    const liElement = document.createElement("li");
    liElement.textContent = `Конвертація: ${item.amount} ${item.from} ➔ ${item.result} ${item.to}`;
    historyListContainer.append(liElement);
  }
}*/

//renderHistory(historyArray);
async function renderHistoryFromDB() {
  if (!historyListContainer) return;

  const allItems = await getAllItems();

  const latestTen = allItems
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10);

  historyListContainer.innerHTML = "";

  for (const item of latestTen) {
    const liElement = document.createElement("li");
    liElement.textContent = `Конвертація: ${item.amount} ${item.from} ➔ ${item.result} ${item.to}`;
    historyListContainer.append(liElement);
  }

  drawHistoryChart(latestTen);
}

async function initStorage() {
  try {
    await migrateFromLocalStorage();
    await renderHistoryFromDB();
  } catch (error) {
    console.error("Помилка роботи з IndexedDB:", error);
    if (historyListContainer) {
      historyListContainer.innerHTML = `<li>Не вдалося завантажити історію: база даних IndexedDB недоступна.</li>`;
    }
  }
}

initStorage();

/*
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
*/

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
    /*if (data.rates) {
      listContainer.innerHTML = "";
      renderRates(data.rates);
    }*/
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

function RateItem(props) {
  return (
    <li className="rate-item">
      <span>Курс {props.code}: </span>
      <strong>{props.rate}</strong>

      <button className="delete-btn" onClick={() => props.onDelete(props.id)}>
        Видалити
      </button>
    </li>
  );
}

// Компонент Конвертера з похідним станом
function ConverterForm(props) {
  const [amount, setAmount] = React.useState("100");
  const [fromUnit, setFromUnit] = React.useState("USD");
  const [toUnit, setToUnit] = React.useState("EUR");

  const codes = props.ratesList.map((r) => r.code);
  if (codes.length === 0) {
    return <p>Немає доступних валют</p>;
  }

  const from = codes.includes(fromUnit) ? fromUnit : codes[0];
  const to = codes.includes(toUnit) ? toUnit : codes[0];

  React.useEffect(() => {
    currentChartCurrency = to;
    renderHistoryFromDB();
  }, [to]);

  const fromRate = props.ratesList.find((r) => r.code === from).rate;
  const toRate = props.ratesList.find((r) => r.code === to).rate;

  const numericAmount = Number(amount);
  const isValid = numericAmount > 0;

  const result = isValid
    ? ((numericAmount / fromRate) * toRate).toFixed(2)
    : "";

  const options = props.ratesList.map((r) => (
    <option key={r.id} value={r.code}>
      {r.code}
    </option>
  ));

  function handleSwap() {
    setFromUnit(to);
    setToUnit(from);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!isValid) return;
    props.onSave({
      amount: numericAmount,
      from,
      to,
      result,
      timestamp: Date.now(),
    });
    setAmount("");
  }

  return (
    <form id="currancy" onSubmit={handleSubmit}>
      <label htmlFor="number-of-currency">Сума: </label>
      <input
        type="number"
        id="number-of-currency"
        name="amount"
        min="0.01"
        step="0.01"
        placeholder="0.00"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <div className="converter-row">
        <label htmlFor="from-currency">З якої валюти</label>
        <select
          id="from-currency"
          value={from}
          onChange={(e) => setFromUnit(e.target.value)}
        >
          {options}
        </select>

        <button type="button" className="swap-btn" onClick={handleSwap}>
          ⇄
        </button>

        <label htmlFor="to-currency">В яку валюту</label>
        <select
          id="to-currency"
          value={to}
          onChange={(e) => setToUnit(e.target.value)}
        >
          {options}
        </select>
      </div>

      <div className="button-group">
        <input type="submit" value="Зберегти в історію" disabled={!isValid} />
      </div>

      <label htmlFor="result-currancy">Результат: </label>
      <output id="result-currancy">{result && `${result} ${to}`}</output>
    </form>
  );
}

function CurrencyApp() {
  const [ratesList, setRatesList] = React.useState([
    { id: 1, code: "USD", rate: 1.0 },
    { id: 2, code: "EUR", rate: 0.92 },
    { id: 3, code: "UAH", rate: 41.5 },
  ]);

  const handleDelete = (idToRemove) => {
    setRatesList(ratesList.filter((currency) => currency.id !== idToRemove));
  };

  const handleSave = async (record) => {
    try {
      await addItem(record);
      await renderHistoryFromDB();
    } catch (error) {
      console.error("Помилка збереження запису в IndexedDB:", error);
    }
  };

  const listNode = document.getElementById("rates-list");

  return (
    <>
      <ConverterForm ratesList={ratesList} onSave={handleSave} />

      {listNode &&
        ReactDOM.createPortal(
          ratesList.map((currency) => (
            <RateItem
              key={currency.id}
              id={currency.id}
              code={currency.code}
              rate={currency.rate}
              onDelete={handleDelete}
            />
          )),
          listNode,
        )}
    </>
  );
}

const rootNode = document.getElementById("react-root");
if (rootNode) {
  const root = ReactDOM.createRoot(rootNode);
  root.render(<CurrencyApp />);
}
