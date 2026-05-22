/**
 * Finds the best prime parts to buy for plats -> ducats conversion, from warframe.market API
 */

/** Minimum ducats/plat ratio to search for */
const MIN_RATIO = 10
/** Minimum total plat value for a single potential trade (qty*price) */
const MIN_DUCATS_PER_TRADE = 45 * 5


/**
 * @typedef API_Item
 * @property {string} id
 * @property {string} slug
 * @property {string[]} tags
 * @property {string} ducats
 */
/**
 * @typedef Item
 * @extends API_Item
 * @property {string} name
 * @property {number} price
 */
/**
 * @typedef API_TopListing
 * @property {string} id
 * @property {number} platinum
 * @property {number} quantity
 * @property {string} user.ingameName
 */



import moment from 'moment';
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
const items = (await items_response.json()).data.filter(e => {
    return e.ducats && e.ducats >= 45 && e.tags.includes("prime")
})



//
// Get the best available listings for each item, discarding low quantity & bad ducats/plat ratio
//
const good_offers = []
let item_counter = 0

for (const item of items) {
    item_counter += 1
    console.log(`[${item_counter}/${items.length}] Checking top prices for ${item.slug} ...`)
    const url = `https://api.warframe.market/v2/orders/item/${item.slug}/top`
    const response = await fetch(url)
    /** @type {{sell: API_TopListing[]}} */
    const data = (await response.json()).data
    if (!data.sell) continue;

    for (const offer of data.sell) {
        const ratio = item.ducats / offer.platinum
        const total_value_ducats = item.ducats * offer.quantity
        const total_value_plats = item.platinum * offer.quantity

        if (ratio >= MIN_RATIO && total_value_ducats >= MIN_DUCATS_PER_TRADE) {
            console.log(`    Found good offer : ${total_value_ducats} ducats for ${offer.quantity * offer.platinum} plats (${ratio.toFixed(2)})`)

            const str = [
                offer.quantity,
                offer.platinum,
                item.ducats,
                offer.user.ingameName,
                ratio,
                total_value_ducats,
                total_value_plats,
            ].join("\t")
            good_offers.push(str)
        }
    }

    await sleep(200); // Cloudflare is not a fan of 150+ requests in a row
}

console.log("\n-----------------------------------------")
console.log(good_offers)
console.log("\n-----------------------------------------")

await clipboard.write(lines.join("\n"));
console.log("Data saved to clipboard");

