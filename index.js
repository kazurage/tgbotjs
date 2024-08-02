import { config } from 'dotenv';
config();
import { Telegraf, Markup } from 'telegraf';
import fetch from 'node-fetch';

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

const getWeather = async (city) => {
  const apiKey = process.env.WEATHER_API_KEY;
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=ru`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.cod === 200) {
      const weatherInfo = `Погода в ${data.name}, ${data.sys.country}:
      Описание: ${data.weather[0].description}
      Температура: ${data.main.temp}°C
      Ощущается как: ${data.main.feels_like}°C
      Влажность: ${data.main.humidity}%
      Ветер: ${data.wind.speed} м/с`;
      const clothingAdvice = getClothingAdvice(data.main.temp);
      return `${weatherInfo}\n\n${clothingAdvice}`;
    } else {
      return `Не удалось найти информацию о погоде для города: ${city}. Причина: ${data.message}`;
    }
  } catch (error) {
    return `Произошла ошибка при получении данных о погоде: ${error.message}`;
  }
};

const getWeatherForecast = async (city) => {
  const apiKey = process.env.WEATHER_API_KEY;
  const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=ru`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.cod === "200") {
      let forecastMessage = `Прогноз погоды в ${data.city.name}, ${data.city.country} на следующие 5 дня:\n`;
      for (let i = 0; i < data.list.length; i += 8) {
        const forecast = data.list[i];
        forecastMessage += `
Дата: ${forecast.dt_txt}
Описание: ${forecast.weather[0].description}
Температура: ${forecast.main.temp}°C
Ощущается как: ${forecast.main.feels_like}°C
Влажность: ${forecast.main.humidity}%
Ветер: ${forecast.wind.speed} м/с\n`;
      }
      return forecastMessage;
    } else {
      return `Не удалось найти информацию о прогнозе погоды для города: ${city}. Причина: ${data.message}`;
    }
  } catch (error) {
    return `Произошла ошибка при получении данных о прогнозе погоды: ${error.message}`;
  }
};

const getClothingAdvice = (temp) => {
  if (temp < 0) {
    return "Совет по одежде: Очень холодно! Наденьте теплую куртку, шапку, шарф и перчатки.";
  } else if (temp < 10) {
    return "Совет по одежде: Холодно. Наденьте куртку и свитер.";
  } else if (temp < 20) {
    return "Совет по одежде: Прохладно. Рекомендуется надеть легкую куртку или свитер.";
  } else if (temp < 30) {
    return "Совет по одежде: Тепло. Наденьте футболку и легкую одежду.";
  } else {
    return "Совет по одежде: Очень жарко! Наденьте легкую и свободную одежду.";
  }
};

const getNews = async (city) => {
  const apiKey = process.env.NEWS_API_KEY;
  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(city)}&apiKey=${apiKey}&language=ru&sortBy=publishedAt&pageSize=5`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.status === 'ok') {
      const articles = data.articles.map(article => `${article.title}\n${article.description}\n${article.url}`).join('\n\n');
      return `Последние новости о ${city}:\n\n${articles}`;
    } else {
      return `Не удалось найти новости для города: ${city}. Причина: ${data.message}`;
    }
  } catch (error) {
    return `Произошла ошибка при получении новостей: ${error.message}`;
  }
};

bot.start((ctx) => {
  ctx.reply(`
Привет! Я бот, который может показать погоду.
Просто отправьте мне название города, и я верну текущую информацию о погоде.
Например, попробуйте отправить "Москва" или "Лондон".
`);
});

bot.on('text', async (ctx) => {
  const city = ctx.message.text;
  const waitingMessage = await ctx.reply('Пожалуйста, подождите, пока я получаю данные о погоде...');
  const weatherMessage = await getWeather(city);
  await ctx.deleteMessage(waitingMessage.message_id);

  if (weatherMessage.startsWith('Погода в')) {
    await ctx.reply(weatherMessage, Markup.inlineKeyboard([
      Markup.button.callback('Погода на следующие 5 дня', `forecast_${city}`),
      Markup.button.callback('Последние новости', `news_${city}`)
    ]));
  } else {
    await ctx.reply(weatherMessage);
  }
});

bot.action(/forecast_(.+)/, async (ctx) => {
  const city = ctx.match[1];
  const forecastMessage = await getWeatherForecast(city);
  await ctx.reply(forecastMessage);
  await ctx.deleteMessage(ctx.update.callback_query.message.message_id);
});

bot.action(/news_(.+)/, async (ctx) => {
  const city = ctx.match[1];
  const newsMessage = await getNews(city);
  await ctx.reply(newsMessage);
  await ctx.deleteMessage(ctx.update.callback_query.message.message_id);
});

bot.launch();
console.log('Бот запущен');
