/**
 * Finds the best prime parts to buy for plats -> ducats conversion, from warframe.market API
 */

/** Minimum ducats/plat ratio to search for */
const MIN_RATIO = 10
/** Minimum total ducat value for a single trade (qty*price) */
const MIN_DUCATS_PER_TRADE = 45 * 5


/**
 * @typedef API_Item
 * @property {string} id
 * @property {string} slug
 * @property {string} i18n.en.name
 * @property {string[]} tags
 * @property {string} ducats
 */
/**
 * @typedef User
 * @property {string} id
 * @property {string} ingameName
 * @property {"pc"|string} platform
 * @property {"ingame"|"online"|"offline"} status
 * @property {boolean} crossplay
 * @property {string} lastSeen Date
 */
/**
 * @typedef API_Offer
 * @property {string} id
 * @property {"sell"|"buy"}
 * @property {number} platinum
 * @property {number} quantity
 * @property {User} user
 */



import clipboard from 'clipboardy';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}



//
// Get the list of prime parts/sets with ducats_value >= 45 
//
const items_url = 'https://api.warframe.market/v2/items'
const items_response = await fetch(items_url)
/** @type {API_Item[]} */
let items = (await items_response.json()).data
items = items.filter(e => e.ducats && e.ducats >= 45 && e.tags.includes("prime"))



//
// Get the best available listings for each item, discarding low quantity & bad ducats/plat ratio
//
const good_offers = []
good_offers.push(["name", "qty", "plats", "ducats", "ratio", "total_plats", "total_ducats", "player", "market", "message"])
let item_counter = 0

for (const item of items) {
    item_counter += 1
    console.log(`[${item_counter}/${items.length}] Checking offers for ${item.slug} ...`)
    const url = `https://api.warframe.market/v2/orders/item/${item.slug}`
    const response = await fetch(url)
    /** @type {{sell: API_Offer[]}} */
    let offers = (await response.json()).data
    offers = offers.filter(e => e.user.status === "ingame")
        .filter(e => e.type === "sell")
        .filter(e => e.user.platform === "pc" || e.user.crossplay)

    for (const offer of offers) {
        const ratio = item.ducats / offer.platinum
        const total_value_ducats = item.ducats * offer.quantity
        const total_value_plats = offer.platinum * offer.quantity

        if (ratio >= MIN_RATIO && total_value_ducats >= MIN_DUCATS_PER_TRADE) {
            console.log(`    Found good offer : ${total_value_ducats} ducats for ${offer.quantity * offer.platinum} plats (${ratio.toFixed(2)})`)
            const str = [
                item.i18n.en.name,
                offer.quantity,
                offer.platinum,
                item.ducats,
                ratio.toFixed(2).replace(".", ","),
                total_value_plats,
                total_value_ducats,
                `'${offer.user.ingameName}`,
                `https://warframe.market/items/${item.slug}`,
                `'@${offer.user.ingameName} Hi, would like to buy ${item.i18n.en.name}`
            ]
            good_offers.push(str)
        }
    }

    await sleep(150); // Cloudflare is not a fan of 150+ requests in a row
}

console.log("\n-----------------------------------------")
console.table(good_offers)
console.log("\n-----------------------------------------")

await clipboard.write(good_offers.map(e => e.join("\t")).join("\n"));
console.log("Data saved to clipboard");

