import { cheerio } from 'https://deno.land/x/cheerio@1.0.6/mod.ts';
type Team = {
  imgUrl: string | null;
  name: string | null;
};

type Player = {
  name: string | null;
  imgUrl: string | null;
  age: number | null;
  dob: string | null;
  height: number | null;
  weight: number | null;
  positions: string[];
  fifaRating: number | null;
  fifaPotential: number | null;
  jerseyNumber: number | null;
  currentTeam: string | null;
  teams: Team[];
};

// List of all the Teams that we want to keep track of
const allTeams: { [key: string]: Team } = {};
// List of all possible Positions
const allPositions = new Set<string>();
/* const allPositions = [
  "GK",
  "LWB",
  "LB",
  "CB",
  "RB",
  "RWB",
  "CDM",
  "CM",
  "LM",
  "RM",
  "CAM",
  "LW",
  "LF",
  "CF",
  "RF",
  "RW",
  "ST",
] as const; */

async function getTeamData(teamLink: string): Promise<[Player[], string]> {
  // Load the html page for the player
  const dataRes = await fetch(teamLink);
  const html = await dataRes.text();
  const $ = cheerio.load(html);

  // Find the current team's name
  const currentTeamName = $('div.header h1').text().trim();

  // Find the <table> of players to loop through
  const playersTable = $('table > tbody').first().find('tr');
  const players = (
    playersTable
      .map((_, el) => {
        const tr = $(el);
        // const playerOverall = tr.find('td.col-oa').text().trim();
        // const role = tr.attr('class');
        // if (parseInt(playerOverall, 10) <= 60 && role === 'res') {
        //   return '';
        // }

        // Find the absolute path for the player's URL
        const playerUrl = tr.find('td.col-name > a').attr('href');
        if (!playerUrl) {
          return '';
        }

        // Get the URL stripped of the trailing digits
        const playerUrlMatch = playerUrl.match(/(.*)\/\d+\/?$/);
        if (!playerUrlMatch || playerUrlMatch.length <= 1) {
          return '';
        }

        // So that we can rebuild the URL with `/live` suffix to go to the "In Real Life" page
        // instead of the default player page
        return `https://sofifa.com${playerUrlMatch[1]}/live`;
      })
      .toArray() as unknown as string[]
  ).filter((playerUrl) => playerUrl); // and filter out players that don't exist

  const playersData = [];
  // Loop through every player that we retrieved and fetch their data with getPlayerData
  for (const player of players) {
    const playerData = await getPlayerData(player, currentTeamName);
    // Check for null cases
    if (playerData) {
      playersData.push(playerData);
    }
  }
  console.log(`\nCompleted team "${currentTeamName}"`);
  console.log('-----------------------\n\n\n\n\n');
  return [playersData, currentTeamName];
}

async function getPlayerData(
  playerLink: string,
  currentTeamName: string,
): Promise<Player | null> {
  // Load the html page for the player
  const dataRes = await fetch(playerLink);
  const html = await dataRes.text();
  const $ = cheerio.load(html);

  // Find the elements with the .player-card class, that's where most of the data we want lives
  const playerCard = $('div.player-card');

  // Get the name and url to the player image
  const name = playerCard.find('h5').first().text().trim() || null;
  const imgUrl =
    playerCard.find('img[data-type="player"]').first().attr('data-src') || null;

  // Get the rest of the personal properties related to the player and convert to strings
  const personalProperties = playerCard
    .find('li')
    .map((_, el) => $(el).text().trim())
    .toArray() as unknown as string[];

  // Match the various properties that we need with regex, null if they don't exist
  const [age] = personalProperties[0].match(/\d+/) || [null];
  const dob = personalProperties[1] || null;
  const [height, weight] = personalProperties[2].match(/\d+/g) || [null, null];
  const positions = personalProperties[3].split(' ');
  const [fifaRating] = personalProperties[4].match(/\d+/) || [null];
  const [fifaPotential] = personalProperties[5].match(/\d+/) || [null];
  const [jerseyNumber] = personalProperties[8].match(/\d+/) || [null];

  // If the player's rating is <= 60, don't include them
  if (fifaRating && parseInt(fifaRating, 10) <= 60) {
    console.log(`IGNORED "${name}"`);
    return null;
  }

  // Get the <table> of transfers for the player
  const transferTeamsTable = $('body').find('h5:contains("Transfers")').next();

  // Set up the Team[] and team name lists that we will add to the Player model
  let transferTeams: Team[] = [];
  const transferTeamNames: (string | null)[] = [];
  // If the Transfers table is not empty, then go through it
  if (transferTeamsTable.text()) {
    const transferTeamsElements = $(transferTeamsTable)
      .find('tbody td a')
      .toArray();

    // Fetch the Team data for each unique team in the transfer
    transferTeams = (
      transferTeamsElements.map((el) => {
        const a = $(el);
        const name = a.text();
        const imgUrl = a.prev('figure').find('img').attr('data-src');

        if (name && transferTeamNames.includes(name)) {
          return null;
        } else if (name?.match(/\sU\d+/)) {
          return null;
        }

        transferTeamNames.push(name);

        return {
          name,
          imgUrl,
        };
      }) as Team[]
    ).filter((team) => team);
  }

  // Go through the "Domestic Leagues" <table> looking for past teams
  const domesticTeamNames: (string | null)[] = [];
  const domesticTeamsElements = $('body')
    .find('table')
    .first()
    .find('tbody > tr')
    .map((_, el) => {
      return $(el).children()[1];
    })
    .toArray();

  // Build the unique Teams from the Domestic Teams table
  const domesticTeams = (
    domesticTeamsElements.map((el) => {
      const td = $(el);
      const name = td.text().trim() || null;
      const imgUrl = td.find('img').attr('data-src') || null;

      if (name && domesticTeamNames.includes(name)) {
        return null;
      } else if (name?.match(/\sU\d+/)) {
        return null;
      }

      domesticTeamNames.push(name);

      return {
        imgUrl,
        name,
      };
    }) as Team[]
  ).filter((team) => team);

  const currentTeamInDomesticTeams =
    domesticTeamNames.includes(currentTeamName);
  const currentTeamInTransferTeams =
    transferTeamNames.includes(currentTeamName);
  // If the player's active team is not in the list of teams, then ignore the player as they are
  // most likely a youth academy player we don't want to include
  if (!currentTeamInDomesticTeams && !currentTeamInTransferTeams) {
    console.log(`IGNORED "${name}"`);
    return null;
  }

  // Grab each final team and add the Team data to our list of allTeams to save
  let allPlayerTeams: Team[] = currentTeamInTransferTeams
    ? transferTeams
    : domesticTeams;
  const teams = allPlayerTeams.reduce((pastTeams: Team[], team: Team) => {
    // If there's a null value, ignore the team
    if (!team.name || !team.imgUrl || team.name === currentTeamName) {
      return pastTeams;
    }

    // add the current team to our object of teams to add to the DB
    allTeams[team.name] = team;

    return [...pastTeams, team];
  }, []);
  const currentTeamObj = allPlayerTeams.find(
    (team) => team.name === currentTeamName,
  );
  if (currentTeamObj) {
    teams.unshift(currentTeamObj);
  }

  // Add the positions we find to the set
  positions.forEach((position) => allPositions.add(position));

  console.log(`Successfully parsed "${name}"`);

  // Return the Player model
  return {
    name,
    imgUrl,
    age: age ? parseInt(age, 10) : null,
    dob: dob ? new Date(dob).toISOString() : null,
    height: height ? parseInt(height, 10) : null,
    weight: weight ? parseInt(weight, 10) : null,
    positions,
    fifaRating: fifaRating ? parseInt(fifaRating, 10) : null,
    fifaPotential: fifaPotential ? parseInt(fifaPotential, 10) : null,
    jerseyNumber: jerseyNumber ? parseInt(jerseyNumber, 10) : null,
    currentTeam: currentTeamName || null,
    teams,
  };
}

// Load the html page for the Premier League
const plTeamsRes = await fetch('https://sofifa.com/teams?lg=13');
const html = await plTeamsRes.text();
const $ = cheerio.load(html);

// Find the <table> that holds all the Teams in the Premier League
const teamsTable = $('table > tbody').first().find('tr');
// Loop through each <tr> row and snag the URL for the Team page
const teamUrls = teamsTable
  .map((_, el) => {
    const tds = $(el).find('td');
    const nameAndUrl = $(tds[1]);
    const urlPath = nameAndUrl.find('a').attr('href');

    if (!urlPath) {
      return null;
    }

    return `https://sofifa.com${urlPath}`;
  })
  .toArray() as unknown as (string | null)[];

// Build the final payload that we will save as JSON
const plData: {
  positions: string[];
  teams: Team[];
  players: Player[];
} = {
  positions: [],
  teams: [],
  players: [],
};

// Fetch all the players, parse them, and add them to our payload
for (const teamUrl of teamUrls) {
  // Make sure that the teamUrl is not null or the empty string
  if (!teamUrl) {
    continue;
  }
  // Fetch every Team's data in the Premier League
  const [teamData] = await getTeamData(teamUrl);
  plData.players.push(...teamData);
}

// Add all the positions and teams to our payload
plData.positions = Array.from(allPositions);
plData.teams = Object.values(allTeams);

// Save the JSON data to disk
const encoder = new TextEncoder();
const jsonData = encoder.encode(JSON.stringify(plData));
await Deno.writeFile('./public/plData.json', jsonData, { create: true });
