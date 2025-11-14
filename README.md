# Сервис синхронизации тарифов Wildberries с Google Sheets

Сервис для автоматического получения тарифов WB API и синхронизации данных в Google Sheets.

## Описание

Приложение выполняет две основные задачи:

1. **Регулярное получение тарифов WB**: Каждый час получает данные о тарифах для коробов с API Wildberries и сохраняет их в PostgreSQL
2. **Синхронизация с Google Sheets**: Каждые 30 минут обновляет данные в указанных Google таблицах (лист `stocks_coefs`)

## Требования

- Docker и Docker Compose
- Токен WB API
- Google Service Account JSON (для доступа к Google Sheets)
- ID Google таблиц для синхронизации

## Быстрый старт

### 1. Подготовка переменных окружения

Скопируйте файл `example.env` в `.env`:

```bash
cp example.env .env
```

Откройте `.env` и заполните следующие переменные:

```env
# База данных PostgreSQL (можно оставить значения по умолчанию)
POSTGRES_PORT=5432
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# Порт приложения (опционально)
APP_PORT=5000

# Токен API Wildberries
WB_API_URL=https://common-api.wildberries.ru
WB_API_KEY=ваш_токен_wb_api

# JSON сервисного аккаунта Google (ВАЖНО: используйте base64!)
# См. инструкции ниже
GOOGLE_SERVICE_ACCOUNT=ваш_base64_кодированный_json

# ID Google таблиц через запятую
GOOGLE_SPREADSHEET_IDS=spreadsheet_id_1,spreadsheet_id_2,spreadsheet_id_3
```

**Важно:**
- `GOOGLE_SERVICE_ACCOUNT` должен быть закодирован в **base64** (рекомендуется) или экранирован
- `GOOGLE_SPREADSHEET_IDS` - список ID таблиц через запятую без пробелов
- Убедитесь, что сервисный аккаунт имеет доступ к указанным таблицам

#### Подготовка GOOGLE_SERVICE_ACCOUNT

**Проблема:** Docker Compose не может корректно обработать JSON с кавычками напрямую в `.env` файле.

**Решение 1 (рекомендуется): Base64 кодирование**

1. Сохраните JSON сервисного аккаунта в файл `service-account.json`

2. Закодируйте в base64:

   **Вариант A: Используйте готовый скрипт**
   
   **В PowerShell (Windows):**
   ```powershell
   .\encode-google-account.ps1
   # или с указанием пути к файлу:
   .\encode-google-account.ps1 path\to\your\service-account.json
   ```
   
   **В Linux/Mac:**
   ```bash
   chmod +x encode-google-account.sh
   ./encode-google-account.sh
   # или с указанием пути к файлу:
   ./encode-google-account.sh path/to/your/service-account.json
   ```

   **Вариант B: Вручную**
   
   **В PowerShell (Windows):**
   ```powershell
   [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((Get-Content service-account.json -Raw)))
   ```

   **В Linux/Mac:**
   ```bash
   cat service-account.json | base64 -w 0
   ```

3. Скопируйте полученную строку в `.env`:
   ```env
   GOOGLE_SERVICE_ACCOUNT=eyJ0eXBlIjoic2VydmljZV9hY2NvdW50In0=...
   ```

**Решение 2: Экранирование кавычек**

Если не хотите использовать base64, экранируйте JSON:
- Замените все `"` на `\"`
- Уберите все переносы строк
- Пример: `GOOGLE_SERVICE_ACCOUNT={\"type\":\"service_account\",...}`

### 2. Настройка Google Sheets

Для каждой таблицы из `GOOGLE_SPREADSHEET_IDS`:

1. Откройте таблицу в Google Sheets
2. Предоставьте доступ сервисному аккаунту (email из `client_email` в JSON) с правами редактора
3. Убедитесь, что лист `stocks_coefs` существует (или он будет создан автоматически)

### 3. Запуск приложения

Запустите все сервисы одной командой:

```bash
docker compose up --build
```

Приложение автоматически:
- Запустит PostgreSQL
- Выполнит миграции базы данных
- Запустит сборщик тарифов (каждый час)
- Запустит синхронизацию с Google Sheets (каждые 30 минут)

### 4. Пошаговая проверка работы

#### Шаг 1: Проверка запуска контейнеров

Убедитесь, что все контейнеры запущены:

```bash
docker compose ps
```

Ожидаемый результат:
```
NAME        IMAGE                    STATUS
app         btlz-test-app            Up X minutes
postgres    postgres:16.1-alpine     Up X minutes (healthy)
```

#### Шаг 2: Проверка логов при старте

Проверьте логи приложения на наличие ошибок:

```bash
docker compose logs app | head -50
```

**Что искать:**
- ✅ `Running migrations` - миграции запущены
- ✅ `All migrations are up to date` или список выполненных миграций
- ✅ `Running seeds` - сиды запущены
- ✅ `Database is up to date` - БД готова
- ✅ `Starting tariffs collector every 60 minutes` - сборщик тарифов запущен
- ✅ `Starting Google Sheets publisher every 30 minutes` - публикатор запущен
- ✅ `All workers started` - все воркеры запущены

**Если есть ошибки:**
- Проверьте переменные окружения в `.env`
- Убедитесь, что PostgreSQL запущен и здоров

#### Шаг 3: Проверка миграций и сидов

Подключитесь к базе данных:

```bash
docker compose exec postgres psql -U postgres -d postgres
```

Проверьте наличие таблиц:

```sql
-- Список всех таблиц
\dt

-- Должны быть таблицы:
-- - wb_tariffs_box_daily
-- - spreadsheets
-- - migrations
```

Проверьте сиды (должны быть записи в spreadsheets):

```sql
-- Проверка таблицы spreadsheets
SELECT spreadsheet_id, sheet_name, is_active, created_at 
FROM spreadsheets;

-- Должны быть записи для каждого ID из GOOGLE_SPREADSHEET_IDS
```

Выйдите из psql: `\q`

#### Шаг 4: Проверка первого сбора тарифов

Подождите 1-2 минуты после запуска и проверьте логи сборщика:

```bash
docker compose logs app | grep -i "tariff"
```
**Windows PowerShell:**
```powershell
docker compose logs app | Select-String -Pattern "tariff" -CaseSensitive:$false
```

**Ожидаемые сообщения:**
- ✅ `Fetching WB tariffs for boxes` - запрос к API начат
- ✅ `WB tariffs updated` с количеством строк - данные сохранены
- ✅ `WB tariffs collection completed` - сбор завершен

Проверьте данные в БД:

```bash
docker compose exec postgres psql -U postgres -d postgres -c "SELECT COUNT(*) as total_tariffs, MIN(tariff_date) as earliest_date, MAX(tariff_date) as latest_date FROM wb_tariffs_box_daily;"
```

**Ожидаемый результат:**
- `total_tariffs` > 0 (есть данные)
- `latest_date` = сегодняшняя дата

Посмотрите пример данных:

```bash
docker compose exec postgres psql -U postgres -d postgres -c "SELECT warehouse_name, geo_name, box_delivery_coef_expr, tariff_date FROM wb_tariffs_box_daily ORDER BY tariff_date DESC, box_delivery_coef_expr ASC LIMIT 5;"
```

#### Шаг 5: Проверка синхронизации с Google Sheets

Подождите 1-2 минуты после запуска и проверьте логи публикатора:

```bash
docker compose logs app | grep -i "sheets\|sync"
```
**Windows PowerShell:**
```powershell
docker compose logs app | Select-String -Pattern "sheets|sync" -CaseSensitive:$false
```

**Ожидаемые сообщения:**
- ✅ `Starting Google Sheets sync` - синхронизация начата
- ✅ `Found X tariffs to sync to Y spreadsheets` - данные найдены
- ✅ `Successfully updated spreadsheet_id/sheet_name` - данные записаны
- ✅ `Synced spreadsheet_id/sheet_name` - синхронизация завершена
- ✅ `Sync to Google Sheets completed` - все таблицы обновлены

**Если есть ошибки:**
- Проверьте доступ сервисного аккаунта к таблицам
- Убедитесь, что `GOOGLE_SERVICE_ACCOUNT` содержит валидный JSON
- Проверьте, что `GOOGLE_SPREADSHEET_IDS` содержит корректные ID

Проверьте время последней синхронизации в БД:

```bash
docker compose exec postgres psql -U postgres -d postgres -c "SELECT spreadsheet_id, last_synced_at, is_active FROM spreadsheets;"
```

**Ожидаемый результат:**
- `last_synced_at` не NULL (синхронизация выполнена)
- Время соответствует недавнему моменту

#### Шаг 6: Проверка данных в Google Sheets

1. Откройте одну из указанных Google таблиц
2. Перейдите на лист `stocks_coefs` (если его нет - он должен был создаться автоматически)

**Проверьте:**
- ✅ Лист существует и содержит данные
- ✅ Первая строка - заголовки на русском языке:
  - Склад, Регион, Доставка (базовая), Доставка (коэффициент), и т.д.
- ✅ Данные отсортированы по колонке "Доставка (коэффициент)" по возрастанию
- ✅ Количество строк соответствует количеству складов в БД

Проверьте количество строк в БД для сравнения:

```bash
docker compose exec postgres psql -U postgres -d postgres -c "SELECT COUNT(*) FROM wb_tariffs_box_daily WHERE tariff_date = CURRENT_DATE;"
```

#### Шаг 7: Проверка регулярного обновления

**Проверка сборщика тарифов (каждый час):**

Подождите час или проверьте логи за последний час:

```bash
docker compose logs app --since 1h | grep -i "tariff"
```
**Windows PowerShell:**
```powershell
docker compose logs app --since 1h | Select-String -Pattern "tariff" -CaseSensitive:$false
```

Должны быть повторные сообщения о сборе тарифов.

**Проверка синхронизации (каждые 30 минут):**

```bash
docker compose logs app --since 30m | grep -i "sheets\|sync"
```
**Windows PowerShell:**
```powershell
docker compose logs app --since 30m | Select-String -Pattern "sheets|sync" -CaseSensitive:$false
```

Должны быть повторные сообщения о синхронизации.

**Проверка обновления данных в БД:**

```bash
docker compose exec postgres psql -U postgres -d postgres -c "SELECT tariff_date, COUNT(*) as count, MAX(fetched_at) as last_fetch FROM wb_tariffs_box_daily GROUP BY tariff_date ORDER BY tariff_date DESC LIMIT 3;"
```

Данные должны обновляться (меняться `last_fetch`).

**Проверка обновления в Google Sheets:**

Проверьте время последней синхронизации:

```bash
docker compose exec postgres psql -U postgres -d postgres -c "SELECT spreadsheet_id, last_synced_at FROM spreadsheets ORDER BY last_synced_at DESC;"
```

Время должно обновляться каждые 30 минут.

#### Шаг 8: Проверка обработки ошибок

**Тест недоступности WB API:**

Временно измените `WB_API_KEY` на неверный и перезапустите:

```bash
# В .env измените WB_API_KEY на неверный
docker compose restart app
docker compose logs app | grep -i "error\|fail"
```
**Windows PowerShell:**
```powershell
docker compose logs app | Select-String -Pattern "error|fail" -CaseSensitive:$false
```

Должны быть логи об ошибках, но приложение должно продолжать работать.

**Тест недоступности Google Sheets:**

Временно измените `GOOGLE_SPREADSHEET_IDS` на несуществующий ID:

```bash
# В .env измените GOOGLE_SPREADSHEET_IDS
docker compose restart app
docker compose logs app | grep -i "sheets\|error"
```
**Windows PowerShell:**
```powershell
docker compose logs app | Select-String -Pattern "sheets|error" -CaseSensitive:$false
```

Должны быть логи об ошибках доступа к таблице, но приложение должно продолжать работать.

#### Быстрые команды для проверки

```bash
# Статус всех контейнеров
docker compose ps

# Последние 50 строк логов приложения
docker compose logs app --tail 50

# Логи с фильтром по тарифам
docker compose logs app | grep -i tariff
# Windows PowerShell
docker compose logs app | Select-String -Pattern "tariff" -CaseSensitive:$false

# Логи с фильтром по Google Sheets
docker compose logs app | grep -i "sheets\|sync"
# Windows PowerShell
docker compose logs app | Select-String -Pattern "sheets|sync" -CaseSensitive:$false

# Количество тарифов в БД
docker compose exec postgres psql -U postgres -d postgres -c "SELECT COUNT(*) FROM wb_tariffs_box_daily;"

# Последняя синхронизация
docker compose exec postgres psql -U postgres -d postgres -c "SELECT spreadsheet_id, last_synced_at FROM spreadsheets;"

# Последние 5 тарифов
docker compose exec postgres psql -U postgres -d postgres -c "SELECT warehouse_name, box_delivery_coef_expr, tariff_date FROM wb_tariffs_box_daily ORDER BY tariff_date DESC, box_delivery_coef_expr ASC LIMIT 5;"
```

## Структура проекта

```
.
├── src/
│   ├── app.ts                          # Точка входа приложения
│   ├── config/
│   │   └── env/
│   │       └── env.ts                  # Конфигурация переменных окружения
│   ├── postgres/
│   │   ├── knex.ts                      # Настройка Knex
│   │   ├── migrations/                 # Миграции базы данных
│   │   ├── seeds/                       # Сиды базы данных
│   │   └── repositories/                # Репозитории для работы с БД
│   ├── services/
│   │   ├── wbTariffs/                   # Сервис работы с WB API
│   │   └── googleSheets/                # Сервис работы с Google Sheets
│   └── workers/
│       ├── tariffsCollector.ts          # Воркер сбора тарифов
│       └── sheetsPublisher.ts           # Воркер синхронизации с Sheets
├── compose.yaml                         # Docker Compose конфигурация
├── Dockerfile                           # Docker образ приложения
├── example.env                          # Пример файла переменных окружения
└── readme.md                            # Документация
```

## База данных

### Таблицы

- **wb_tariffs_box_daily**: Хранит тарифы на каждый день
  - Уникальность по `(tariff_date, warehouse_name)`
  - Данные обновляются при каждом запросе к API

- **spreadsheets**: Хранит информацию о Google таблицах для синхронизации
  - Создается через сиды на основе `GOOGLE_SPREADSHEET_IDS`
  - Поле `is_active` позволяет временно отключить синхронизацию

### Миграции

Миграции выполняются автоматически при старте приложения.

Для ручного управления миграциями (вне Docker):

```bash
# Выполнить миграции
npm run knex:dev migrate latest

# Откатить последнюю миграцию
npm run knex:dev migrate rollback

# Создать новую миграцию
npm run knex:dev migrate make migration_name
```

## Расписание задач

- **Сбор тарифов**: Каждый час (начиная сразу после запуска)
- **Синхронизация с Google Sheets**: Каждые 30 минут (начиная сразу после запуска)

## Остановка приложения

```bash
# Остановить все сервисы
docker compose down

# Остановить и удалить volumes (очистить БД)
docker compose down --volumes

# Остановить и удалить образы
docker compose down --rmi local --volumes
```

## Разработка

### Локальная разработка (без Docker)

1. Установите зависимости:
```bash
npm install
```

2. Настройте `.env` файл (см. раздел "Быстрый старт")

3. Запустите PostgreSQL через Docker:
```bash
docker compose up -d postgres
```

4. Выполните миграции:
```bash
npm run knex:dev migrate latest
npm run knex:dev seed run
```

5. Запустите приложение в режиме разработки:
```bash
npm run dev
```

### Структура данных в Google Sheets

Лист `stocks_coefs` содержит следующие колонки:

1. Склад
2. Регион
3. Доставка (базовая)
4. Доставка (коэффициент) - сортировка по этой колонке
5. Доставка (литр)
6. Доставка маркетплейс (базовая)
7. Доставка маркетплейс (коэффициент)
8. Доставка маркетплейс (литр)
9. Хранение (базовая)
10. Хранение (коэффициент)
11. Хранение (литр)

Данные отсортированы по коэффициенту доставки (`box_delivery_coef_expr`) по возрастанию.

## Устранение неполадок

### Приложение не запускается

1. Проверьте, что все переменные окружения заполнены в `.env`
2. Проверьте логи: `docker compose logs app`
3. Убедитесь, что PostgreSQL запущен: `docker compose ps`

### Тарифы не собираются

1. Проверьте валидность `WB_API_KEY`
2. Проверьте логи воркера: `docker compose logs app | grep tariffs`
   - **Windows PowerShell:**  
     `docker compose logs app | Select-String -Pattern "tariffs" -CaseSensitive:$false`
3. Проверьте подключение к API WB

### Данные не синхронизируются с Google Sheets

1. Проверьте, что сервисный аккаунт имеет доступ к таблицам
2. Проверьте формат `GOOGLE_SERVICE_ACCOUNT` (должен быть валидный JSON в base64)
   
   **Если нужно перекодировать service-account.json:**
   
   Используйте готовые скрипты из проекта:
   
   **Windows PowerShell:**
   ```powershell
   .\encode-google-account.ps1
   # или с указанием пути:
   .\encode-google-account.ps1 path\to\your\service-account.json
   ```
   
   **Linux/Mac:**
   ```bash
   chmod +x encode-google-account.sh
   ./encode-google-account.sh
   # или с указанием пути:
   ./encode-google-account.sh path/to/your/service-account.json
   ```
   
   **Или вручную:**
   
   Windows PowerShell:
   ```powershell
   [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((Get-Content service-account.json -Raw)))
   ```
   
   Linux/Mac:
   ```bash
   cat service-account.json | base64 -w 0
   ```

3. Проверьте, что `GOOGLE_SPREADSHEET_IDS` содержит корректные ID
4. Проверьте логи:
   ```bash
   # Linux/Mac
   docker compose logs app | grep -i "sheets\|sync"
   
   # Windows PowerShell
   docker compose logs app | Select-String -Pattern "sheets|sync" -CaseSensitive:$false
   ```
5. Убедитесь, что в БД есть данные: проверьте таблицу `wb_tariffs_box_daily`

### Ошибки базы данных

1. Проверьте подключение к PostgreSQL: `docker compose exec postgres psql -U postgres -d postgres`
2. Проверьте, что миграции выполнены:
   ```bash
   # Linux/Mac
   docker compose logs app | grep -i migrations

   # Windows PowerShell
   docker compose logs app | Select-String -Pattern "migrations" -CaseSensitive:$false
   ```
3. При необходимости пересоздайте БД:
   - Для Linux/Mac:
     ```bash
     docker compose down --volumes && docker compose up
     ```
   - Для Windows PowerShell:
     ```powershell
     docker compose down --volumes; docker compose up
     ```

### Дополнительные команды для диагностики

**Проверка всех ошибок в логах:**
```bash
# Linux/Mac
docker compose logs app | grep -i "error\|fail\|exception"

# Windows PowerShell
docker compose logs app | Select-String -Pattern "error|fail|exception" -CaseSensitive:$false
```

**Проверка статуса воркеров:**
```bash
# Linux/Mac
docker compose logs app | grep -i "worker\|started\|stopped"

# Windows PowerShell
docker compose logs app | Select-String -Pattern "worker|started|stopped" -CaseSensitive:$false
```

**Мониторинг логов в реальном времени:**
```bash
# Linux/Mac
docker compose logs -f app

# Windows PowerShell (аналогично)
docker compose logs -f app
```

## API Endpoints

Приложение использует следующие API:

- **WB API**: `https://common-api.wildberries.ru/api/v1/tariffs/box`
  - Лимит: 60 запросов в минуту
  - Авторизация: Header `Authorization` с токеном

- **Google Sheets API**: `https://sheets.googleapis.com/v4/spreadsheets`
  - Авторизация: OAuth 2.0 через Service Account

## Лицензия

ISC
