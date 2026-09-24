import * as fs from 'fs';
import * as path from 'path';

// A mapping of US state FIPS codes (or names) to their postal abbreviations.
const statePostalMap: Record<string, string> = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA',
  '08': 'CO', '09': 'CT', '10': 'DE', '11': 'DC', '12': 'FL',
  '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN',
  '19': 'IA', '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME',
  '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS',
  '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH',
  '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND',
  '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI',
  '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT',
  '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI',
  '56': 'WY', '72': 'PR'
};

// Fallback lookup by Name
const namePostalMap: Record<string, string> = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
  'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
  'District of Columbia': 'DC', 'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI',
  'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
  'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
  'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
  'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
  'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
  'Wisconsin': 'WI', 'Wyoming': 'WY', 'Puerto Rico': 'PR'
};

const inputFiles = [
  path.join(__dirname, '../public/data/US GeoJSON 2010 5m.json'),
  path.join(__dirname, '../public/data/states.geojson')
];
const outputFile = path.join(__dirname, '../public/data/states.optimized.geojson');

let inputFileToUse = null;

for (const file of inputFiles) {
  if (fs.existsSync(file)) {
    inputFileToUse = file;
    break;
  }
}

if (!inputFileToUse) {
  console.error("No valid raw states geojson found!");
  process.exit(1);
}

console.log(`Using raw geojson: ${inputFileToUse}`);

const rawData = JSON.parse(fs.readFileSync(inputFileToUse, 'utf8'));

// The requested exclusions
const excludeNames = ['Alaska', 'Hawaii', 'Puerto Rico'];

const newFeatures = [];

for (const feature of rawData.features) {
  const props = feature.properties || {};
  
  // Try to determine name and fips
  const name = props.NAME || props.name || props.STATE_NAME || props.statename || "";
  const fips = props.STATE || props.state || props.STATE_FIPS || props.fips || "";
  const censusArea = props.CENSUSAREA || props.censusarea || props.CENSUS_AREA || 0;

  if (excludeNames.includes(name)) {
    continue;
  }

  // Figure out postal
  let postal = "";
  if (fips && statePostalMap[fips]) {
    postal = statePostalMap[fips];
  } else if (name && namePostalMap[name]) {
    postal = namePostalMap[name];
  } else {
    postal = props.postal || props.STUSPS || props.abbrev || "UNKNOWN";
  }

  // Re-map properties
  feature.properties = {
    name,
    postal,
    fips,
    censusArea
  };

  newFeatures.push(feature);
}

rawData.features = newFeatures;

fs.writeFileSync(outputFile, JSON.stringify(rawData, null, 2));
console.log(`Successfully wrote optimized geojson to: ${outputFile}`);
console.log(`Total states included: ${newFeatures.length}`);
