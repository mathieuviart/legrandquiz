// ─── CATEGORIES ───────────────────────────────────────────────────────────────
var ALL_CATEGORIES = [
  {id:'pib',icon:'💰',fr:'PIB Total',en:'Total GDP',ua:'Загальний ВВП',de:'BIP Gesamt',desc:{fr:'Valeur totale des biens et services produits par un pays sur une année. Le rang indique la position économique globale.',en:"Total value of goods and services produced in a year. The rank indicates the country's overall economic position.",ua:'Загальна вартість товарів і послуг за рік. Ранг відображає економічне становище країни.',de:'Gesamtwert aller in einem Jahr produzierten Güter und Dienstleistungen. Der Rang zeigt die wirtschaftliche Position.'}},
  {id:'nb_habitant',icon:'👥',fr:"Nb d'habitants",en:'Population',ua:'Населення',de:'Einwohnerzahl',desc:{fr:"Nombre total de personnes résidant dans le pays, indicateur fondamental de la taille d'un État.",en:"Total number of people residing in the country, a fundamental indicator of a state's size.",ua:'Загальна кількість людей у країні — базовий показник розміру держави.',de:'Gesamtzahl der im Land lebenden Personen, grundlegender Indikator für die Grösse eines Staates.'}},
  {id:'depense_defense_pctg_pib',icon:'🛡️',fr:'Dépense défense % PIB',en:'Defense spending % GDP',ua:'Витрати на оборону % ВВП',de:'Verteidigungsausgaben % BIP',desc:{fr:"Part du budget national allouée à la défense, en % du PIB. Reflète les priorités stratégiques d'un pays.",en:"Share of national budget allocated to defense, as % of GDP. Reflects a country's strategic priorities.",ua:'Частка бюджету на оборону у відсотках від ВВП. Відображає стратегічні пріоритети країни.',de:'Anteil des Staatshaushalts für Verteidigung in % des BIP. Spiegelt die strategischen Prioritäten wider.'}},
  {id:'indice_paix',icon:'☮️',fr:'Indice de paix',en:'Peace index',ua:'Індекс миру',de:'Friedensindex',desc:{fr:'Mesure le niveau de paix : conflits internes, relations avec les voisins, stabilité politique. Rang faible = plus pacifique.',en:'Measures peace and security: internal conflicts, neighbor relations, political stability. Low rank = more peaceful.',ua:'Вимірює рівень миру: конфлікти, відносини з сусідами, стабільність. Низький ранг = мирніша країна.',de:'Misst das Friedensniveau: interne Konflikte, Nachbarschaftsbeziehungen, politische Stabilität. Niedriger Rang = friedlicher.'}},
  {id:'densite_pop',icon:'🏙️',fr:'Densité de population',en:'Population density',ua:'Густота населення',de:'Bevölkerungsdichte',desc:{fr:'Nombre d\'habitants par km², reflétant la concentration de la population sur le territoire.',en:'Number of inhabitants per km², reflecting the concentration of the population.',ua:'Кількість мешканців на км² — концентрація населення на території.',de:'Einwohner pro km², zeigt die Konzentration der Bevölkerung auf dem Staatsgebiet.'}},
  {id:'age_median',icon:'📅',fr:'Âge médian',en:'Median age',ua:'Середній вік',de:'Medianalter',desc:{fr:'Âge qui sépare la population en deux groupes égaux. Indique si la population est plutôt jeune ou vieillissante.',en:'Age that divides the population into two equal groups. Indicates whether the population is younger or aging.',ua:'Вік, який ділить населення навпіл. Вказує, молода чи стара країна.',de:'Alter, das die Bevölkerung in zwei gleich grosse Gruppen teilt. Zeigt ob die Bevölkerung eher jung oder alt ist.'}},
  {id:'taux_mortalite',icon:'💀',fr:'Taux de mortalité',en:'Mortality rate',ua:'Рівень смертності',de:'Sterberate',desc:{fr:'Nombre de décès pour 1 000 habitants, indicateur général de la santé d\'une population.',en:'Number of deaths per 1,000 inhabitants, a general health indicator.',ua:'Кількість смертей на 1 000 жителів — загальний показник здоров\'я населення.',de:'Anzahl Todesf00e4lle pro 1.000 Einwohner, allgemeiner Gesundheitsindikator.'}},
  {id:'taux_mortalite_routiere',icon:'🚗',fr:'Mortalité routière',en:'Road mortality',ua:'Дорожня смертність',de:'Verkehrstote',desc:{fr:'Nombre de décès liés aux accidents de la route pour 100 000 habitants.',en:'Number of road accident deaths per 100,000 inhabitants.',ua:'Кількість загиблих у ДТП на 100 000 жителів.',de:'Anzahl Verkehrstote pro 100\'000 Einwohner.'}},
  {id:'taux_fecondite',icon:'🍼',fr:'Taux de fécondité',en:'Fertility rate',ua:'Рівень народжуваності',de:'Geburtenrate',desc:{fr:'Nombre moyen d\'enfants par femme. Influence la croissance démographique.',en:'Average number of children per woman. Directly influences population growth.',ua:'Середня кількість дітей на жінку. Впливає на демографічне зростання.',de:'Durchschnittliche Kinderzahl pro Frau. Beeinflusst das Bevölkerungswachstum.'}},
  {id:'esperance_vie',icon:'❤️',fr:'Espérance de vie',en:'Life expectancy',ua:'Очікувана тривалість життя',de:'Lebenserwartung',desc:{fr:'Âge moyen auquel on s\'attend à vivre. Indicateur clé de la qualité de vie.',en:'Average age one is expected to live to. A key quality of life indicator.',ua:'Середній очікуваний вік. Ключовий показник якості життя.',de:'Durchschnittliches erwartetes Lebensalter. Wichtiger Indikator für Lebensqualität.'}},
  {id:'pib_habitant',icon:'💵',fr:'PIB / Habitant',en:'GDP per capita',ua:'ВВП на душу населення',de:'BIP / Einwohner',desc:{fr:'Richesse économique moyenne par personne (PIB ÷ nb habitants).',en:'Average economic wealth per person (GDP ÷ population).',ua:'Середній економічний добробут на одну особу (ВВП ÷ населення).',de:'Durchschnittlicher wirtschaftlicher Wohlstand pro Person (BIP ÷ Einwohner).'}},
  {id:'dette_publique_pctg_pib',icon:'📉',fr:'Dette publique % PIB',en:'Public debt % GDP',ua:'Держборг % ВВП',de:'Staatsverschuldung % BIP',desc:{fr:"Niveau d'endettement d'un État par rapport à sa richesse économique annuelle, en % du PIB.",en:"Level of a state's debt relative to its annual economic wealth, as % of GDP.",ua:'Рівень заборгованості держави відносно ВВП, у відсотках.',de:'Verschuldungsgrad eines Staates im Verhältnis zur jährlichen Wirtschaftsleistung, in % des BIP.'}},
  {id:'indice_corruption',icon:'🕵️',fr:'Indice de corruption',en:'Corruption index',ua:'Індекс корупції',de:'Korruptionsindex',desc:{fr:'Mesure le niveau perçu de corruption dans le secteur public.',en:'Measures the perceived level of corruption in the public sector.',ua:'Вимірює сприйнятий рівень корупції в державному секторі.',de:'Misst das wahrgenommene Korruptionsniveau im öffentlichen Sektor.'}},
  {id:'nb_touriste',icon:'✈️',fr:'Arrivées touristiques',en:'Tourist arrivals',ua:'Туристичні прибуття',de:'Touristenankünfte',desc:{fr:"Nombre total de visiteurs internationaux, indicateur de l'attractivité touristique.",en:"Total number of international visitors, an indicator of tourist attractiveness.",ua:'Загальна кількість міжнародних відвідувачів — показник привабливості країни.',de:'Gesamtzahl internationaler Besucher, Indikator für touristische Attraktivität.'}},
  {id:'niveau_mathematique',icon:'📐',fr:'Niveau mathématiques',en:'Math level',ua:'Рівень математики',de:'Mathematikniveau',desc:{fr:'Performance en mathématiques mesurée par des tests standardisés internationaux (PISA).',en:'Math performance measured by international standardized tests (PISA).',ua:'Успішність з математики за міжнародними тестами (PISA).',de:'Mathematische Leistung gemessen durch internationale standardisierte Tests (PISA).'}},
  {id:'empreinte_ecologique_par_habitant',icon:'🌱',fr:'Empreinte éco/hab',en:'Eco footprint/capita',ua:'Екослід на душу',de:'Öko-Fussabdruck/Einw.',desc:{fr:'Pression sur les ressources naturelles par habitant, en hectares globaux.',en:'Pressure on natural resources per inhabitant, in global hectares.',ua:'Навантаження на природні ресурси на одного жителя, у глобальних гектарах.',de:'Belastung der natürlichen Ressourcen pro Einwohner, in globalen Hektar.'}},
  {id:'empreinte_ecologique',icon:'🌍',fr:'Empreinte écologique',en:'Ecological footprint',ua:'Екологічний слід',de:'Ökologischer Fussabdruck',desc:{fr:'Pression totale exercée par un pays sur les ressources naturelles, en hectares globaux.',en:"Total pressure exerted by a country on natural resources, in global hectares.",ua:'Загальне навантаження країни на природні ресурси, у глобальних гектарах.',de:'Gesamtbelastung eines Landes auf die natürlichen Ressourcen, in globalen Hektar.'}},
  {id:'surface_foret_pctg_territoire',icon:'🌲',fr:'Surface forestière %',en:'Forest cover %',ua:'Лісовий покрив %',de:'Waldfläche %',desc:{fr:'Pourcentage du territoire couvert par des forêts. Indicateur de biodiversité.',en:'Percentage of the territory covered by forests. A biodiversity indicator.',ua:'Відсоток території, вкритої лісами. Показник біорізноманіття.',de:'Prozent des Staatsgebiets, das von Wald bedeckt ist. Biodiversitätsindikator.'}},
  {id:'production_or',icon:'🥇',fr:"Production d'or",en:'Gold production',ua:'Виробництво золота',de:'Goldproduktion',desc:{fr:"Quantité d'or produite, liée à l'activité minière et aux ressources naturelles.",en:'Amount of gold produced, linked to mining activity and natural resources.',ua:'Кількість видобутого золота, пов\'язана з гірничодобувною діяльністю.',de:'Produzierte Goldmenge, verbunden mit Bergbau und nat\u00fcrlichen Ressourcen.'}},
  {id:'pctg_irreligieux',icon:'🔮',fr:'% Irréligieux',en:'% Non-religious',ua:'% Нерелігійних',de:'% Nicht-Religiöse',desc:{fr:"Proportion de la population ne s'identifiant à aucune religion.",en:'Proportion of the population not identifying with any religion.',ua:'Частка населення без релігійної приналежності.',de:'Anteil der Bevölkerung, der sich keiner Religion zugehörig fühlt.'}},
  {id:'taux_suicide',icon:'📊',fr:'Taux de suicide',en:'Suicide rate',ua:'Рівень суїциду',de:'Suizidrate',desc:{fr:'Nombre de suicides pour 100 000 habitants. Indicateur de santé mentale.',en:'Number of suicides per 100,000 inhabitants. A mental health indicator.',ua:'Кількість самогубств на 100 000 жителів. Показник психічного здоров\'я.',de:'Anzahl Suizide pro 100.000 Einwohner. Indikator f\u00fcr psychische Gesundheit.'}},
  {id:'taux_tabagisme',icon:'🚬',fr:'Taux de tabagisme',en:'Smoking rate',ua:'Рівень куріння',de:'Raucherquote',desc:{fr:'Pourcentage de la population qui fume régulièrement.',en:'Percentage of the population that smokes regularly.',ua:'Відсоток населення, яке регулярно курить.',de:'Prozentsatz der Bevölkerung, die regelmässig raucht.'}},
  {id:'conso_alcool_par_habitant',icon:'🍺',fr:'Conso alcool/hab',en:'Alcohol consumption/capita',ua:'Споживання алкоголю',de:'Alkoholkonsum/Einw.',desc:{fr:"Quantité moyenne d'alcool pur consommée par personne et par an.",en:'Average amount of pure alcohol consumed per person per year.',ua:'Середня кількість чистого алкоголю на одну особу на рік.',de:'Durchschnittliche Menge reinen Alkohols pro Person und Jahr.'}},
  {id:'travail_enfant',icon:'👶',fr:'Travail des enfants',en:'Child labour',ua:'Дитяча праця',de:'Kinderarbeit',desc:{fr:"Prévalence du travail des enfants dans une activité économique. Reflète les conditions sociales.",en:'Prevalence of child labor in economic activity. Reflects social conditions.',ua:'Поширеність дитячої праці. Відображає соціально-економічні умови.',de:'Verbreitung von Kinderarbeit in wirtschaftlicher Tätigkeit. Spiegelt soziale Bedingungen wider.'}},
  {id:'nb_militaire',icon:'🪖',fr:'Nb de militaires',en:'Military personnel',ua:'Військовий персонал',de:'Militärpersonal',desc:{fr:"Effectif total des forces armées. Indicateur de la capacité militaire d'un pays.",en:"Total size of a country's armed forces. A military capacity indicator.",ua:'Загальна чисельність збройних сил. Показник військового потенціалу країни.',de:'Gesamtstärke der Streitkräfte. Indikator für die militärische Kapazität eines Landes.'}},
  {id:'classement_fifa_H',icon:'⚽',fr:'Classement FIFA (H)',en:'FIFA Ranking (M)',ua:'Рейтинг ФІФА (Ч)',de:'FIFA-Rangliste (M)',desc:{fr:"Position de l'équipe nationale masculine de football au classement mondial FIFA.",en:"Position of the men's national football team in the FIFA world rankings.",ua:'Позиція чоловічої збірної з футболу у світовому рейтингу ФІФА.',de:'Position der Herren-Fussballnationalmannschaft in der FIFA-Weltrangliste.'}},
  {id:'classement_fifa_F',icon:'⚽',fr:'Classement FIFA (F)',en:'FIFA Ranking (W)',ua:'Рейтинг ФІФА (Ж)',de:'FIFA-Rangliste (F)',desc:{fr:"Position de l'équipe nationale féminine de football au classement mondial FIFA.",en:"Position of the women's national football team in the FIFA world rankings.",ua:'Позиція жіночої збірної з футболу у світовому рейтингу ФІФА.',de:'Position der Frauen-Fussballnationalmannschaft in der FIFA-Weltrangliste.'}},
  {id:'classement_rugby_H',icon:'🏉',fr:'Classement Rugby (H)',en:'Rugby Ranking (M)',ua:'Рейтинг регбі (Ч)',de:'Rugby-Rangliste (M)',desc:{fr:"Position de l'équipe nationale masculine de rugby au classement mondial World Rugby.",en:"Position of the men's national rugby team in the World Rugby rankings.",ua:'Позиція чоловічої збірної з регбі у світовому рейтингу World Rugby.',de:'Position der Herren-Rugbynationalmannschaft in der World-Rugby-Weltrangliste.'}},
  {id:'point_culminant',icon:'🏔️',fr:'Point culminant',en:'Highest point',ua:'Найвища точка',de:'Höchster Punkt',desc:{fr:"Altitude du sommet le plus élevé du pays, reflétant le relief du territoire.",en:"Altitude of the country's highest peak, reflecting the terrain.",ua:'Висота найвищої вершини країни, що відображає рельєф території.',de:'Höhe des höchsten Gipfels des Landes, spiegelt das Gelände wider.'}},
  {id:'ordre_alphabetique',icon:'🔤',fr:'Ordre alphabétique',en:'Alphabetical order',ua:'Алфавітний порядок',de:'Alphabetische Reihenfolge',desc:{fr:"Position du pays dans une liste triée par nom (de A à Z).",en:"Position of the country in a list sorted by name (from A to Z).",ua:'Позиція країни у списку, відсортованому за назвою (від А до Я).',de:'Position des Landes in einer alphabetisch sortierten Liste (A bis Z).'}},
  {id:'medaille_jo',icon:'🏅',fr:'Médailles JO',en:'Olympic medals',ua:'Олімпійські медалі',de:'Olympische Medaillen',desc:{fr:"Nombre total de médailles obtenues aux Jeux Olympiques. Reflète la puissance sportive.",en:"Total number of medals won at the Olympic Games. Reflects sporting prowess.",ua:'Загальна кількість медалей, здобутих на Олімпійських іграх. Відображає спортивну міць.',de:'Gesamtzahl der bei Olympischen Spielen gewonnenen Medaillen. Zeigt die sportliche Stärke.'}},
  {id:'taux_obesite',icon:'🍔',fr:"Taux d'obésité",en:'Obesity rate',ua:'Рівень ожиріння',de:'Adipositasrate',desc:{fr:"Pourcentage de la population adulte souffrant d'obésité. Indicateur de santé publique.",en:"Percentage of the adult population suffering from obesity. A public health indicator.",ua:'Відсоток дорослого населення з ожирінням. Показник здоров’я нації.',de:'Prozentsatz der erwachsenen Bevölkerung mit Adipositas. Indikator für öffentliche Gesundheit.'}},
  {id:'prevalence_cannabis_pctg',icon:'🌿',fr:'Prévalence cannabis',en:'Cannabis prevalence',ua:'Поширеність канабісу',de:'Cannabisverbreitung',desc:{fr:"Pourcentage de la population ayant consommé du cannabis au cours de l'année écoulée.",en:"Percentage of the population that has used cannabis in the past year.",ua:'Відсоток населення, яке вживало канабіс протягом останнього року.',de:'Prozentsatz der Bevölkerung, die im letzten Jahr Cannabis konsumiert hat.'}},
  {id:'classement_bball_M',icon:'🏀',fr:'Classement Basket (M)',en:'Basketball ranking (M)',ua:'Рейтинг баскетболу (Ч)',de:'Basketball-Rangliste (M)',desc:{fr:"Position de l'équipe nationale masculine de basketball au classement mondial FIBA.",en:"Position of the men's national basketball team in the FIBA world rankings.",ua:'Позиція чоловічої збірної з баскетболу у світовому рейтингу FIBA.',de:'Position der Herren-Basketballnationalmannschaft in der FIBA-Weltrangliste.'}},
  {id:'heureux',icon:'😊',fr:'Indice de bonheur',en:'Happiness index',ua:'Індекс щастя',de:'Glücksindex',desc:{fr:"Mesure le bien-être subjectif et la satisfaction de vie globale des habitants.",en:"Measures subjective well-being and overall life satisfaction of residents.",ua:'Вимірює суб’єктивне благополуччя та загальну задоволеність життям мешканців.',de:'Misst das subjektive Wohlbefinden und die allgemeine Lebenszufriedenheit der Bevölkerung.'}},
  {id:'inegalite',icon:'⚖️',fr:'Indice d’inégalité',en:'Inequality index',ua:'Індекс нерівності',de:'Ungleichheitsindex',desc:{fr:"Mesure les écarts de revenus et la répartition des richesses au sein de la population.",en:"Measures income gaps and wealth distribution within the population.",ua:'Вимірює розрив у доходах та розподіл багатства серед населення.',de:'Misst Einkommensunterschiede und Vermögensverteilung innerhalb der Bevölkerung.'}},
  {id:'dictature',icon:'👮',fr:'Indice de dictature',en:'Dictatorship index',ua:'Індекс диктатури',de:'Diktaturindex',desc:{fr:"Mesure le niveau de liberté politique et le type de régime (de dicature à démocratie).",en:"Measures the level of political freedom and regime type (from dictatorship to democracy).",ua:'Вимірює рівень політичної свободи та тип режиму (від диктатури до демократії).',de:'Misst das Niveau politischer Freiheit und den Regimetyp (von Diktatur bis Demokratie).'}},
  {id:'taux_d_incarceration',icon:'🔒',fr:"Taux d'incarcération",en:'Incarceration rate',ua:'Рівень ув\'язнення',de:'Inhaftierungsrate',desc:{fr:"Nombre de personnes incarcérées pour 100 000 habitants. Reflète la politique pénale d'un pays.",en:'Number of people incarcerated per 100,000 inhabitants. Reflects a country\'s penal policy.',ua:'Кількість ув\'язнених на 100 000 жителів. Відображає кримінальну політику країни.',de:'Anzahl inhaftierter Personen pro 100.000 Einwohner. Spiegelt die Strafpolitik eines Landes wider.'}},
  {id:'taux_homicide',icon:'🔪',fr:'Taux d\'homicide',en:'Homicide rate',ua:'Рівень вбивств',de:'Mordrate',desc:{fr:'Nombre d\'homicides volontaires pour 100 000 habitants. Indicateur de sécurité publique.',en:'Number of intentional homicides per 100,000 inhabitants. A public safety indicator.',ua:'Кількість навмисних вбивств на 100 000 жителів. Показник громадської безпеки.',de:'Anzahl vorsätzlicher Tötungsdelikte pro 100.000 Einwohner. Indikator für öffentliche Sicherheit.'}},
  {id:'taux_occupation_prison',icon:'🏛️',fr:'Occupation des prisons',en:'Prison occupancy rate',ua:'Заповненість тюрем',de:'Gefängnisbelegung',desc:{fr:'Pourcentage de la population carcérale par rapport à la capacité d\'accueil officielle des prisons.',en:'Percentage of the prison population relative to the official capacity of prisons.',ua:'Відсоток заповненості тюрем відносно офіційної місткості.',de:'Prozentsatz der Gefängnisbelegung im Verhältnis zur offiziellen Kapazität.'}},
  {id:'nb_vehicule_p_habitant',icon:'🚗',fr:'Véhicules / habitant',en:'Vehicles per capita',ua:'Транспортних засобів на особу',de:'Fahrzeuge / Einwohner',desc:{fr:'Nombre de véhicules motorisés (voitures, motos) par habitant. Indicateur de mobilité et de niveau de vie.',en:'Number of motorized vehicles (cars, motorcycles) per inhabitant. A mobility and living standard indicator.',ua:'Кількість моторизованих транспортних засобів (автомобілів, мотоциклів) на одного жителя.',de:'Anzahl motorisierter Fahrzeuge (Autos, Motorräder) pro Einwohner. Indikator für Mobilität und Lebensstandard.'}},
  {id:'nb_arme_a_feu_p_habitant',icon:'🔫',fr:'Armes à feu / habitant',en:'Firearms per capita',ua:'Вогнепальна зброя на особу',de:'Schusswaffen / Einwohner',desc:{fr:'Nombre estimé d\'armes à feu (civiles) par habitant. Reflète la prévalence des armes dans la société.',en:'Estimated number of civilian firearms per inhabitant. Reflects the prevalence of weapons in society.',ua:'Оціночна кількість цивільної вогнепальної зброї на одного жителя.',de:'Geschätzte Anzahl ziviler Schusswaffen pro Einwohner. Spiegelt die Verbreitung von Waffen in der Gesellschaft wider.'}},
  {id:'median_internet_speed_fixedbroadband',icon:'🌐',fr:'Vitesse internet fixe',en:'Fixed broadband speed',ua:'Швидкість інтернету (кабель)',de:'Festnetz-Internetgeschwindigkeit',desc:{fr:'Vitesse médiane de connexion internet sur réseau fixe (box), en Mbit/s. Indicateur d\'infrastructure numérique.',en:'Median fixed broadband internet connection speed (Mbit/s). A digital infrastructure indicator.',ua:'Медіанна швидкість фіксованого інтернету (Мбіт/с). Показник цифрової інфраструктури.',de:'Mediane Internetgeschwindigkeit über Festnetz (Mbit/s). Indikator für digitale Infrastruktur.'}},
  {id:'index_acceptation_LGBTI',icon:'🏳️‍🌈',fr:'Acceptation LGBTI',en:'LGBTI acceptance index',ua:'Індекс прийняття ЛГБТІ',de:'LGBTI-Akzeptanzindex',desc:{fr:'Indice d\'acceptation sociale des personnes LGBTI, mesurant les attitudes et droits dans la société.',en:'Index of Social Acceptance of LGBTI People, measuring attitudes and rights within society.',ua:'Індекс соціального прийняття людей ЛГБТІ, що вимірює ставлення суспільства та права.',de:'Index der sozialen Akzeptanz von LGBTI-Personen, misst gesellschaftliche Einstellungen und Rechte.'}}  
];

function catName(cat) { return cat[currentLang] || cat.fr; }
function catDesc(cat) { return (cat.desc && cat.desc[currentLang]) ? cat.desc[currentLang] : (cat.desc ? cat.desc.fr : ''); }
function getCountryName(c) {
  if (currentLang === 'de') return c.country_DE || c.country_EN || c.country_FR || c.name || '???';
  if (currentLang === 'en') return c.country_EN || c.country_FR || c.name || '???';
  if (currentLang === 'ua') return c.country_UA || c.country_FR || c.name || '???';
  return c.country_FR || c.country_EN || c.name || '???';
}


// ─── FALLBACK DATA ─────────────────────────────────────────────────────────
function getFallbackData() {
  return [
    {country_FR:'France',    country_EN:'France',        country_UA:'Франція',country_DE:'Frankreich',   flag:'🇫🇷',pib:17, nb_habitant:80, pib_habitant:15, taux_fecondite:100,taux_suicide:20, empreinte_ecologique:55, conso_alcool_par_habitant:12, indice_paix:67, densite_pop:30, esperance_vie:35,travail_enfant:180},
    {country_FR:'États-Unis',country_EN:'United States', country_UA:'США',country_DE:'Vereinigte Staaten',        flag:'🇺🇸',pib:1,  nb_habitant:3,  pib_habitant:8,  taux_fecondite:95, taux_suicide:55, empreinte_ecologique:5,  conso_alcool_par_habitant:25, indice_paix:128,densite_pop:145,esperance_vie:55,travail_enfant:190},
    {country_FR:'Brésil',    country_EN:'Brazil',        country_UA:'Бразилія',country_DE:'Brasilien',  flag:'🇧🇷',pib:9,  nb_habitant:7,  pib_habitant:80, taux_fecondite:60, taux_suicide:60, empreinte_ecologique:40, conso_alcool_par_habitant:38, indice_paix:111,densite_pop:110,esperance_vie:70,travail_enfant:60},
    {country_FR:'Japon',     country_EN:'Japan',         country_UA:'Японія',country_DE:'Japan',    flag:'🇯🇵',pib:4,  nb_habitant:11, pib_habitant:28, taux_fecondite:200,taux_suicide:30, empreinte_ecologique:35, conso_alcool_par_habitant:55, indice_paix:9,  densite_pop:10, esperance_vie:5, travail_enfant:195},
    {country_FR:'Inde',      country_EN:'India',         country_UA:'Індія',country_DE:'Indien',     flag:'🇮🇳',pib:5,  nb_habitant:2,  pib_habitant:140,taux_fecondite:40, taux_suicide:45, empreinte_ecologique:130,conso_alcool_par_habitant:135,indice_paix:135,densite_pop:20, esperance_vie:90,travail_enfant:30},
    {country_FR:'Norvège',   country_EN:'Norway',        country_UA:'Норвегія',country_DE:'Norwegen',  flag:'🇳🇴',pib:35, nb_habitant:120,pib_habitant:3,  taux_fecondite:130,taux_suicide:90, empreinte_ecologique:10, conso_alcool_par_habitant:70, indice_paix:17, densite_pop:180,esperance_vie:10,travail_enfant:192},
    {country_FR:'Nigeria',   country_EN:'Nigeria',       country_UA:'Нігерія',country_DE:'Nigeria',   flag:'🇳🇬',pib:28, nb_habitant:6,  pib_habitant:150,taux_fecondite:5,  taux_suicide:120,empreinte_ecologique:100,conso_alcool_par_habitant:80, indice_paix:150,densite_pop:50, esperance_vie:140,travail_enfant:15},
    {country_FR:'Argentine', country_EN:'Argentina',     country_UA:'Аргентина',country_DE:'Argentinien', flag:'🇦🇷',pib:22, nb_habitant:45, pib_habitant:65, taux_fecondite:80, taux_suicide:75, empreinte_ecologique:65, conso_alcool_par_habitant:45, indice_paix:74, densite_pop:155,esperance_vie:60,travail_enfant:120},
    {country_FR:'Australie', country_EN:'Australia',     country_UA:'Австралія',country_DE:'Australien', flag:'🇦🇺',pib:13, nb_habitant:55, pib_habitant:12, taux_fecondite:115,taux_suicide:80, empreinte_ecologique:8,  conso_alcool_par_habitant:30, indice_paix:13, densite_pop:200,esperance_vie:15,travail_enfant:193},
    {country_FR:'Chine',     country_EN:'China',         country_UA:'Китай',country_DE:'China',     flag:'🇨🇳',pib:2,  nb_habitant:2,  pib_habitant:72, taux_fecondite:175,taux_suicide:40, empreinte_ecologique:3,  conso_alcool_par_habitant:60, indice_paix:100,densite_pop:60, esperance_vie:50,travail_enfant:110}
  ];
}

// ─── PRESET DATA ──────────────────────────────────────────────────────────
// ─── PRESETS ──────────────────────────────────────────────────────────────────
var EUROPEAN_CODES = [
  'AL','AD','AT','BY','BE','BA','BG','HR','CZ','DK',
  'EE','FI','FR','DE','GR','HU','IS','IE','IT','XK',
  'LV','LI','LT','LU','MT','MD','MC','ME','NL','MK',
  'NO','PL','PT','RO','SM','RS','SK','SI','ES','SE',
  'CH','UA','GB','VA','CY','AZ','GE','AM'
];
var AFRICAN_CODES = [
  'DZ','AO','BJ','BW','BF','BI','CM','CV','CF','TD',
  'KM','CG','CD','CI','DJ','EG','GQ','ER','SZ','ET',
  'GA','GM','GH','GN','GW','KE','LS','LR','LY','MG',
  'MW','ML','MR','MU','MA','MZ','NA','NE','NG','RE',
  'RW','ST','SN','SL','SO','ZA','SS','SD','TZ','TG',
  'TN','UG','ZM','ZW','SH'
];
var AMERICAS_CODES = [
  'AG','AR','BS','BB','BZ','BO','BR','CA','CL','CO',
  'CR','CU','DM','DO','EC','SV','GD','GT','GY','HT',
  'HN','JM','MX','NI','PA','PY','PE','KN','LC','VC',
  'SR','TT','US','UY','VE','PR','GP','MQ','GF'
];
var ASIAN_CODES = [
  'AF','AM','AZ','BH','BD','BT','BN','KH','CN','CY',
  'GE','IN','ID','IR','IQ','IL','JP','JO','KZ','KW',
  'KG','LA','LB','MY','MV','MN','MM','NP','KP','OM',
  'PK','PS','PH','QA','SA','SG','KR','LK','SY','TW',
  'TJ','TH','TL','TM','AE','UZ','VN','YE','HK','MO'
];
var OCEANIA_CODES = [
  'AU','FJ','KI','MH','FM','NR','NZ','PW','PG','WS',
  'SB','TO','TV','VU','CK','PF','GU','NC','NU','NF',
  'MP','AS','TK','WF'
];
var TOP100_PIB_CODES = [
  'US','CN','JP','DE','IN','GB','FR','RU','CA','IT',
  'BR','AU','KR','MX','ES','ID','SA','NL','TR','CH',
  'TW','PL','AR','NO','SE','BE','IE','IL','AE','TH',
  'EG','NG','AT','SG','BD','IR','VN','MY','ZA','PH',
  'DK','PK','HK','CO','CL','RO','CZ','FI','IQ','PT',
  'NZ','PE','QA','KZ','GR','DZ','HU','KW','UA','MA',
  'ET','SK','EC','OM','DO','PR','KE','CU','AO','GT',
  'VE','BG','LU','UZ','AZ','PA','TZ','LK','GH','BY',
  'HR','UY','LT','CI','CR','CD','RS','MM','SI','TM',
  'SD','JO','TN','LY','UG','BH','BO','CM','PY','LV'
];
var SPORT_CAT_IDS = ['classement_fifa_H','classement_fifa_F','classement_rugby_H','classement_bball_M'];
// Pays < ~1M habitants (rang nb_habitant >= 162 dans la DB)
var SMALL_COUNTRIES_CODES = [
  'FJ','KM','GY','BT','SB','MO','LU','ME','SR','CV',
  'MT','MV','BN','BS','BZ','IS','VU','PF','NC','BB',
  'ST','WS','CW','LC','GU','KI','GD','FM','JE','TO',
  'SC','AW','VC','VI','AG','IM','AD','DM','KY','BM',
  'GG','GL','FO','MP','KN','TC','SX','AS','MH','LI',
  'MC','SM','MF','BQ','PW','NR','TV'
];
// Pays partageant une frontière avec la France (métropole + DOM)
var FRANCE_NEIGHBORS_CODES = [
  'BE','LU','DE','CH','IT','MC','AD','ES', // métropole
  'GB',                                      // tunnel sous la Manche
  'BR','SR','SX'                             // Guyane française + Saint-Martin
];
// Pays enclavés (sans accès à la mer)
var LANDLOCKED_CODES = [
  'AF','AM','AZ','BY','BT','BO','BW','BF','BI','CF',
  'TD','CZ','ET','HU','KZ','KG','LA','LS','LI','LU',
  'MW','ML','MD','MN','NP','NE','MK','PY','RW','SM',
  'RS','SK','SS','SZ','TJ','TM','UG','UZ','ZM','ZW',
  'AT','XK'
];
// Pays insulaires (entièrement entourés d'eau)
var ISLANDS_CODES = [
  'AG','AU','BS','BB','CV','KM','CU','DM','FJ','GD',
  'HT','IS','ID','JM','JP','KI','MV','MT','MH','MU',
  'FM','NR','NZ','PW','PG','PH','KN','LC','VC','WS',
  'ST','SC','SB','LK','TO','TT','TV','VU','CY','BN',
  'TL','SG','GB','IE','MG','TW'
];

