/**
 * Get the list of arcanes, the weekly volume sold, and the moving average price from warframe.market API
 */

/**
 * @typedef API_Item
 * @property {string} id
 * @property {string} slug
 * @property {string[]} tags
 * @property {number} maxRank
 */
/**
 * @typedef Item
 * @extends API_Item
 * @property {string} name
 * @property {number} price
 */



import moment from 'moment';
import clipboard from 'clipboardy';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}



//
// Get the list of arcanes
//
const items_url = 'https://api.warframe.market/v2/items'
const items_response = await fetch(items_url)
/** @type {API_Item[]} */
const items = (await items_response.json()).data
/** @type {Item[]} */
const arcanes = []
for (const item of items) {
    if (item.tags && item.tags.includes("arcane_enhancement") && !item.tags.includes("peculiar")) {
        arcanes.push({...item, name: item.i18n.en.name, price: 0})
    }
}
arcanes.sort((a, b) => a.name.localeCompare(b.name));

if (arcanes.length !== 162) {
    console.error(`The list of arcanes has been expanded (162 -> ${arcanes.length})`)
    process.exit(1)
}



//
// Get the volume & moving average price for each arcane (R0 and R3/R5)
//
const lastWeek = moment().startOf("day").subtract(7, "day")
const lines = []

for (const arcane of arcanes) {
    const url = `https://api.warframe.market/v1/items/${arcane.slug}/statistics`
    const response = await fetch(url)
    const data = await response.json()
    const statistics_full = data.payload.statistics_closed["90days"]
    const statistics = statistics_full.filter(e => moment(e.datetime).isSameOrAfter(lastWeek, "day"))
    const pricing_data = {
        moving_avg_rank_0: 0,
        volume_rank_0: 0,
        moving_avg_rank_max: 0,
        volume_rank_max: 0,
    }

    for (const stat of statistics) {
        if (stat.mod_rank === 5 || stat.mod_rank === 3) {
            pricing_data.volume_rank_max += stat.volume ? stat.volume : 0
            pricing_data.moving_avg_rank_max = (pricing_data.moving_avg_rank_max === 0 && stat.moving_avg) ? stat.moving_avg : pricing_data.moving_avg_rank_max
        } else if (stat.mod_rank === 0) {
            pricing_data.volume_rank_0 += stat.volume ? stat.volume : 0
            pricing_data.moving_avg_rank_0 = (pricing_data.moving_avg_rank_0 === 0 && stat.moving_avg) ? stat.moving_avg : pricing_data.moving_avg_rank_0
        }
    }

    const str = [
        arcane.name,
        pricing_data.moving_avg_rank_0.toString().replace('.', ','),
        pricing_data.volume_rank_0,
        pricing_data.moving_avg_rank_max.toString().replace('.', ','),
        pricing_data.volume_rank_max,
    ].join("\t")
    lines.push(str)
    console.log(str)

    await sleep(100); // Cloudflare is not a fan of 150+ requests in a row
}

await clipboard.write(lines.join("\n"));
console.log("Data saved to clipboard");

