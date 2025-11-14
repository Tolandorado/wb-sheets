#!/bin/bash
# Скрипт для кодирования Google Service Account JSON в base64
# Использование: ./encode-google-account.sh [путь_к_json_файлу]

JSON_FILE="${1:-service-account.json}"

if [ ! -f "$JSON_FILE" ]; then
    echo "Ошибка: Файл '$JSON_FILE' не найден!" >&2
    echo "Использование: ./encode-google-account.sh [путь_к_json_файлу]" >&2
    exit 1
fi

echo "Читаю файл: $JSON_FILE"
echo "Кодирую в base64..."
BASE64=$(cat "$JSON_FILE" | base64 -w 0)

echo ""
echo "Результат (скопируйте в .env файл):"
echo "GOOGLE_SERVICE_ACCOUNT=$BASE64"
echo ""
echo "Готово!"

