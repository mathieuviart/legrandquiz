# LeGrandGeoQuiz

> Presets for custom mode are now automatically computed at runtime from the
> country descriptions. Previously a set of hard-coded arrays (e.g.
> `EUROPEAN_CODES`, `ISLANDS_CODES`) were required; they have been regenerated
> dynamically using keywords in `js/hints.js`. This ensures all buttons work even
> after data updates.

LeGrandGeoQuiz

A strategic geography quiz game — 8 countries, 8 categories, the lowest score wins.

**Languages:** FR | EN | UA | DE

## How to Play

1. Each round, a country is presented to the player
2. Assign it to one of the available statistical categories
3. Your score = the country's rank in that category (lower is better)
4. Each category can only be used **once**
5. You have **20 seconds** per country — otherwise: +200 penalty points!
6. **Goal:** minimize your total score

## Game Modes

| Mode | Description |
|------|-------------|
| **Normal** | Country name, flag and hints visible |
| **Hardcore** | Only the flag is visible — name and hints are hidden |
| **Reverse** | Choose the right country for a given category (instead of the other way around) |
| **Daily** | Same seed for all players, renewed daily at midnight. Leaderboard included |
| **Custom** | Configure time, number of countries, select specific countries/categories |

## Categories

35+ statistical categories sourced from official data, including:

- GDP (Total & per capita), Population, Population density
- Peace index, Corruption index, Happiness index
- FIFA rankings (M/F), Rugby ranking, Basketball ranking
- Life expectancy, Fertility rate, Median age, Suicide rate
- Ecological footprint, Forest cover, Gold production
- Olympic medals, Highest point, Alphabetical order
- and more...

## Data Sources

Country statistics are loaded from `country.json` containing rankings for 228 countries across all categories. Data sourced from World Bank, UN, FIFA, World Rugby, FIBA, and other official institutions.

## Technical Stack

- **Frontend:** Single-page HTML5/CSS3/Vanilla JS (no build step)
- **Data:** `country.json` (228 countries, 35+ statistical categories)
- **Fonts:** Syne + DM Mono (Google Fonts)
- **Emoji:** Twemoji for consistent flag rendering
- **Daily API:** Self-hostable Node.js REST API for daily mode (seed, leaderboard, anti-cheat)

## Self-Hosting with Docker Compose

The easiest way to self-host the game with the Daily API:

```bash
git clone https://github.com/joshii-h/legrandgeoquiz.git
cd legrandgeoquiz
cp config.example.js config.js
docker compose up -d
```

The game is available at `http://localhost:8080` and the API at `http://localhost:3000`.

### Custom Domain Setup

If hosting on a custom domain with HTTPS:

1. Edit `config.js` to set your API URL:
   ```js
   window.GEOQUIZ_API = "https://api.yourdomain.com";
   ```

2. Set the `CORS_ORIGINS` environment variable in `docker-compose.yml`:
   ```yaml
   environment:
     - CORS_ORIGINS=https://yourdomain.com
   ```

3. Place a reverse proxy (Traefik, nginx, Caddy) in front for TLS termination.

### Without Docker

```bash
# Serve the game (any static file server works)
python3 -m http.server 8080

# Run the Daily API
cd api && node server.js
```

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/seed` | Today's daily seed token |
| `GET` | `/api/played` | Check if current IP already played today |
| `POST` | `/api/score` | Submit a score `{pseudo, score, seed_date}` |
| `GET` | `/api/leaderboard?date=YYYY-MM-DD` | Top 20 scores for a given day |

## Credits

Original game by [Mathieu VIART](https://github.com/mathieuviart/legrandgeoquiz).
German translation, i18n improvements, and self-hosting setup by [joshii-h](https://github.com/joshii-h).
