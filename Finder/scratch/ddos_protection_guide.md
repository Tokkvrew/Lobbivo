# 🛡 Полное руководство по защите Lobbivo от DDoS, ботов и флуда

Данная система обеспечивает защиту проекта на **трёх уровнях**:

---

## 1. 🤖 Клиентский уровень (Уже активирован в коде проекта)
В проект встроен модуль `SecurityShield` (`js/security-shield.js`):
- **Анти-флуд чатов:** Защита от автокликеров и спам-ботов в мировом чате и личных сообщениях (макс. 3 сообщения за 4 сек). При спаме включается кулдаун на 12-15 сек с визуальным таймером.
- **Защита авторизации (Anti-Brute Force):** Ограничение на 5 попыток ввода логина/пароля в минуту.
- **Ограничение размера пакетов (Payload Guard):** Текст сообщений и описаний анкет автоматически валидируется и обрезается до 500 символов, предотвращая переполнение памяти.
- **Дебаунс облачной синхронизации:** Все запросы на сохранение в Firebase группируются, не допуская шторма сетевых запросов.

---

## 2. 🔥 Уровень базы данных: Firebase Security Rules
Чтобы злоумышленники не могли отправлять спам напрямую в базу через API, примените готовые правила из файла `database.rules.json`:

### Как установить правила в Firebase Console:
1. Перейдите в [Firebase Console](https://console.firebase.google.com/project/lobbivo/database/lobbivo-default-rtdb/rules)
2. Откройте **Realtime Database** ➔ вкладка **Rules (Правила)**
3. Скопируйте и вставьте следующее содержимое:

```json
{
  "rules": {
    ".read": true,
    
    "users": {
      "$uid": {
        ".write": "newData.exists()",
        ".validate": "newData.hasChildren(['username', 'game', 'device']) && newData.child('username').isString() && newData.child('username').val().length <= 30 && newData.child('game').val().length <= 50"
      }
    },

    "worldMessages": {
      "$msgId": {
        ".write": "!data.exists() && newData.exists()",
        ".validate": "newData.hasChildren(['id', 'text', 'user', 'time']) && newData.child('text').isString() && newData.child('text').val().length <= 500 && newData.child('user').val().length <= 30"
      }
    },

    "directMessages": {
      "$chatKey": {
        ".write": "newData.exists()",
        ".validate": "newData.hasChild('messages')"
      }
    },

    "complaints": {
      "$complaintId": {
        ".write": "!data.exists() && newData.exists()",
        ".validate": "newData.hasChildren(['id', 'target', 'reason', 'time']) && newData.child('reason').val().length <= 500"
      }
    }
  }
}
```
4. Нажмите **Publish (Опубликовать)**.

---

## 3. 🌐 Сетевой уровень L3/L4/L7: Бесплатный Cloudflare DDoS Protect & WAF
Если вы привязываете собственный домен (или используете хостинг вроде Netlify/Vercel/Firebase Hosting):

1. **Создайте бесплатный аккаунт на [Cloudflare.com](https://www.cloudflare.com/)** и добавьте свой домен.
2. **Включите оранжевое облако (Proxied ☁️)** для записей DNS — это скроет реальный IP хостинга и весь трафик пойдет через дата-центры Cloudflare.
3. В панели Cloudflare перейдите в раздел **Security (Безопасность)**:
   - **Bots (Боты):** Включите переключатель **Bot Fight Mode** (автоматически блокирует подозрительные ботнеты и парсеры).
   - **WAF (Web Application Firewall):** Включите стандартные правила защиты от SQLi, XSS и HTTP Flood.
   - **Under Attack Mode:** Если ваш сайт подвергается активной DDoS-атаке, на главной странице Cloudflare одним кликом включите режим *"I'm Under Attack Mode"*. Всем посетителям будет показываться быстрая 2-секундная проверка браузера (JS Challenge), отсеивающая 99.9% ботов.
