import type { Database } from 'sql.js';

// Set the database's schema
export function setSchema(db: Database) {
  // Users table
  db.run(
    `create table if not exists users (
      id integer not null,
      email text not null unique,
      createdAt text not null,
      updatedAt text,
      primary key(id)
    ) strict;`,
  );
  // Passswords table
  db.run(
    `create table if not exists passwords (
      hash text not null,
      userId integer not null,
      foreign key (userId) references users (id),
      primary key(hash)
    ) strict;`,
  );
  // Guesses table
  db.run(
    `create table if not exists guesses (
      id integer not null,
      number integer not null,
      gameId integer not null,
      foreign key (gameId) references games (id),
      primary key(id)
    ) strict;`,
  );
  // Games table
  db.run(
    `create table if not exists games (
      id integer not null,
      date text not null,
      state text,
      userId integer not null,
      foreign key (userId) references users (id),
      primary key(id)
    ) strict;`,
  );
  // Positions table
  db.run(
    `create table if not exists positions (
      position text unique,
      primary key(position)
    ) strict;`,
  );
  // Teams table
  db.run(
    `create table if not exists teams (
      team text not null unique,
      imgUrl text,
      primary key(team)
    ) strict;`,
  );
  // Players table
  db.run(
    `create table if not exists players (
      id integer not null,
      name text not null,
      imgUrl text not null,
      age integer not null,
      dob text not null,
      height integer not null,
      weight integer not null,
      fifaRating integer not null,
      fifaPotential integer not null,
      jerseyNumber integer not null,
      primary key(id)
    ) strict;`,
  );
  // PlayersOfTheDay table
  db.run(
    `create table if not exists playersOfTheDay (
      id integer not null,
      date text not null,
      playerId integer not null,
      foreign key (playerId) references players (id),
      primary key(id)
    ) strict;`,
  );
  // PlayersHaveTeams table (join table)
  db.run(
    `create table if not exists PlayersHaveTeams (
      playerId integer not null,
      team text not null,
      primary key(playerId, team)
    ) strict;`,
  );
  // PlayersHavePositions table (join table)
  db.run(
    `create table if not exists PlayersHavePositions (
      playerId integer not null,
      position text not null,
      primary key(playerId, position)
    ) strict;`,
  );
}
