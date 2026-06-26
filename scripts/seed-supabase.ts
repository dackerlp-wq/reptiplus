import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sntwqjbvqxogtqrvoyme.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required. Create .env.local first.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

async function seed() {
  console.log('Seeding Supabase...')

  // Admin user
  const adminPassword = await bcrypt.hash('admin123', 12)
  const adminId = generateId()
  await supabase.from('users').upsert({
    id: adminId,
    email: 'admin@reptiplus.cz',
    password: adminPassword,
    first_name: 'Admin',
    last_name: 'Reptiplus',
    role: 'admin',
  }, { onConflict: 'email' })
  console.log('Admin user created')

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

  const { error: catError } = await supabase.from('categories').upsert(cats, { onConflict: 'slug' })
  if (catError) console.error('Categories error:', catError)
  else console.log('Categories created')

  // Fetch inserted cats to get IDs
  const { data: insertedCats } = await supabase.from('categories').select('id, slug')
  const catMap: Record<string, string> = {}
  for (const c of insertedCats || []) catMap[c.slug] = c.id

  // Products
  const products = [
    {
      id: generateId(), slug: 'arcadia-desert-pro-t5-uvb-12', sku: 'ARC-T5-12',
      name_cs: 'Arcadia Desert Pro T5 UVB 12% 54W', name_en: 'Arcadia Desert Pro T5 UVB 12% 54W', name_de: 'Arcadia Desert Pro T5 UVB 12% 54W',
      description_cs: 'Profesionální UVB zářivka pro pouštní plazy. 12% UVB záření, délka 120 cm, výkon 54W.',
      description_en: 'Professional UVB lamp for desert reptiles. 12% UVB radiation.',
      description_de: 'Professionelle UVB-Lampe für Wüstenreptilien. 12% UVB-Strahlung.',
      category_id: catMap['osvetleni'], price: 849, price_excl: 701.65, vat_rate: 21,
      stock: 23, is_active: 1, is_new: 1, is_featured: 1, is_sale: 0, compare_price: null,
      images: JSON.stringify(['/images/placeholder-uvb.jpg']),
      parameters: JSON.stringify({ 'Výkon': '54W', 'UVB': '12%', 'Délka': '120 cm', 'Typ': 'T5' })
    },
    {
      id: generateId(), slug: 'arcadia-jungle-dawn-led-bar-35w', sku: 'ARC-LED-35',
      name_cs: 'Arcadia Jungle Dawn LED Bar 35W', name_en: 'Arcadia Jungle Dawn LED Bar 35W', name_de: 'Arcadia Jungle Dawn LED Bar 35W',
      description_cs: 'LED osvětlovací tyč s plným spektrem pro tropická terária.',
      description_en: 'Full spectrum LED lighting bar for tropical terrariums.',
      description_de: 'Vollspektrum-LED-Beleuchtungsleiste für tropische Terrarien.',
      category_id: catMap['osvetleni'], price: 1290, price_excl: 1066.12, vat_rate: 21,
      stock: 12, is_active: 1, is_featured: 1, is_new: 0, is_sale: 0, compare_price: null,
      images: JSON.stringify(['/images/placeholder-led.jpg']),
      parameters: JSON.stringify({ 'Výkon': '35W', 'Typ': 'LED' })
    },
    {
      id: generateId(), slug: 'reptile-systems-uvb-6-t8-30w', sku: 'RS-T8-6',
      name_cs: 'Reptile Systems UVB 6% T8 30W', name_en: 'Reptile Systems UVB 6% T8 30W', name_de: 'Reptile Systems UVB 6% T8 30W',
      description_cs: 'UVB zářivka pro lesní a tropické druhy. 6% UVB záření.',
      description_en: 'UVB lamp for forest and tropical species. 6% UVB.',
      description_de: 'UVB-Lampe für Wald- und Tropikarten. 6% UVB.',
      category_id: catMap['osvetleni'], price: 429, price_excl: 354.55, vat_rate: 21,
      compare_price: 499, stock: 35, is_active: 1, is_sale: 1, is_new: 0, is_featured: 0,
      images: JSON.stringify(['/images/placeholder-uvb6.jpg']),
      parameters: JSON.stringify({ 'Výkon': '30W', 'UVB': '6%', 'Typ': 'T8' })
    },
    {
      id: generateId(), slug: 'habistat-heat-mat-29w', sku: 'HAB-HM-29',
      name_cs: 'HabiStat Heat Mat 29W (58x28cm)', name_en: 'HabiStat Heat Mat 29W', name_de: 'HabiStat Wärmematte 29W',
      description_cs: 'Topná rohož pro terária. Bezpečná a spolehlivá pro všechny druhy plazů.',
      description_en: 'Heating mat for terrariums. Safe and reliable for all reptile species.',
      description_de: 'Heizmatte für Terrarien.',
      category_id: catMap['vyhrivani'], price: 699, price_excl: 577.69, vat_rate: 21,
      stock: 18, is_active: 1, is_featured: 1, is_new: 0, is_sale: 0, compare_price: null,
      images: JSON.stringify(['/images/placeholder-heatmat.jpg']),
      parameters: JSON.stringify({ 'Výkon': '29W', 'Rozměry': '58×28 cm' })
    },
    {
      id: generateId(), slug: 'exo-terra-natural-terrarium-medium', sku: 'ET-NT-M',
      name_cs: 'Exo Terra Natural Terrarium Medium (60x45x45)', name_en: 'Exo Terra Natural Terrarium Medium', name_de: 'Exo Terra Natural Terrarium Medium',
      description_cs: 'Prémiové terárium s předním otevíráním.',
      description_en: 'Premium terrarium with front opening.',
      description_de: 'Premium-Terrarium mit Frontöffnung.',
      category_id: catMap['terraria'], price: 4990, price_excl: 4123.97, vat_rate: 21,
      stock: 5, is_active: 1, is_featured: 1, is_new: 0, is_sale: 0, compare_price: null,
      images: JSON.stringify(['/images/placeholder-terrarium.jpg']),
      parameters: JSON.stringify({ 'Rozměry': '60×45×45 cm' })
    },
    {
      id: generateId(), slug: 'repashy-crested-gecko-diet-85g', sku: 'REP-CGD-85',
      name_cs: 'Repashy Crested Gecko Diet 85g', name_en: 'Repashy Crested Gecko Diet 85g', name_de: 'Repashy Crested Gecko Diet 85g',
      description_cs: 'Kompletní potrava pro řasnáče chocholatého.',
      description_en: 'Complete diet for crested geckos.',
      description_de: 'Vollständige Nahrung für Kronengeckos.',
      category_id: catMap['krmivo'], price: 289, price_excl: 238.84, vat_rate: 21,
      stock: 45, is_active: 1, is_new: 1, is_featured: 0, is_sale: 0, compare_price: null,
      images: JSON.stringify(['/images/placeholder-food.jpg']),
      parameters: JSON.stringify({ 'Hmotnost': '85g' })
    },
    {
      id: generateId(), slug: 'arcadia-earth-pro-vitamin-d3', sku: 'ARC-VD3',
      name_cs: 'Arcadia EarthPro-A + Calcium + D3 50g', name_en: 'Arcadia EarthPro-A + Calcium + D3 50g', name_de: 'Arcadia EarthPro-A + Calcium + D3 50g',
      description_cs: 'Multivitaminový doplněk s vápníkem a vitamínem D3.',
      description_en: 'Multivitamin supplement with calcium and D3.',
      description_de: 'Multivitamin-Ergänzung mit Calcium und D3.',
      category_id: catMap['vitaminy'], price: 249, price_excl: 205.79, vat_rate: 21,
      stock: 67, is_active: 1, is_featured: 1, is_new: 0, is_sale: 0, compare_price: null,
      images: JSON.stringify(['/images/placeholder-vitamin.jpg']),
      parameters: JSON.stringify({ 'Hmotnost': '50g' })
    },
    {
      id: generateId(), slug: 'exo-terra-desert-sand-red-4kg', sku: 'ET-DS-R4',
      name_cs: 'Exo Terra Desert Sand Červený 4kg', name_en: 'Exo Terra Desert Sand Red 4kg', name_de: 'Exo Terra Wüstensand Rot 4kg',
      description_cs: 'Přirozený červený pouštní písek pro pouštní terárium.',
      description_en: 'Natural red desert sand for desert terrariums.',
      description_de: 'Natürlicher roter Wüstensand für Wüstenterrarien.',
      category_id: catMap['dekorace'], price: 189, price_excl: 156.2, vat_rate: 21,
      compare_price: 229, stock: 89, is_active: 1, is_sale: 1, is_new: 0, is_featured: 0,
      images: JSON.stringify(['/images/placeholder-sand.jpg']),
      parameters: JSON.stringify({ 'Hmotnost': '4kg', 'Barva': 'Červená' })
    },
    {
      id: generateId(), slug: 'habistat-pulse-proportional-thermostat', sku: 'HAB-TSTAT',
      name_cs: 'HabiStat Pulse Proportional Termostat', name_en: 'HabiStat Pulse Proportional Thermostat', name_de: 'HabiStat Pulsierend-Proportional Thermostat',
      description_cs: 'Profesionální termostat s pulsní regulací.',
      description_en: 'Professional thermostat with pulse regulation.',
      description_de: 'Professioneller Thermostat mit Pulsregelung.',
      category_id: catMap['doplnky'], price: 1190, price_excl: 983.47, vat_rate: 21,
      stock: 14, is_active: 1, is_featured: 1, is_new: 0, is_sale: 0, compare_price: null,
      images: JSON.stringify(['/images/placeholder-thermostat.jpg']),
      parameters: JSON.stringify({ 'Typ': 'Pulsní proporcionální' })
    },
  ]

  const { error: prodError } = await supabase.from('products').upsert(products, { onConflict: 'sku' })
  if (prodError) console.error('Products error:', prodError)
  else console.log('Products created')

  // Settings
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
  const { error: settingsError } = await supabase.from('settings').upsert(settingsData, { onConflict: 'key' })
  if (settingsError) console.error('Settings error:', settingsError)
  else console.log('Settings created')

  // Sample coupon
  const { error: couponError } = await supabase.from('coupons').upsert({
    id: generateId(),
    code: 'REPTIPLUS10',
    type: 'percent',
    value: 10,
    min_order_amount: 500,
    is_active: 1,
  }, { onConflict: 'code' })
  if (couponError) console.error('Coupon error:', couponError)
  else console.log('Coupon created')

  console.log('Seeding complete!')
}

seed().catch(console.error)
