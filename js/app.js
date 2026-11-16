
// ===================================
// КОПЕЙКИ — УЧЁТ ФИНАНСОВ
// ===================================

// Категории по умолчанию
const defaultCategories = {
    income: [
        "Зарплата на заводе",
        "Зарплата в офисе",
        "Дополнительный доход",
        "Прочие поступления"
    ],
    expense: [
        "Продукты",
        "Коммунальные услуги",
        "Транспорт",
        "Кафе и перекусы",
        "Кредиты",
        "Ипотека",
        "Одежда",
        "Здоровье",
        "Развлечения",
        "На радость",
        "Прочие расходы"
    ]
};

// Загрузка сохранённых данных
function loadStorage(key, fallback) {
    try {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : fallback;
    } catch (error) {
        return fallback;
    }
}

let categories = loadStorage(
    "kopeiki_categories",
    defaultCategories
);


// ===================================
// ЦВЕТА КАТЕГОРИЙ РАСХОДОВ
// ===================================

let categoryColors = loadStorage(
    "kopeiki_category_colors",
    {}
);

if (
    !categoryColors ||
    typeof categoryColors !== "object" ||
    Array.isArray(categoryColors)
) {
    categoryColors = {};
}

// Цвета по умолчанию
const defaultExpenseColors = [
    "#22C55E",
    "#3B82F6",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#EC4899",
    "#06B6D4",
    "#F97316",
    "#64748B",
    "#A3E635",
    "#D946EF"
];

// Получение цвета категории
function getCategoryColor(category, index = 0) {
    const savedColor = categoryColors[category];

    if (
        typeof savedColor === "string" &&
        /^#[0-9A-Fa-f]{6}$/.test(savedColor)
    ) {
        return savedColor;
    }

    return defaultExpenseColors[
        index % defaultExpenseColors.length
    ];
}

// Сохранение цветов
function saveCategoryColors() {
    localStorage.setItem(
        "kopeiki_category_colors",
        JSON.stringify(categoryColors)
    );
}


let transactions = loadStorage(
    "kopeiki_transactions",
    []
);

let currentType = "income";
let editingTransactionId = null;

// Элементы приложения
const modal = document.getElementById("operationModal");
const modalTitle = document.getElementById("modalTitle");

const amountInput = document.getElementById("amount");
const categorySelect = document.getElementById("category");
const dateInput = document.getElementById("date");
const commentInput = document.getElementById("comment");

// Переключатель типа операции
// Удаляем старый переключатель, если он остался вне окна
document.querySelectorAll(".operation-type-field")
    .forEach(element => element.remove());

document.querySelectorAll("#operationType")
    .forEach(element => element.remove());

document.querySelectorAll('label[for="operationType"]')
    .forEach(element => element.remove());

// Создаём новый переключатель
const operationTypeField = document.createElement("div");

operationTypeField.className = "form-group operation-type-field";
operationTypeField.style.display = "block";
operationTypeField.style.width = "100%";
operationTypeField.style.boxSizing = "border-box";
operationTypeField.style.marginBottom = "12px";

const operationTypeLabel = document.createElement("label");

operationTypeLabel.htmlFor = "operationType";
operationTypeLabel.textContent = "Тип операции";
operationTypeLabel.style.display = "block";
operationTypeLabel.style.marginBottom = "6px";

const operationTypeSelect = document.createElement("select");

operationTypeSelect.id = "operationType";
operationTypeSelect.className = categorySelect.className;

operationTypeSelect.innerHTML = `
    <option value="income">Доход</option>
    <option value="expense">Расход</option>
`;

operationTypeSelect.style.display = "block";
operationTypeSelect.style.width = "100%";
operationTypeSelect.style.boxSizing = "border-box";

operationTypeField.append(
    operationTypeLabel,
    operationTypeSelect
);

// Размещаем переключатель внутри окна операции
const categoryLabel = modal.querySelector(
    'label[for="category"]'
);

const categoryGroup = categoryLabel
    ? categoryLabel.closest(".form-group")
    : categorySelect.closest(".form-group");

if (
    categoryGroup &&
    modal.contains(categoryGroup) &&
    categoryGroup.parentNode
) {
    categoryGroup.parentNode.insertBefore(
        operationTypeField,
        categoryGroup
    );

} else if (
    categoryLabel &&
    modal.contains(categoryLabel)
) {
    categoryLabel.parentNode.insertBefore(
        operationTypeField,
        categoryLabel
    );

} else if (modal.contains(categorySelect)) {
    categorySelect.parentNode.insertBefore(
        operationTypeField,
        categorySelect
    );

} else {
    const modalContent =
        modal.querySelector(".modal-content, .modal-body") || modal;

    modalContent.appendChild(operationTypeField);
}

const balanceElement = document.getElementById("balance");
const incomeElement = document.getElementById("income");
const expensesElement = document.getElementById("expenses");
const expenseDayElement = document.getElementById("expenseDay");
const expenseWeekElement = document.getElementById("expenseWeek");
const expenseMonthElement = document.getElementById("expenseMonth");
const transactionsElement = document.getElementById("transactions");
const expenseChartCanvas = document.getElementById("expenseChart");
const expenseChartLegend = document.getElementById("expenseChartLegend");
const expenseChartEmpty = document.getElementById("expenseChartEmpty");

const categoryModal = document.getElementById("categoryModal");
const categoryType = document.getElementById("categoryType");
const newCategoryInput = document.getElementById("newCategory");
const categoryList = document.getElementById("categoryList");

// Форматирование тенге
function formatMoney(value) {
    return new Intl.NumberFormat("ru-RU").format(value) + " ₸";
}

// ===================================
// КОЛЬЦЕВАЯ ДИАГРАММА РАСХОДОВ
// ===================================

function renderExpenseChart() {
    const canvas = expenseChartCanvas;
    const legend = expenseChartLegend;
    const empty = expenseChartEmpty;

    if (!canvas || !legend || !empty) return;

    const currentMonth = today().slice(0, 7);

    // Собираем расходы текущего месяца
    const totals = new Map();

    transactions.forEach(item => {
        if (
            item.type !== "expense" ||
            !item.date ||
            item.date.slice(0, 7) !== currentMonth
        ) {
            return;
        }

        const category = item.category || "Без категории";
        const amount = Number(item.amount) || 0;

        totals.set(
            category,
            (totals.get(category) || 0) + amount
        );
    });

    // Сортируем категории по сумме расходов
    const categoryNames = [
        ...(categories.expense || [])
    ];

    totals.forEach((value, category) => {
        if (!categoryNames.includes(category)) {
            categoryNames.push(category);
        }
    });

    const data = categoryNames
        .filter(category => totals.has(category))
        .map((category, index) => ({
            category,
            amount: totals.get(category),
            color: getCategoryColor(category, index)
        }))
        .filter(item => item.amount > 0);

    const total = data.reduce(
        (sum, item) => sum + item.amount,
        0
    );

    const context = canvas.getContext("2d");

    if (!context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    legend.innerHTML = "";

    // Если расходов нет
    if (total === 0) {
        canvas.style.display = "none";
        legend.style.display = "none";
        empty.hidden = false;
        return;
    }

    canvas.style.display = "block";
    legend.style.display = "flex";
    empty.hidden = true;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 105;

    let startAngle = -Math.PI / 2;

    // Рисуем цветные сектора
    data.forEach(item => {
        const angle = item.amount / total * Math.PI * 2;

        context.beginPath();
        context.arc(
            centerX,
            centerY,
            radius,
            startAngle,
            startAngle + angle
        );

        context.strokeStyle = item.color;
        context.lineWidth = 42;
        context.lineCap = "butt";
        context.stroke();

        startAngle += angle;
    });

    // Подпись в центре
    context.textAlign = "center";
    context.textBaseline = "middle";

    context.fillStyle = "#FFF";
    context.font = "22px Arial";
    context.fillText(
        "Расходы",
        centerX,
        centerY - 15
    );

    context.fillStyle = "#fff";
    context.font = "bold 28px Arial";
    context.fillText(
        formatMoney(total),
        centerX,
        centerY + 16
    );

    // Формируем легенду
    data.forEach(item => {
        const percentage = (
            item.amount / total * 100
        ).toFixed(1);

        const row = document.createElement("div");
        row.className = "expense-legend-item";

        const color = document.createElement("span");
        color.className = "expense-legend-color";
        color.style.backgroundColor = item.color;

        const name = document.createElement("span");
        name.textContent = item.category;

        const value = document.createElement("strong");
        value.textContent =
            formatMoney(item.amount) +
            " · " + percentage + "%";

        row.append(color, name, value);
        legend.appendChild(row);
    });
}


// Сегодняшняя дата
function today() {
    const now = new Date();
    const offset = now.getTimezoneOffset();

    return new Date(now.getTime() - offset * 60000)
        .toISOString()
        .slice(0, 10);
}

// Сохранение данных
function saveData() {
    localStorage.setItem(
        "kopeiki_transactions",
        JSON.stringify(transactions)
    );
}

function saveCategories() {
    localStorage.setItem(
        "kopeiki_categories",
        JSON.stringify(categories)
    );
}

// Обновление списка категорий
function updateOperationCategories() {
    categorySelect.innerHTML =
        '<option value="">Выбери категорию</option>';

    (categories[currentType] || []).forEach(category => {
        const option = document.createElement("option");

        option.value = category;
        option.textContent = category;

        categorySelect.appendChild(option);
    });
}

// Открытие окна операции
function openModal(type, transaction = null) {
    currentType = type;

    editingTransactionId = transaction
        ? transaction.id
        : null;

    operationTypeSelect.value = currentType;

    modalTitle.textContent = transaction
        ? "Редактировать операцию"
        : currentType === "income"
            ? "Новый доход"
            : "Новый расход";

    updateOperationCategories();

    if (transaction) {
        amountInput.value = transaction.amount;
        categorySelect.value = transaction.category || "";
        commentInput.value = transaction.comment || "";
        dateInput.value = transaction.date || today();

    } else {
        amountInput.value = "";
        categorySelect.value = "";
        commentInput.value = "";
        dateInput.value = today();
    }

    modal.classList.remove("hidden");
}

// Закрытие окна операции
function closeModal() {
    modal.classList.add("hidden");
    editingTransactionId = null;
}

// Смена типа операции
operationTypeSelect.addEventListener("change", () => {
    const previousCategory = categorySelect.value;

    currentType = operationTypeSelect.value;

    updateOperationCategories();

    categorySelect.value =
        (categories[currentType] || []).includes(previousCategory)
            ? previousCategory
            : "";

    modalTitle.textContent = editingTransactionId !== null
        ? "Редактировать операцию"
        : currentType === "income"
            ? "Новый доход"
            : "Новый расход";
});

// Кнопки дохода и расхода
document.querySelector(".income-btn")
    .addEventListener("click", () => openModal("income"));

document.querySelector(".expense-btn")
    .addEventListener("click", () => openModal("expense"));

document.getElementById("closeModal")
    .addEventListener("click", closeModal);

// ===================================
// СОХРАНЕНИЕ ОПЕРАЦИИ
// ===================================

document.getElementById("saveOperation")
    .addEventListener("click", () => {

        const amount = Number(amountInput.value);
        const type = operationTypeSelect.value;
        const category = categorySelect.value;
        const date = dateInput.value;
        const comment = commentInput.value.trim();

        if (!Number.isFinite(amount) || amount <= 0) {
            alert("Введи правильную сумму!");
            return;
        }

        if (type !== "income" && type !== "expense") {
            alert("Выбери тип операции!");
            return;
        }

        if (!category) {
            alert("Выбери категорию!");
            return;
        }

        if (!date) {
            alert("Укажи дату!");
            return;
        }

        currentType = type;

        // Редактирование существующей операции
        if (editingTransactionId !== null) {

            const index = transactions.findIndex(
                item => item.id === editingTransactionId
            );

            if (index === -1) {
                alert("Операция не найдена!");
                return;
            }

            transactions[index] = {
                ...transactions[index],
                type,
                amount,
                category,
                date,
                comment
            };

        } else {

            // Создание новой операции
            transactions.push({
                id: Date.now(),
                type,
                amount,
                category,
                date,
                comment
            });
        }

        editingTransactionId = null;

        saveData();
        renderApp();
        closeModal();
    });

// ===================================
// УПРАВЛЕНИЕ КАТЕГОРИЯМИ
// ===================================

// Открыть управление категориями
document.getElementById("manageCategories")
    .addEventListener("click", () => {

        categoryModal.classList.remove("hidden");
        renderCategories();
    });

// Закрыть управление категориями
document.getElementById("closeCategoryModal")
    .addEventListener("click", () => {
        categoryModal.classList.add("hidden");
    });

// Переключение доходов и расходов
categoryType.addEventListener("change", renderCategories);

// Показать категории
function renderCategories() {

    const type = categoryType.value;

    categoryList.innerHTML = "";

    categories[type].forEach((category, index) => {

        const item = document.createElement("div");
        item.className = "category-item";

        if (type === "expense") {
            item.classList.add("has-color");
        }

        const name = document.createElement("span");
        name.textContent = category;

        const buttons = document.createElement("div");
        buttons.className = "category-item-actions";

        const editButton = document.createElement("button");
        editButton.textContent = "Изменить";
        editButton.type = "button";
        editButton.dataset.action = "edit";
        editButton.dataset.index = index;

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Удалить";
        deleteButton.type = "button";
        deleteButton.className = "delete-category";
        deleteButton.dataset.action = "delete";
        deleteButton.dataset.index = index;

        
buttons.append(editButton, deleteButton);



// Выбор цвета категории расхода
if (type === "expense") {
    const colorInput = document.createElement("input");

    colorInput.type = "color";
    colorInput.className = "category-color-picker";
    colorInput.value = getCategoryColor(category, index);
    colorInput.title = "Выбрать цвет категории";

    colorInput.addEventListener("change", () => {
        categoryColors[category] = colorInput.value;
        saveCategoryColors();
        renderExpenseChart();
    });

    item.append(name, colorInput, buttons);

} else {
    item.append(name, buttons);
}

categoryList.appendChild(item);


    });
}

// Добавить категорию
document.getElementById("addCategory")
    .addEventListener("click", () => {

        const type = categoryType.value;
        const name = newCategoryInput.value.trim();

        if (!name) {
            alert("Введи название категории!");
            return;
        }

        const duplicate = categories[type].some(
            item => item.toLowerCase() === name.toLowerCase()
        );

        if (duplicate) {
            alert("Такая категория уже существует!");
            return;
        }

        categories[type].push(name);

        saveCategories();
        renderCategories();

        newCategoryInput.value = "";
    });

// Изменение и удаление категорий
categoryList.addEventListener("click", event => {

    const button = event.target.closest("button");

    if (!button) return;

    const type = categoryType.value;
    const index = Number(button.dataset.index);
    const action = button.dataset.action;

    if (!Number.isInteger(index) || !categories[type][index]) {
        return;
    }

    const oldName = categories[type][index];

    // Переименование категории
    if (action === "edit") {

        const newName = prompt(
            "Новое название категории:",
            oldName
        );

        if (newName === null) return;

        const trimmedName = newName.trim();

        if (!trimmedName) {
            alert("Название не может быть пустым!");
            return;
        }

        const duplicate = categories[type].some(
            (item, i) =>
                i !== index &&
                item.toLowerCase() === trimmedName.toLowerCase()
        );

        if (duplicate) {
            alert("Такая категория уже существует!");
            return;
        }

        categories[type][index] = trimmedName;

        // Обновляем старые операции
        transactions.forEach(item => {
            if (
                item.type === type &&
                item.category === oldName
            ) {
                item.category = trimmedName;
            }
        });

        saveCategories();
        saveData();
        renderCategories();
        renderApp();
    }

    // Удаление категории
    if (action === "delete") {

        const confirmed = confirm(
            `Удалить категорию «${oldName}»?`
        );

        if (!confirmed) return;

        categories[type].splice(index, 1);

        // Старые операции остаются в истории
        saveCategories();
        renderCategories();
    }
});

// ===================================
// ГЛАВНЫЙ ЭКРАН
// ===================================

function renderApp() {

let income = 0;
let expenses = 0;

let expenseDay = 0;
let expenseWeek = 0;
let expenseMonth = 0;

// Текущая дата
const currentDate = today();
const currentMonth = currentDate.slice(0, 7);

// Преобразование даты в формат ГГГГ-ММ-ДД
function toISODate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// Начало недели — понедельник
const current = new Date(currentDate + "T00:00:00");

const weekStart = new Date(current);
weekStart.setDate(
    current.getDate() - ((current.getDay() + 6) % 7)
);

// Конец недели — воскресенье
const weekEnd = new Date(weekStart);
weekEnd.setDate(weekStart.getDate() + 6);

const weekStartString = toISODate(weekStart);
const weekEndString = toISODate(weekEnd);

transactions.forEach(item => {

    const amount = Number(item.amount) || 0;

    if (item.type === "income") {
        income += amount;
    } else {
        expenses += amount;

        // Расходы за сегодня
        if (item.date === currentDate) {
            expenseDay += amount;
        }

        // Расходы за текущую неделю
        if (
            item.date >= weekStartString &&
            item.date <= weekEndString
        ) {
            expenseWeek += amount;
        }

        // Расходы за текущий месяц
        if (item.date && item.date.slice(0, 7) === currentMonth) {
            expenseMonth += amount;
        }
    }
});

    balanceElement.textContent = formatMoney(income - expenses);
    incomeElement.textContent = formatMoney(income);
    expensesElement.textContent = formatMoney(expenses);
    renderExpenseChart();
    expenseDayElement.textContent = formatMoney(expenseDay);
    expenseWeekElement.textContent = formatMoney(expenseWeek);
    expenseMonthElement.textContent = formatMoney(expenseMonth);

    transactionsElement.innerHTML = "";

    if (transactions.length === 0) {

        const empty = document.createElement("p");
        empty.className = "empty";
        empty.textContent = "Пока операций нет";

        transactionsElement.appendChild(empty);
        return;
    }

    const sorted = [...transactions].sort(
        (a, b) =>
            b.date.localeCompare(a.date) ||
            b.id - a.id
    );

    sorted.slice(0, 10).forEach(item => {

        const row = document.createElement("div");
        row.className = "transaction-row";

        const info = document.createElement("div");
        info.className = "transaction-info";

        const name = document.createElement("strong");
        name.textContent = item.category;

        const details = document.createElement("span");

        details.textContent =
            item.date.split("-").reverse().join(".") +
            (item.comment ? " · " + item.comment : "");

        const value = document.createElement("strong");

        value.className =
            item.type === "income"
                ? "transaction-income"
                : "transaction-expense";

        value.textContent =
            (item.type === "income" ? "+" : "−") +
            formatMoney(item.amount);

        // Кнопки управления операцией
        const actions = document.createElement("div");
        actions.className = "transaction-actions";

        const editButton = document.createElement("button");
        editButton.textContent = "Изменить";
        editButton.type = "button";

        editButton.addEventListener("click", () => {
            editTransaction(item.id);
        });

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Удалить";
        deleteButton.type = "button";
        deleteButton.className = "delete-btn";

        deleteButton.addEventListener("click", () => {
            deleteTransaction(item.id);
        });

        actions.append(editButton, deleteButton);

        info.append(name, details, actions);
        row.append(info, value);

        transactionsElement.appendChild(row);
    });
}

// ===================================
// РЕДАКТИРОВАНИЕ ОПЕРАЦИИ
// ===================================

function editTransaction(id) {

    const item = transactions.find(
        transaction => transaction.id === id
    );

    if (!item) return;

    openModal(item.type, item);
}

// ===================================
// УДАЛЕНИЕ ОПЕРАЦИИ
// ===================================

function deleteTransaction(id) {

    const confirmed = confirm(
        "Удалить эту операцию?"
    );

    if (!confirmed) return;

    transactions = transactions.filter(
        item => item.id !== id
    );

    saveData();
    renderApp();
}


// ===================================
// ЭКСПОРТ В EXCEL
// ===================================

function excelEscape(value) {
    return String(value ?? "").replace(/[<>&"']/g, char => ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;"
    })[char]);
}

function excelColumn(number) {
    let result = "";

    while (number > 0) {
        const remainder = (number - 1) % 26;
        result = String.fromCharCode(65 + remainder) + result;
        number = Math.floor((number - 1) / 26);
    }

    return result;
}

function excelWorksheet(rows) {
    const sheetRows = rows.map((row, rowIndex) => {
        const cells = row.map((value, columnIndex) => {
            const ref = excelColumn(columnIndex + 1) + (rowIndex + 1);

            if (typeof value === "number" && Number.isFinite(value)) {
                return `<c r="${ref}" t="n"><v>${value}</v></c>`;
            }

            return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${excelEscape(value)}</t></is></c>`;
        }).join("");

        return `<row r="${rowIndex + 1}">${cells}</row>`;
    }).join("");

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
        <sheetData>${sheetRows}</sheetData>
    </worksheet>`;
}

// Создание ZIP-архива для Excel
function excelCreateZip(files) {
    const encoder = new TextEncoder();
    const localParts = [];
    const centralParts = [];

    let localOffset = 0;
    let centralSize = 0;

    const crcTable = new Uint32Array(256);

    for (let n = 0; n < 256; n++) {
        let value = n;

        for (let bit = 0; bit < 8; bit++) {
            value = (value & 1)
                ? 0xEDB88320 ^ (value >>> 1)
                : value >>> 1;
        }

        crcTable[n] = value >>> 0;
    }

    function crc32(bytes) {
        let crc = 0xFFFFFFFF;

        for (const byte of bytes) {
            crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xFF];
        }

        return (crc ^ 0xFFFFFFFF) >>> 0;
    }

    const now = new Date();

    const dosTime =
        (now.getHours() << 11) |
        (now.getMinutes() << 5) |
        Math.floor(now.getSeconds() / 2);

    const dosDate =
        ((Math.max(1980, now.getFullYear()) - 1980) << 9) |
        ((now.getMonth() + 1) << 5) |
        now.getDate();

    for (const file of files) {
        const nameBytes = encoder.encode(file.name);
        const dataBytes = encoder.encode(file.content);
        const checksum = crc32(dataBytes);

        const localHeader = new Uint8Array(30);
        const local = new DataView(localHeader.buffer);

        local.setUint32(0, 0x04034B50, true);
        local.setUint16(4, 20, true);
        local.setUint16(6, 0x0800, true);
        local.setUint16(8, 0, true);
        local.setUint16(10, dosTime, true);
        local.setUint16(12, dosDate, true);
        local.setUint32(14, checksum, true);
        local.setUint32(18, dataBytes.length, true);
        local.setUint32(22, dataBytes.length, true);
        local.setUint16(26, nameBytes.length, true);
        local.setUint16(28, 0, true);

        localParts.push(localHeader, nameBytes, dataBytes);

        const centralHeader = new Uint8Array(46);
        const central = new DataView(centralHeader.buffer);

        central.setUint32(0, 0x02014B50, true);
        central.setUint16(4, 20, true);
        central.setUint16(6, 20, true);
        central.setUint16(8, 0x0800, true);
        central.setUint16(10, 0, true);
        central.setUint16(12, dosTime, true);
        central.setUint16(14, dosDate, true);
        central.setUint32(16, checksum, true);
        central.setUint32(20, dataBytes.length, true);
        central.setUint32(24, dataBytes.length, true);
        central.setUint16(28, nameBytes.length, true);
        central.setUint16(30, 0, true);
        central.setUint16(32, 0, true);
        central.setUint16(34, 0, true);
        central.setUint16(36, 0, true);
        central.setUint32(38, 0, true);
        central.setUint32(42, localOffset, true);

        centralParts.push(centralHeader, nameBytes);

        localOffset +=
            localHeader.length +
            nameBytes.length +
            dataBytes.length;

        centralSize += centralHeader.length + nameBytes.length;
    }

    const endRecord = new Uint8Array(22);
    const end = new DataView(endRecord.buffer);

    end.setUint32(0, 0x06054B50, true);
    end.setUint16(4, 0, true);
    end.setUint16(6, 0, true);
    end.setUint16(8, files.length, true);
    end.setUint16(10, files.length, true);
    end.setUint32(12, centralSize, true);
    end.setUint32(16, localOffset, true);
    end.setUint16(20, 0, true);

    const parts = [...localParts, ...centralParts, endRecord];

    const totalLength = parts.reduce(
        (sum, part) => sum + part.length,
        0
    );

    const result = new Uint8Array(totalLength);
    let position = 0;

    for (const part of parts) {
        result.set(part, position);
        position += part.length;
    }

    return result;
}

// Главная функция экспорта
function exportKopeikiToExcel() {

    const operationRows = [
        ["Дата", "Тип операции", "Категория", "Сумма (₸)", "Комментарий"],

        ...transactions.map(item => [
            item.date
                ? item.date.split("-").reverse().join(".")
                : "",

            item.type === "income" ? "Доход" : "Расход",
            item.category || "",
            Number(item.amount) || 0,
            item.comment || ""
        ])
    ];

    const categoryRows = [
        ["Тип категории", "Название категории"],

        ...["income", "expense"].flatMap(type =>
            (Array.isArray(categories[type]) ? categories[type] : [])
                .map(name => [
                    type === "income" ? "Доход" : "Расход",
                    name
                ])
        )
    ];

    const files = [
        {
            name: "[Content_Types].xml",
            content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
            <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
                <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
                <Default Extension="xml" ContentType="application/xml"/>
                <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
                <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
                <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
            </Types>`
        },
        {
            name: "_rels/.rels",
            content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
            <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
                <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
            </Relationships>`
        },
        {
            name: "xl/workbook.xml",
            content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
            <workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
                <sheets>
                    <sheet name="Операции" sheetId="1" r:id="rId1"/>
                    <sheet name="Категории" sheetId="2" r:id="rId2"/>
                </sheets>
            </workbook>`
        },
        {
            name: "xl/_rels/workbook.xml.rels",
            content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
            <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
                <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
                <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
            </Relationships>`
        },
        {
            name: "xl/worksheets/sheet1.xml",
            content: excelWorksheet(operationRows)
        },
        {
            name: "xl/worksheets/sheet2.xml",
            content: excelWorksheet(categoryRows)
        }
    ];

    try {
        const zip = excelCreateZip(files);

        const blob = new Blob([zip], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "Kopeiki_" + today() + ".xlsx";

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);

    } catch (error) {
        console.error("Ошибка экспорта:", error);
        alert("Не удалось создать Excel-файл!");
    }
}

// Подключение кнопки экспорта
document.getElementById("exportExcel")
    .addEventListener("click", exportKopeikiToExcel);


// ===================================
// РЕЗЕРВНОЕ КОПИРОВАНИЕ
// ===================================

// Создание резервной копии
function backupKopeiki() {

    const backup = {
        app: "kopeiki",
        version: 1,
        createdAt: new Date().toISOString(),
        transactions: transactions,
        categories: categories
    };

    try {
        const json = JSON.stringify(backup, null, 2);

        const blob = new Blob(
            [json],
            { type: "application/json;charset=utf-8" }
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "Kopeiki_Backup_" + today() + ".json";

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);

        alert("Резервная копия создана!");

    } catch (error) {
        console.error("Ошибка резервного копирования:", error);
        alert("Не удалось создать резервную копию!");
    }
}

// Проверка резервной копии
function validateKopeikiBackup(data) {

    if (
        !data ||
        data.app !== "kopeiki" ||
        data.version !== 1 ||
        !Array.isArray(data.transactions) ||
        !data.categories ||
        !Array.isArray(data.categories.income) ||
        !Array.isArray(data.categories.expense)
    ) {
        return false;
    }

    const ids = new Set();

    for (const item of data.transactions) {

        if (
            !item ||
            !Number.isFinite(item.id) ||
            !["income", "expense"].includes(item.type) ||
            !Number.isFinite(item.amount) ||
            item.amount <= 0 ||
            typeof item.category !== "string" ||
            !item.category.trim() ||
            typeof item.date !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(item.date)
        ) {
            return false;
        }

        if (ids.has(item.id)) {
            return false;
        }

        ids.add(item.id);
    }

    for (const type of ["income", "expense"]) {
        if (!data.categories[type].every(
            category =>
                typeof category === "string" &&
                category.trim().length > 0
        )) {
            return false;
        }
    }

    return true;
}

// Восстановление резервной копии
async function restoreKopeiki(file) {

    try {
        if (!file) return;

        const json = await file.text();
        const backup = JSON.parse(json);

        if (!validateKopeikiBackup(backup)) {
            alert("Файл не является правильной резервной копией Копеек!");
            return;
        }

        const confirmed = confirm(
            "Восстановить резервную копию?\n\n" +
            "Операций: " + backup.transactions.length +
            "\n\nТекущие данные будут заменены данными из копии."
        );

        if (!confirmed) return;

        const restoredTransactions = backup.transactions.map(item => ({
            ...item,
            comment: item.comment || ""
        }));

        const restoredCategories = {
            income: [...backup.categories.income],
            expense: [...backup.categories.expense]
        };

        // Сохраняем прежние данные на случай ошибки
        const oldTransactions = localStorage.getItem(
            "kopeiki_transactions"
        );

        const oldCategories = localStorage.getItem(
            "kopeiki_categories"
        );

        try {

            localStorage.setItem(
                "kopeiki_transactions",
                JSON.stringify(restoredTransactions)
            );

            localStorage.setItem(
                "kopeiki_categories",
                JSON.stringify(restoredCategories)
            );

        } catch (error) {

            // Пытаемся вернуть прежние данные
            try {
                if (oldTransactions === null) {
                    localStorage.removeItem("kopeiki_transactions");
                } else {
                    localStorage.setItem(
                        "kopeiki_transactions",
                        oldTransactions
                    );
                }

                if (oldCategories === null) {
                    localStorage.removeItem("kopeiki_categories");
                } else {
                    localStorage.setItem(
                        "kopeiki_categories",
                        oldCategories
                    );
                }
            } catch (rollbackError) {
                console.error("Ошибка возврата данных:", rollbackError);
            }

            throw error;
        }

        transactions = restoredTransactions;
        categories = restoredCategories;

        renderApp();

        alert("Данные успешно восстановлены!");

    } catch (error) {
        console.error("Ошибка восстановления:", error);
        alert("Не удалось восстановить данные. Проверь файл.");
    }
}

// Подключение кнопки резервной копии
document.getElementById("backupData")
    .addEventListener("click", backupKopeiki);

// Выбор файла резервной копии
const backupFileInput = document.getElementById("backupFile");

document.getElementById("restoreData")
    .addEventListener("click", () => {
        backupFileInput.click();
    });

// Загрузка выбранного файла
backupFileInput.addEventListener("change", async () => {

    const file = backupFileInput.files[0];

    if (!file) return;

    await restoreKopeiki(file);

    // Позволяет повторно выбрать тот же файл
    backupFileInput.value = "";
});


// ===================================
// НАВИГАЦИЯ МЕЖДУ ЭКРАНАМИ
// ===================================

const navigationButtons = document.querySelectorAll(
    ".bottom-nav button[data-screen]"
);

const appScreens = document.querySelectorAll(".app-screen");

navigationButtons.forEach(button => {

    button.addEventListener("click", () => {

        const screenName = button.dataset.screen;
        const targetScreen = document.getElementById(
            "screen-" + screenName
        );

        if (!targetScreen) return;

        // Переключаем экраны
        appScreens.forEach(screen => {
            screen.classList.toggle(
                "active",
                screen === targetScreen
            );
        });

        // Подсвечиваем активную кнопку
        navigationButtons.forEach(navButton => {
            const isActive = navButton === button;

            navButton.classList.toggle("active", isActive);

            if (isActive) {
                navButton.setAttribute("aria-current", "page");
            } else {
                navButton.removeAttribute("aria-current");
            }
        });

        // Возвращаемся к началу экрана
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    });

});


// Первый запуск
renderApp();
