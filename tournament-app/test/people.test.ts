import { describe, expect, test } from "bun:test";
import { checkRename, checkRole, checkSignIn, playersOf, type PBPerson, type StarterRef } from "../web/src/lib/people";

const starters: StarterRef[] = [
  { name: "Beanblader", player: "Sean" },
  { name: "Beyby", player: "Mike" },
  { name: "Torque Warden", player: "Torque Warden" }, // a starter with no player name
];

let clock = 0;
function person(name: string, extra: Partial<PBPerson> = {}): PBPerson {
  clock++;
  return { id: name.toLowerCase(), name, role: "player", starter: "", phone: true, created: `2027-03-01T10:00:${String(clock).padStart(2, "0")}Z`, ...extra };
}

describe("checkSignIn", () => {
  test("a player picks a starting fighter and goes on the list under the player name", () => {
    expect(checkSignIn({ role: "player", starter: "Beyby" }, [], starters, false)).toEqual({ name: "Mike", role: "player", starter: "Beyby" });
  });
  test("a starter with no player name signs in under the combat name", () => {
    expect(checkSignIn({ role: "player", starter: "Torque Warden" }, [], starters, false)).toEqual({
      name: "Torque Warden",
      role: "player",
      starter: "Torque Warden",
    });
  });
  test("a newcomer types a name", () => {
    expect(checkSignIn({ role: "player", name: "  New   Kid " }, [], starters, false)).toEqual({ name: "New Kid", role: "player", starter: "" });
  });
  test("a spectator types a name", () => {
    expect(checkSignIn({ role: "spectator", name: "Mam" }, [], starters, false)).toEqual({ name: "Mam", role: "spectator", starter: "" });
  });
  test("a typed name that belongs to a starter claims that starter", () => {
    expect(checkSignIn({ role: "player", name: "sean" }, [], starters, false)).toEqual({ name: "Sean", role: "player", starter: "Beanblader" });
    expect(checkSignIn({ role: "player", name: "beanblader" }, [], starters, false)).toEqual({ name: "Sean", role: "player", starter: "Beanblader" });
  });
  test("a spectator's typed name doesn't claim a starter", () => {
    expect(checkSignIn({ role: "spectator", name: "Sean" }, [], starters, false)).toEqual({ name: "Sean", role: "spectator", starter: "" });
  });
  test("a starter claimed twice is refused", () => {
    const people = [person("Mike", { starter: "Beyby" })];
    expect(checkSignIn({ role: "player", starter: "Beyby" }, people, starters, false)).toEqual({
      error: "Beyby is already signed in. If that's you, ask the organiser.",
    });
    expect(checkSignIn({ role: "player", name: "MIKE" }, people, starters, false)).toHaveProperty("error");
  });
  test("a starter renamed by the organiser is still claimed", () => {
    const people = [person("Michael", { starter: "Beyby" })];
    expect(checkSignIn({ role: "player", starter: "Beyby" }, people, starters, false)).toHaveProperty("error");
  });
  test("a name already taken is refused, ignoring case and spaces", () => {
    const people = [person("Spin Doctor", { role: "spectator" })];
    expect(checkSignIn({ role: "player", name: "spindoctor" }, people, starters, false)).toEqual({
      error: "Someone is already signed in as Spin Doctor. Try another name.",
    });
    expect(checkSignIn({ role: "spectator", name: "SPIN doctor" }, people, starters, false)).toHaveProperty("error");
  });
  test("a spectator can't take a player's name", () => {
    const people = [person("Sean", { starter: "Beanblader" })];
    expect(checkSignIn({ role: "spectator", name: "Sean" }, people, starters, false)).toHaveProperty("error");
  });
  test("names must be 2 to 16 letters", () => {
    expect(checkSignIn({ role: "spectator", name: "x" }, [], starters, false)).toEqual({ error: "Pick a name of 2 to 16 letters." });
    expect(checkSignIn({ role: "spectator", name: "a".repeat(17) }, [], starters, false)).toHaveProperty("error");
    expect(checkSignIn({ role: "spectator" }, [], starters, false)).toHaveProperty("error");
  });
  test("an unknown starter is refused", () => {
    expect(checkSignIn({ role: "player", starter: "Nobody" }, [], starters, false)).toEqual({ error: "That fighter isn't on the list." });
  });
  test("an unknown role is refused", () => {
    expect(checkSignIn({ role: "judge" as never, name: "Ref" }, [], starters, false)).toHaveProperty("error");
  });
  test("signing in as someone the organiser added claims them", () => {
    const added = person("Mike", { starter: "Beyby", phone: false });
    const walkIn = person("Walk In", { phone: false });
    const ok = { name: "Mike", role: "player", starter: "Beyby", claim: "mike" };
    expect(checkSignIn({ role: "player", starter: "Beyby" }, [added], starters, false)).toEqual(ok);
    expect(checkSignIn({ role: "player", name: "mike" }, [added], starters, false)).toEqual(ok);
    expect(checkSignIn({ role: "player", name: "walk in" }, [walkIn], starters, false)).toEqual({
      name: "Walk In",
      role: "player",
      starter: "",
      claim: "walk in",
    });
  });
  test("a claim keeps the role they were added as, even after the draw", () => {
    const added = person("Mike", { starter: "Beyby", phone: false });
    expect(checkSignIn({ role: "spectator", name: "Mike" }, [added], starters, true)).toEqual({
      name: "Mike",
      role: "player",
      starter: "Beyby",
      claim: "mike",
    });
  });
  test("someone already on a phone can't be claimed", () => {
    const signedIn = person("Mike", { starter: "Beyby", phone: true });
    expect(checkSignIn({ role: "player", starter: "Beyby" }, [signedIn], starters, false)).toHaveProperty("error");
    expect(checkSignIn({ role: "spectator", name: "Mike" }, [signedIn], starters, false)).toHaveProperty("error");
  });
  test("after the draw it's too late to play, but anyone can still watch", () => {
    expect(checkSignIn({ role: "player", starter: "Beyby" }, [], starters, true)).toHaveProperty("error");
    expect(checkSignIn({ role: "spectator", name: "Late One" }, [], starters, true)).toEqual({ name: "Late One", role: "spectator", starter: "" });
  });
});

describe("checkRole", () => {
  test("a player becomes a spectator and lets their starter go", () => {
    const me = person("Mike", { starter: "Beyby" });
    expect(checkRole(me, "spectator", [me], starters, false)).toEqual({ role: "spectator", starter: "" });
  });
  test("a spectator becomes a player, picking up their starter by name", () => {
    const me = person("Sean", { role: "spectator" });
    expect(checkRole(me, "player", [me], starters, false)).toEqual({ role: "player", starter: "Beanblader" });
  });
  test("a newcomer becomes a player with no starter", () => {
    const me = person("New Kid", { role: "spectator" });
    expect(checkRole(me, "player", [me], starters, false)).toEqual({ role: "player", starter: "" });
  });
  test("not if someone else already has that starter", () => {
    const me = person("Sean", { role: "spectator" });
    const other = person("Seanie", { starter: "Beanblader" });
    expect(checkRole(me, "player", [me, other], starters, false)).toHaveProperty("error");
  });
  test("nothing changes after the draw", () => {
    const me = person("Mike", { starter: "Beyby" });
    expect(checkRole(me, "spectator", [me], starters, true)).toHaveProperty("error");
  });
});

describe("checkRename", () => {
  const a = person("Alpha");
  const b = person("Bravo");
  test("a clean new name", () => {
    expect(checkRename(a, "  Alpha  One ", [a, b])).toEqual({ name: "Alpha One" });
  });
  test("changing only the case of your own name is fine", () => {
    expect(checkRename(a, "ALPHA", [a, b])).toEqual({ name: "ALPHA" });
  });
  test("someone else's name is refused", () => {
    expect(checkRename(a, "bravo", [a, b])).toEqual({ error: "Bravo is already on the list." });
  });
  test("too short", () => {
    expect(checkRename(a, "A", [a, b])).toHaveProperty("error");
  });
});

describe("playersOf", () => {
  test("only players, first signed in first", () => {
    const first = person("Zed");
    const watcher = person("Watcher", { role: "spectator" });
    const second = person("Amy");
    expect(playersOf([second, watcher, first]).map((p) => p.name)).toEqual(["Zed", "Amy"]);
  });
});
