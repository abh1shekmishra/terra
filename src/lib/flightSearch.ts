import type { Flight } from "./flights";
import { airlineForCallsign } from "@/data/airlines";

/** IATA-style flight number from an ICAO callsign, e.g. "UAL123" -> "UA123". */
export function iataFlightNumber(cs: string): string | null {
  const airline = airlineForCallsign(cs);
  if (!airline?.iata) return null;
  const num = cs.trim().slice(3).replace(/^0+/, "");
  return num ? `${airline.iata}${num}` : null;
}

/** A friendly label for a flight: "United Airlines 123", else the callsign. */
export function flightLabel(cs: string): string {
  const airline = airlineForCallsign(cs);
  const num = cs.trim().slice(3).replace(/^0+/, "");
  return airline && num ? `${airline.name} ${num}` : cs;
}

/**
 * Does a flight match a search query? Matches the callsign, the IATA flight
 * number, or the airline (name substring, or exact IATA code like "LH").
 */
export function flightMatches(f: Flight, rawQuery: string): boolean {
  const name = rawQuery.trim().toUpperCase();
  if (!name) return true;
  const code = name.replace(/\s+/g, "");
  const cs = f.cs.toUpperCase().replace(/\s+/g, "");
  if (cs.includes(code)) return true;
  const iata = iataFlightNumber(f.cs);
  if (iata && iata.toUpperCase().includes(code)) return true;
  const airline = airlineForCallsign(f.cs);
  if (airline) {
    if (airline.name.toUpperCase().includes(name)) return true;
    if (airline.iata && airline.iata === code) return true;
  }
  return false;
}
