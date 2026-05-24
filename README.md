# PrototypeIDE

Прототип визуальной IDE для разработки аудио-плагинов с поддержкой drag-and-drop интерфейса и двусторонней синхронизации между визуальным редактором и кодом.

## 🎯 Описание

PrototypeIDE - это экспериментальная интегрированная среда разработки, созданная для упрощения процесса создания аудио-плагинов. Проект включает в себя:

- **Визуальный UI Designer** - перетаскивайте компоненты (Knob, Slider, Button) на canvas
- **Code Editor** - встроенный Monaco Editor с подсветкой синтаксиса C++
- **Двусторонняя синхронизация** - изменения в коде отражаются в визуальном редакторе и наоборот
- **File Explorer** - навигация по файлам проекта
- **Audio Plugin Framework** - базовый фреймворк для создания аудио-плагинов на C++

## 🚀 Возможности

- ✅ Drag-and-drop компонентов UI
- ✅ Автоматическая генерация C++ кода
- ✅ Синхронизация между визуальным редактором и кодом
- ✅ Встроенный редактор кода с подсветкой синтаксиса
- ✅ Файловый менеджер с поддержкой различных типов файлов
- ✅ Сохранение файлов (Ctrl+S / Cmd+S)
- ✅ Темная тема в стиле VS Code

## 📋 Требования

- **Node.js** (v14 или выше)
- **npm** (v6 или выше)
- **CMake** (v3.15 или выше)
- **C++ компилятор** (MSVC, GCC или Clang)

## 🛠️ Установка

### 1. Клонирование репозитория

```bash
git clone https://github.com/r0st-ma1n/PrototypeIDE.git
cd PrototypeIDE
```

### 2. Установка зависимостей IDE

```bash
cd ide
npm install
```

### 3. Сборка C++ фреймворка (опционально)

```bash
mkdir build
cd build
cmake ..
cmake --build .
```

## 🎮 Запуск

### Запуск IDE

```bash
cd ide
npm start
```

Или из корневой директории:

```bash
npm --prefix ide start
```

### Использование

1. **UI Designer** - перетаскивайте компоненты из панели "Components" на canvas
2. **Code Editor** - переключитесь на вкладку "Code Editor" для просмотра/редактирования кода
3. **File Explorer** - открывайте файлы проекта через боковую панель
4. **Сохранение** - используйте Ctrl+S (Cmd+S на Mac) для сохранения открытого файла

## 📁 Структура проекта

```
PrototypeIDE/
├── ide/                          # Electron-приложение IDE
│   ├── index.html               # Главный HTML файл
│   ├── main.js                  # Главный процесс Electron
│   ├── preload.js               # Preload скрипт
│   ├── package.json             # Зависимости Node.js
│   └── backend/                 # C++ бэкенд (опционально)
├── framework/                    # C++ фреймворк для аудио-плагинов
│   └── core/                    # Основные компоненты фреймворка
│       ├── include/             # Заголовочные файлы
│       │   └── apf/
│       │       ├── AudioBuffer.h
│       │       ├── Parameter.h
│       │       ├── ProcessContext.h
│       │       └── PluginProcessor.h
│       ├── src/                 # Исходные файлы
│       │   └── Parameter.cpp
│       └── examples/            # Примеры плагинов
│           └── gain/            # Пример Gain плагина
├── CMakeLists.txt               # Конфигурация CMake
├── .gitignore                   # Git ignore файл
└── README.md                    # Этот файл
```

## 🔧 Технологии

- **Frontend**: HTML, CSS, JavaScript
- **Editor**: Monaco Editor (редактор VS Code)
- **Desktop Framework**: Electron
- **Backend**: C++ (CMake)
- **Audio Processing**: Собственный фреймворк APF (Audio Plugin Framework)

## 🐛 Известные проблемы

- Backend C++ генератор кода требует сборки проекта
- Некоторые ошибки кэша Electron при первом запуске (не критично)

## 🤝 Вклад в проект

Проект находится в стадии прототипа. Любые предложения и улучшения приветствуются!

1. Fork проекта
2. Создайте feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit изменения (`git commit -m 'Add some AmazingFeature'`)
4. Push в branch (`git push origin feature/AmazingFeature`)
5. Откройте Pull Request

## 📝 Лицензия

Этот проект является прототипом и предоставляется "как есть" для образовательных целей.

## 👤 Автор

**r0st-ma1n**

- GitHub: [@r0st-ma1n](https://github.com/r0st-ma1n)

## 🙏 Благодарности

- Monaco Editor за отличный редактор кода
- Electron за возможность создания desktop приложений
- Сообществу разработчиков аудио-плагинов

---

⭐ Если проект вам понравился, поставьте звезду на GitHub!
