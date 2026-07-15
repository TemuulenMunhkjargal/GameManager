export type CommonGame = { value: string; label: string; defaultCapacity: number };

export const commonGames: CommonGame[] = [
  { value: "catalog:magic", label: "Magic: The Gathering", defaultCapacity: 8 },
  { value: "catalog:pokemon", label: "Pokémon Trading Card Game", defaultCapacity: 8 },
  { value: "catalog:yugioh", label: "Yu-Gi-Oh!", defaultCapacity: 8 },
  { value: "catalog:lorcana", label: "Disney Lorcana", defaultCapacity: 8 },
  { value: "catalog:one-piece", label: "One Piece Card Game", defaultCapacity: 8 },
  { value: "catalog:flesh-and-blood", label: "Flesh and Blood", defaultCapacity: 8 },
  { value: "catalog:star-wars-unlimited", label: "Star Wars: Unlimited", defaultCapacity: 8 },
  { value: "catalog:warhammer-40k", label: "Warhammer 40,000", defaultCapacity: 4 },
  { value: "catalog:age-of-sigmar", label: "Warhammer Age of Sigmar", defaultCapacity: 4 },
  { value: "catalog:dnd", label: "Dungeons & Dragons", defaultCapacity: 6 },
  { value: "catalog:pathfinder", label: "Pathfinder", defaultCapacity: 6 },
  { value: "catalog:catan", label: "Catan", defaultCapacity: 4 },
  { value: "catalog:ticket-to-ride", label: "Ticket to Ride", defaultCapacity: 5 },
  { value: "catalog:carcassonne", label: "Carcassonne", defaultCapacity: 5 },
  { value: "catalog:gloomhaven", label: "Gloomhaven", defaultCapacity: 4 },
  { value: "catalog:marvel-champions", label: "Marvel Champions", defaultCapacity: 4 },
  { value: "catalog:arkham-horror-lcg", label: "Arkham Horror: The Card Game", defaultCapacity: 4 },
  { value: "catalog:dune-imperium", label: "Dune: Imperium", defaultCapacity: 4 },
  { value: "catalog:wingspan", label: "Wingspan", defaultCapacity: 5 },
  { value: "catalog:root", label: "Root", defaultCapacity: 6 },
];

export function resolveGameChoice(
  choice: string,
  customGame: string,
  savedSystems: { id: string; name: string; defaultCapacity: number }[],
) {
  const saved = savedSystems.find((system) => system.id === choice);
  if (saved) return { label: saved.name, gameSystemId: saved.id, defaultCapacity: saved.defaultCapacity };
  const catalog = commonGames.find((game) => game.value === choice);
  if (catalog) return { label: catalog.label, gameSystemId: null, defaultCapacity: catalog.defaultCapacity };
  return { label: customGame.trim(), gameSystemId: null, defaultCapacity: 8 };
}
