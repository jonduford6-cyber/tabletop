# Aquädukt UI interaction visual contract

Board targets are chosen on the board; the action panel carries prompts and choices that have no place on the board. The session (`AquaduktGameSession`) owns the staged selection and the target legality that both layers read.

## Visual intents

- **Roll spotlight.** Trigger: the game state holds a rolled region (after a die roll, until the house is placed or the turn ends). The rolled region's squares are lit and its border is drawn in gold; every other region is dimmed. It applies to every viewer, live or in History View, because it derives from game state. The action panel and waiting panel show the die and the region number.
- **House targets.** Trigger: the acting player has chosen the place-house action (automatic once a die has been rolled) and is viewing the live game. Free squares in the rolled region that accept the chosen tile are highlighted and clickable. Every other square stays inert. Before a tile value is chosen no square is clickable.
- **Spring targets.** Trigger: the acting player staged "Discover spring". Legal intersections show a bright marker and are clickable; illegal intersections show a faint dot.
- **Canal targets.** Trigger: the acting player staged "Build canals", or has placed a first canal this turn. Legal edges are highlighted bars; illegal edges are faint dashed lines.
- **Reason for a refusal.** Trigger: the player clicks a target that is not legal. The action panel shows why; nothing is committed. Hovering an illegal target shows the same reason as a tooltip.
- **Supplied water marker.** Trigger: always, for every square that a canal currently supplies. It does not depend on selection.

## Coexistence and precedence

- The roll spotlight coexists with house targets: targets are drawn above the dimmed and lit squares. The spotlight alone does not make anything clickable.
- Spring targets and canal targets cannot coexist, because the staged action is one value. Choosing the other action replaces the first.
- House targets and the other target kinds cannot coexist: a rolled die puts the game in a state that offers only placing a house or ending the turn.
- The reason for a refusal replaces any earlier reason and is the only message of its kind.
- The supplied water marker coexists with everything and sits below houses, canals and targets.

## Shared visual state

| Value             | Meaning                                                          | Producer / consumers            | Lifetime                                                                              | Validity                                                                       | History View                |
| ----------------- | ---------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------- |
| Staged action     | Which target kind the acting player chose at the start of a turn | Session; action panel and board | Cleared on every new game state, on Undo, and when the action is no longer offered    | Only while the machine is at the start of a turn and the action is still valid | Targets are not offered     |
| Staged tile value | The tile to place                                                | Session; action panel and board | Cleared with the staged action, on every new game state, and when that value runs out | Only while the player still has such a tile                                    | Not offered                 |
| Refusal reason    | Why the last clicked target was illegal                          | Session; action panel           | Cleared on every new game state, on Undo, and on choosing an action or tile           | Any new choice replaces it                                                     | Not shown                   |
| Rolled region     | Region the die pointed to                                        | Game state; board and panels    | Set by a roll, cleared when a house is placed or the turn ends                        | Always current                                                                 | Follows the displayed state |

Automatic choices are not staged: the place-house and place-canal actions are implied by the machine state, and a tile value is implied when only one value is left. Undo skips them and goes to the last manual stage, then to the last committed game action.

## Render ownership

- The board component owns the spotlight, the target layer, the supplied marker and their order in the SVG. It reads legality only from the session.
- The action panel owns prompts, the tile picker and the refusal message. It never computes legality.

## Verification scenarios

| Scenario                         | Check                                                                           | Verification                                 |
| -------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------- |
| Stage a spring, then Undo        | Spring targets appear; Undo removes them and undoes no action                   | Automated (`aquaduktGameSession.spec.ts`)    |
| Roll, pick a tile, place a house | Only the rolled region is lit; squares accept the tile only after one is chosen | Automated for legality; manual for rendering |
| Click an illegal canal edge      | The refusal appears, nothing is committed                                       | Automated                                    |
| Undo after a placed canal        | The canal is removed and the turn returns to its start                          | Automated                                    |
| Open History View during a roll  | The spotlight follows the displayed state and no targets are offered            | Manual                                       |
| Place a double canal             | The two bars are visibly different from a single canal                          | Manual                                       |
