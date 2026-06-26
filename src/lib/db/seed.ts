import Database from 'better-sqlite3'
import path from 'path'
import bcrypt from 'bcryptjs'

const dbPath = path.join(process.cwd(), 'db', 'reptiplus.db')

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export async function seed() {
  const sqlite = new Database(dbPath)

  // Admin user
  const adminPassword = await bcrypt.hash('admin123', 12)
  const adminId = generateId()
  sqlite.prepare(`
    INSERT OR IGNORE INTO users (id, email, password, first_name, last_name, role)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(adminId, 'admin@reptiplus.cz', adminPassword, 'Admin', 'Reptiplus', 'admin')

  // Categories
  const cats = [
    { id: generateId(), slug: 'osvetleni', name_cs: 'Osvětlení', name_en: 'Lighting', name_de: 'Beleuchtung', sort_order: 1 },
    { id: generateId(), slug: 'vyhrivani', name_cs: 'Vyhřívání', name_en: 'Heating', name_de: 'Heizung', sort_order: 2 },
    { id: generateId(), slug: 'terraria', name_cs: 'Terária', name_en: 'Terrariums', name_de: 'Terrarien', sort_order: 3 },
    { id: generateId(), slug: 'krmivo', name_cs: 'Krmivo', name_en: 'Food', name_de: 'Futter', sort_order: 4 },
    { id: generateId(), slug: 'vitaminy', name_cs: 'Vitamíny & doplňky', name_en: 'Vitamins & Supplements', name_de: 'Vitamine & Ergänzungen', sort_order: 5 },
    { id: generateId(), slug: 'dekorace', name_cs: 'Dekorace', name_en: 'Decoration', name_de: 'Dekoration', sort_order: 6 },
    { id: generateId(), slug: 'doplnky', name_cs: 'Doplňky', name_en: 'Accessories', name_de: 'Zubehör', sort_order: 7 },
  ]

  const catStmt = sqlite.prepare(`
    INSERT OR IGNORE INTO categories (id, slug, name_cs, name_en, name_de, sort_order)
    VALUES (@id, @slug, @name_cs, @name_en, @name_de, @sort_order)
  `)
  for (const cat of cats) catStmt.run(cat)

  const catMap: Record<string, string> = {}
  for (const cat of cats) catMap[cat.slug] = cat.id

  // Products
  const products = [
    {
      id: generateId(), slug: 'arcadia-desert-pro-t5-uvb-12', sku: 'ARC-T5-12',
      name_cs: 'Arcadia Desert Pro T5 UVB 12% 54W', name_en: 'Arcadia Desert Pro T5 UVB 12% 54W', name_de: 'Arcadia Desert Pro T5 UVB 12% 54W',
      description_cs: 'Profesionální UVB zářivka pro pouštní plazy. Emituje 12% UVB záření ideální pro agamy, gekony a chameleony. Délka 120 cm, výkon 54W.',
      description_en: 'Professional UVB lamp for desert reptiles. Emits 12% UVB radiation ideal for bearded dragons, geckos and chameleons.',
      description_de: 'Professionelle UVB-Lampe für Wüstenreptilien. Emittiert 12% UVB-Strahlung, ideal für Bartagamen, Geckos und Chamäleons.',
      category_id: catMap['osvetleni'], price: 849, price_excl: 701.65, vat_rate: 21,
      stock: 23, is_active: 1, is_new: 1, is_featured: 1, images: JSON.stringify(['/images/placeholder-uvb.jpg']),
      parameters: JSON.stringify({ 'Výkon': '54W', 'UVB': '12%', 'Délka': '120 cm', 'Typ': 'T5' })
    },
    {
      id: generateId(), slug: 'arcadia-jungle-dawn-led-bar-35w', sku: 'ARC-LED-35',
      name_cs: 'Arcadia Jungle Dawn LED Bar 35W', name_en: 'Arcadia Jungle Dawn LED Bar 35W', name_de: 'Arcadia Jungle Dawn LED Bar 35W',
      description_cs: 'LED osvětlovací tyč s plným spektrem pro tropická terária. Ideální pro pěstování rostlin a přirozené osvětlení terária.',
      description_en: 'Full spectrum LED lighting bar for tropical terrariums. Ideal for plant growth and natural terrarium lighting.',
      description_de: 'Vollspektrum-LED-Beleuchtungsleiste für tropische Terrarien.',
      category_id: catMap['osvetleni'], price: 1290, price_excl: 1066.12, vat_rate: 21,
      stock: 12, is_active: 1, is_featured: 1, images: JSON.stringify(['/images/placeholder-led.jpg']),
      parameters: JSON.stringify({ 'Výkon': '35W', 'Typ': 'LED', 'Spektrum': 'Plné' })
    },
    {
      id: generateId(), slug: 'reptile-systems-uvb-6-t8-30w', sku: 'RS-T8-6',
      name_cs: 'Reptile Systems UVB 6% T8 30W', name_en: 'Reptile Systems UVB 6% T8 30W', name_de: 'Reptile Systems UVB 6% T8 30W',
      description_cs: 'UVB zářivka pro lesní a tropické druhy. 6% UVB záření vhodné pro hady, gekony a leguány.',
      description_en: 'UVB lamp for forest and tropical species. 6% UVB suitable for snakes, geckos and iguanas.',
      description_de: 'UVB-Lampe für Wald- und Tropikarten. 6% UVB geeignet für Schlangen, Geckos und Leguane.',
      category_id: catMap['osvetleni'], price: 429, price_excl: 354.55, vat_rate: 21,
      compare_price: 499, stock: 35, is_active: 1, is_sale: 1, images: JSON.stringify(['/images/placeholder-uvb6.jpg']),
      parameters: JSON.stringify({ 'Výkon': '30W', 'UVB': '6%', 'Typ': 'T8' })
    },
    {
      id: generateId(), slug: 'habistat-heat-mat-29w', sku: 'HAB-HM-29',
      name_cs: 'HabiStat Heat Mat 29W (58x28cm)', name_en: 'HabiStat Heat Mat 29W', name_de: 'HabiStat Wärmematte 29W',
      description_cs: 'Topná rohož pro terária. Vytváří příjemné spodní teplo. Bezpečná a spolehlivá pro všechny druhy plazů.',
      description_en: 'Heating mat for terrariums. Creates pleasant bottom heat. Safe and reliable for all reptile species.',
      description_de: 'Heizmatte für Terrarien. Erzeugt angenehme Bodentemperatur.',
      category_id: catMap['vyhrivani'], price: 699, price_excl: 577.69, vat_rate: 21,
      stock: 18, is_active: 1, is_featured: 1, images: JSON.stringify(['/images/placeholder-mat.jpg']),
      parameters: JSON.stringify({ 'Výkon': '29W', 'Rozměry': '58×28 cm' })
    },
    {
      id: generateId(), slug: 'exo-terra-ceramic-heat-emitter-150w', sku: 'ET-CHE-150',
      name_cs: 'Exo Terra Ceramic Heat Emitter 150W', name_en: 'Exo Terra Ceramic Heat Emitter 150W', name_de: 'Exo Terra Keramik-Heizstrahler 150W',
      description_cs: 'Keramický topný zářič bez světla. Ideální pro noční ohřev terária. Extrémně dlouhá životnost.',
      description_en: 'Ceramic heat emitter without light. Ideal for nighttime terrarium heating. Extremely long lifespan.',
      description_de: 'Keramik-Heizstrahler ohne Licht. Ideal für nächtliche Terrarienheizung.',
      category_id: catMap['vyhrivani'], price: 549, price_excl: 453.72, vat_rate: 21,
      stock: 27, is_active: 1, is_new: 1, images: JSON.stringify(['/images/placeholder-ceramic.jpg']),
      parameters: JSON.stringify({ 'Výkon': '150W', 'Typ': 'Keramický' })
    },
    {
      id: generateId(), slug: 'exo-terra-natural-terrarium-medium', sku: 'ET-NT-M',
      name_cs: 'Exo Terra Natural Terrarium Medium (60x45x45)', name_en: 'Exo Terra Natural Terrarium Medium', name_de: 'Exo Terra Natural Terrarium Medium',
      description_cs: 'Prémiové terárium s předním otevíráním, dvojitými dvířky a oddělitelnou spodní částí pro snadné čištění.',
      description_en: 'Premium terrarium with front opening, double doors and removable bottom for easy cleaning.',
      description_de: 'Premium-Terrarium mit Frontöffnung, Doppeltüren und herausnehmbarem Boden.',
      category_id: catMap['terraria'], price: 4990, price_excl: 4123.97, vat_rate: 21,
      stock: 5, is_active: 1, is_featured: 1, images: JSON.stringify(['/images/placeholder-terrarium.jpg']),
      parameters: JSON.stringify({ 'Rozměry': '60×45×45 cm', 'Materiál': 'Sklo + plast' })
    },
    {
      id: generateId(), slug: 'repashy-crested-gecko-diet-85g', sku: 'REP-CGD-85',
      name_cs: 'Repashy Crested Gecko Diet 85g', name_en: 'Repashy Crested Gecko Diet 85g', name_de: 'Repashy Crested Gecko Diet 85g',
      description_cs: 'Kompletní potrava pro řasnáče chocholatého. Smíchejte 1 díl prášku se 2 díly vody. Stačí na 2-3 měsíce.',
      description_en: 'Complete diet for crested geckos. Mix 1 part powder with 2 parts water. Lasts 2-3 months.',
      description_de: 'Vollständige Nahrung für Kronengeckos. 1 Teil Pulver mit 2 Teilen Wasser mischen.',
      category_id: catMap['krmivo'], price: 289, price_excl: 238.84, vat_rate: 21,
      stock: 45, is_active: 1, is_new: 1, images: JSON.stringify(['/images/placeholder-food.jpg']),
      parameters: JSON.stringify({ 'Hmotnost': '85g', 'Pro druhy': 'Řasnáč chocholatý' })
    },
    {
      id: generateId(), slug: 'arcadia-earth-pro-vitamin-d3', sku: 'ARC-VD3',
      name_cs: 'Arcadia EarthPro-A + Calcium + D3 50g', name_en: 'Arcadia EarthPro-A + Calcium + D3 50g', name_de: 'Arcadia EarthPro-A + Calcium + D3 50g',
      description_cs: 'Multivitaminový doplněk s vápníkem a vitamínem D3 pro všechny druhy plazů. Bez syntetických vitamínů.',
      description_en: 'Multivitamin supplement with calcium and D3 for all reptile species. No synthetic vitamins.',
      description_de: 'Multivitamin-Ergänzung mit Calcium und D3 für alle Reptilienarten.',
      category_id: catMap['vitaminy'], price: 249, price_excl: 205.79, vat_rate: 21,
      stock: 67, is_active: 1, is_featured: 1, images: JSON.stringify(['/images/placeholder-vitamin.jpg']),
      parameters: JSON.stringify({ 'Hmotnost': '50g', 'Složení': 'Vitamíny + Vápník + D3' })
    },
    {
      id: generateId(), slug: 'exo-terra-desert-sand-red-4kg', sku: 'ET-DS-R4',
      name_cs: 'Exo Terra Desert Sand Červený 4kg', name_en: 'Exo Terra Desert Sand Red 4kg', name_de: 'Exo Terra Wüstensand Rot 4kg',
      description_cs: 'Přirozený červený pouštní písek pro pouštní terárium. Bezpečný, bez prachu, snadné čištění.',
      description_en: 'Natural red desert sand for desert terrariums. Safe, dust-free, easy to clean.',
      description_de: 'Natürlicher roter Wüstensand für Wüstenterrarien.',
      category_id: catMap['dekorace'], price: 189, price_excl: 156.2, vat_rate: 21,
      compare_price: 229, stock: 89, is_active: 1, is_sale: 1, images: JSON.stringify(['/images/placeholder-sand.jpg']),
      parameters: JSON.stringify({ 'Hmotnost': '4kg', 'Barva': 'Červená' })
    },
    {
      id: generateId(), slug: 'habistat-pulse-proportional-thermostat', sku: 'HAB-TSTAT',
      name_cs: 'HabiStat Pulse Proportional Termostat', name_en: 'HabiStat Pulse Proportional Thermostat', name_de: 'HabiStat Pulsierend-Proportional Thermostat',
      description_cs: 'Profesionální termostat s pulsní regulací pro keramické topné tělesy a topné rohože. Rozsah 0-45°C.',
      description_en: 'Professional thermostat with pulse regulation for ceramic heaters and heat mats. Range 0-45°C.',
      description_de: 'Professioneller Thermostat mit Pulsregelung für Keramikheizungen und Heizmatten.',
      category_id: catMap['doplnky'], price: 1190, price_excl: 983.47, vat_rate: 21,
      stock: 14, is_active: 1, is_featured: 1, images: JSON.stringify(['/images/placeholder-thermostat.jpg']),
      parameters: JSON.stringify({ 'Rozsah': '0-45°C', 'Typ': 'Pulsní proporcionální' })
    },
  ]

  const prodStmt = sqlite.prepare(`
    INSERT OR IGNORE INTO products (
      id, slug, sku, name_cs, name_en, name_de,
      description_cs, description_en, description_de,
      category_id, price, price_excl, vat_rate, compare_price,
      stock, is_active, is_featured, is_new, is_sale,
      images, parameters
    ) VALUES (
      @id, @slug, @sku, @name_cs, @name_en, @name_de,
      @description_cs, @description_en, @description_de,
      @category_id, @price, @price_excl, @vat_rate, @compare_price,
      @stock, @is_active, @is_featured, @is_new, @is_sale,
      @images, @parameters
    )
  `)

  for (const prod of products) {
    prodStmt.run({
      compare_price: null, is_featured: 0, is_new: 0, is_sale: 0,
      ...prod,
    })
  }

  // Default settings
  const settingsData = [
    { key: 'shop_name', value: 'Reptiplus' },
    { key: 'shop_email', value: 'info@reptiplus.cz' },
    { key: 'shop_phone', value: '+420 123 456 789' },
    { key: 'free_shipping_threshold', value: '2000' },
    { key: 'shipping_zasilkovna_price', value: '89' },
    { key: 'shipping_ppl_price', value: '129' },
    { key: 'shipping_personal_price', value: '0' },
    { key: 'vat_rate', value: '21' },
  ]

  const settingsStmt = sqlite.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES (@key, @value)`)
  for (const s of settingsData) settingsStmt.run(s)

  // Sample blog post
  const blogId = generateId()
  sqlite.prepare(`
    INSERT OR IGNORE INTO blog_posts (id, slug, title_cs, content_cs, is_published, published_at, author_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    blogId, 'jak-vybrat-uvb-osvetleni',
    'Jak vybrat správné UVB osvětlení pro vašeho plaza',
    `<p>UVB záření je pro mnoho druhů plazů naprosto nezbytné. Pomáhá syntetizovat vitamín D3, který je klíčový pro vstřebávání vápníku a zdraví kostí.</p>
    <h2>Typy UVB záření</h2>
    <p>UVB osvětlení se dělí podle procenta emitovaného UVB záření. Pro pouštní druhy jako je agama vousatá doporučujeme 10-12% UVB, pro lesní a stínomilné druhy 5-6%.</p>
    <h2>T5 vs T8</h2>
    <p>Zářivky T5 mají menší průměr a vyšší výkon než T8. T5 zářivky lze umístit dále od zvířete a stále dosahují dostatečné intenzity UVB.</p>`,
    1, new Date().toISOString(), adminId
  )

  // Sample coupon
  sqlite.prepare(`
    INSERT OR IGNORE INTO coupons (id, code, type, value, min_order_amount, is_active)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(generateId(), 'REPTIPLUS10', 'percent', 10, 500, 1)

  sqlite.close()
  console.log('Database seeded successfully!')
}
